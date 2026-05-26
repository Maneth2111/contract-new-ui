import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Contract } from './types/contract';
import { User } from './types/user';
import { Dashboard } from './components/Dashboard';
import { ContractList } from './components/ContractList';
import { NotificationCenter } from './components/NotificationCenter';
import { ReportDashboard } from './components/ReportDashboard';
import { UserManagement } from './components/UserManagement';
import Cookies from "js-cookie";
import { LayoutDashboard, FileText, Bell, BarChart3, User as UserIcon, Users, LogOut, Loader2, ServerCrash } from 'lucide-react';
import { getCurrentUser, UserProfile } from './services/userService';
import { titleCase } from "text-case";
import toast, { Toaster } from 'react-hot-toast';
import { ConfirmDialog } from './components/ConfirmationDialog';
import { useContracts } from './hook/useContracts';
import { ContractDetails } from './components/ContractDetails';
import { UserDetails } from './components/UserDetails';
import { useNotifications } from './hook/useNotification';
import api from './api/axios';
import { useTeamsSSO } from './hook/useTeamSSO';
import { EMPTY_CONTRACT_SEARCH_PARAMS } from './services/contractService';
import { setAuthToken } from './api/azure';
import { TeamsAccountNotFoundScreen } from './components/TeamsAccountNotFoundScreen';
import {
  type ApplyTokenResult,
  type ApplyTokenSource,
  getApiErrorMessage,
  getPermissionFlagsFromUser,
  isTeamsUserNotRegisteredError,
  userHasConfidentialContractAccess,
} from './utils/appProfileHelpers';
import { MicrosoftTeamsLoginScreen } from './components/MicrosoftTeamsLoginScreen';
import { setMsLoginHint, clearMsLoginHint } from './utils/msLoginHintStorage';
import { setSkipMsalSilentOnce } from './utils/msalPostLogoutGate';
import {
  buildContractDetailPath,
  parseContractDetailPath,
  type ContractDetailTab,
} from './utils/contractDetailRoute';


type Tab = 'dashboard' | 'contracts' | 'notifications' | 'reports' | 'users';

export default function App() {
  const [teamsAccountMissing, setTeamsAccountMissing] = useState<{
    email: string
    detail?: string
  } | null>(null)

  const [teamsProfileCheckPending, setTeamsProfileCheckPending] = useState(false)
  const [serverDown, setServerDown] = useState(false)

  const applyToken = useCallback(async (
    token: string,
    options?: { source?: ApplyTokenSource; identityEmail?: string }
  ): Promise<ApplyTokenResult> => {
    const cleanToken = token.trim()
    if (!cleanToken) {
      if (options?.source === 'password') {
        throw new Error('No token returned. Please try again.')
      }
      return { ok: false, reason: 'invalid' }
    }

    Cookies.set('token', cleanToken, { path: '/' })
    api.defaults.headers.common.Authorization = `Bearer ${cleanToken}`
    setAuthToken(cleanToken)
    console.log('=== applyToken Debug ===')
    console.log('Token set in cookie:', Cookies.get('token'))
    console.log('Token set in axios:', api.defaults.headers.common.Authorization)
    console.log('========================')

    try {
      const profile = await getCurrentUser()
      setCurrentUser(profile)
      setIsLoggedIn(true)
      setTeamsAccountMissing(null)
      if (profile.email?.trim()) {
        setMsLoginHint(profile.email)
      }
      return { ok: true }
    } catch (error: unknown) {
      Cookies.remove('token')
      delete api.defaults.headers.common.Authorization
      setAuthToken(null)
      setIsLoggedIn(false)
      setCurrentUser(null)

      const apiMsg = getApiErrorMessage(error)

      // when sever down
      const status = (error as any)?.response?.status
      const isNetworkError =
        (error as any)?.code === 'ERR_NETWORK' ||
        (error as any)?.message === 'Network Error' ||
        (status !== undefined && status >= 500)

      if (isNetworkError) {
        return { ok: false, reason: 'server_down', message: apiMsg }
      }

      const unregistered =
        options?.source === 'teams' &&
        isTeamsUserNotRegisteredError(error, true)

      if (unregistered) {
        return {
          ok: false,
          reason: 'unregistered',
          email: options?.identityEmail ?? '',
          message: apiMsg,
        }
      }

      if (options?.source === 'password') {
        throw new Error(
          apiMsg || 'Could not load your profile.'
        )
      }

      return { ok: false, reason: 'other' }
    }
  }, [])

  const [contractDetailsFormMode, setContractDetailsFormMode] = useState<'view' | 'edit' | 'renew'>('view');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userDetailsFormMode, setUserDetailsFormMode] = useState<'view' | 'edit'>('view');
  const [user, setCurrentUser] = useState<UserProfile | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [contractDetailsHideRenew, setContractDetailsHideRenew] = useState(false);
  const [contractDetailTab, setContractDetailTab] = useState<ContractDetailTab>('details');
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const savedTab = Cookies.get("activeTab");
    if (savedTab === 'register' || savedTab === 'contract-details') return 'contracts';
    return (savedTab as Tab) || "dashboard";
  });

  const closeUserDetails = useCallback(() => {
    setSelectedUserId(null);
    setUserDetailsFormMode('view');
  }, []);

  const openUserDetails = useCallback((
    userId: number,
    formMode: 'view' | 'edit' = 'view'
  ) => {
    setUserDetailsFormMode(formMode);
    setSelectedUserId(userId);
  }, []);

  const closeContractDetails = useCallback(() => {
    setSelectedContractId(null);
    setContractDetailsHideRenew(false);
    setContractDetailTab('details');
    setContractDetailsFormMode('view');
    if (parseContractDetailPath(window.location.pathname)) {
      window.history.pushState({}, '', '/');
    }
  }, []);

  const openContractDetails = useCallback((
    contractId: number,
    tab: ContractDetailTab = 'details',
    options?: { hideRenew?: boolean; formMode?: 'view' | 'edit' | 'renew' }
  ) => {
    if (options?.hideRenew === true) {
      setContractDetailsHideRenew(true);
    } else {
      setContractDetailsHideRenew(false);
    }
    setContractDetailsFormMode(options?.formMode ?? 'view');
    setSelectedContractId(contractId);
    setContractDetailTab(tab);
    window.history.pushState({}, '', buildContractDetailPath(contractId));
  }, []);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = Cookies.get("token");
    if (token) return true
    return false
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const { data: notificationData } = useNotifications(isLoggedIn);
  const { total, refetch: refetchTotal } = useContracts(EMPTY_CONTRACT_SEARCH_PARAMS, isLoggedIn);
  const permissions = getPermissionFlagsFromUser(user)
  const notificationCount = (notificationData?.summary.overdue ?? 0) +
    (notificationData?.summary.expire30 ?? 0) +
    (notificationData?.summary.expire60 ?? 0) +
    (notificationData?.summary.expire90 ?? 0);
  // Token from MS team 
  const {
    token: teamsToken,
    user: teamsUser,
    isTeamsApp,
    isTokenReady,
    isLoading: teamsLoading,
    error: teamsError,
  } = useTeamsSSO();

  useLayoutEffect(() => {
    if (!isTeamsApp || isLoggedIn || teamsAccountMissing) return
    if (teamsLoading) return
    if (isTokenReady && teamsToken) {
      setTeamsProfileCheckPending(true)
    }
  }, [
    isTeamsApp,
    isLoggedIn,
    teamsAccountMissing,
    teamsLoading,
    isTokenReady,
    teamsToken,
  ])

  // Token from MS Teams -> apply automatically 
  useEffect(() => {
    if (teamsLoading) return;

    console.log('=== Teams SSO Debug ===');
    console.log('Is Teams App    :', isTeamsApp);
    console.log('Is Token Ready  :', isTokenReady);
    console.log('Token           :', teamsToken);
    console.log('User Email      :', teamsUser?.email);
    console.log('User Name       :', teamsUser?.name);
    console.log('User Object ID  :', teamsUser?.objectId);
    console.log('User Tenant ID  :', teamsUser?.tenantId);
    console.log('Error           :', teamsError);
    console.log('======================');
    if (isTokenReady && teamsToken) {
      void applyToken(teamsToken, {
        source: 'teams',
        identityEmail: teamsUser?.email ?? '',
      })
        .then((res) => {
          if (!res.ok && res.reason === 'unregistered') {
            setTeamsAccountMissing({
              email: res.email,
              detail: res.message,
            })
          }
          if (!res.ok && res.reason === 'server_down') {
            setServerDown(true)
          }
        })
        .finally(() => {
          setTeamsProfileCheckPending(false)
        })
    } else {
      setTeamsProfileCheckPending(false)
      setAuthToken(null)
    }

  }, [
    teamsLoading,
    isTeamsApp,
    isTokenReady,
    teamsToken,
    teamsUser,
    teamsError,
    applyToken,
  ]);

  useEffect(() => {
    if (!isTeamsApp) {
      setTeamsAccountMissing(null)
      setTeamsProfileCheckPending(false)
    }
  }, [isTeamsApp])

  useEffect(() => {
    Cookies.set("activeTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!isLoggedIn) return
    if (activeTab !== 'contracts') return
    void refetchTotal()
  }, [activeTab, isLoggedIn, refetchTotal])

  useEffect(() => {
    if (!isLoggedIn) return
    const parsed = parseContractDetailPath(window.location.pathname)
    if (!parsed) return
    setSelectedContractId(parsed.contractId);
    setContractDetailTab(parsed.tab);
    setContractDetailsHideRenew(false);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return
    const onPopState = () => {
      const parsed = parseContractDetailPath(window.location.pathname)
      if (parsed) {
        setSelectedContractId(parsed.contractId);
        setContractDetailTab(parsed.tab);
        setContractDetailsHideRenew(false);
        return
      }
      setSelectedContractId(null);
      setContractDetailsHideRenew(false);
      setContractDetailTab('details');
      setContractDetailsFormMode('view');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isLoggedIn]);

  // Hydrate profile from cookie
  useEffect(() => {
    const loadUser = async () => {
      const token = Cookies.get("token");

      if (token) {
        try {
          const user = await getCurrentUser();
          setCurrentUser(user);
          setIsLoggedIn(true);
        } catch (error) {
          console.error('Failed to hydrate profile from token', error)
          Cookies.remove("token");
          setIsLoggedIn(false);
        }
      }
    };

    loadUser();
  }, []);

  // Clear Cookie when logout
  const handleLogout = () => {
    setShowLogoutConfirm(false);
    setIsLoggedIn(false);
    setCurrentUser(null);
    setTeamsAccountMissing(null);
    setTeamsProfileCheckPending(false);
    setActiveTab('dashboard');
    setSelectedContractId(null);
    setContractDetailsHideRenew(false);
    setContractDetailTab('details');
    if (parseContractDetailPath(window.location.pathname)) {
      window.history.replaceState({}, '', '/');
    }
    Cookies.remove('token');
    Cookies.remove('activeTab');
    setAuthToken(null);
    clearMsLoginHint();
    setSkipMsalSilentOnce();
  };

  const contractRefetchRef = useRef<() => void>(() => { });
  const userRefetchRef = useRef<() => void>(() => { });

  // Update User
  const handleUpdateUser = (updatedUser: User) => {
    toast.success(`User ${updatedUser.fullName} has been updated successfully!`);
  };

  const handleTeamsBrowserLogin = async (token: string, email: string) => {
    setIsLoggingIn(true)
    const res = await applyToken(token, { source: 'teams', identityEmail: email })
    if (!res.ok && res.reason === 'unregistered') {
      setTeamsAccountMissing({
        email: res.email,
        detail: res.message,
      })
    }
    setIsLoggingIn(false)
  }

  // Show account not found
  if (!isLoggedIn) {
    if (serverDown) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center px-6 py-12 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="absolute w-72 h-72 rounded-full bg-red-50/80 -translate-y-24" />
            <div className="absolute w-40 h-40 rounded-full bg-orange-100/60 translate-x-32 translate-y-20" />
            <div className="absolute w-3 h-3 rounded-full bg-red-200/90 -translate-x-40 -translate-y-32" />
            <div className="absolute w-2 h-2 rounded-full bg-red-300/80 translate-x-48 -translate-y-8" />
          </div>

          <div className="relative w-full max-w-md text-center">
            <div className="mx-auto mb-8 flex h-36 w-36 items-center justify-center rounded-full bg-linear-to-br from-red-100 to-orange-100 ring-1 ring-red-200/60">
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-sm">
                <ServerCrash className="h-14 w-14 text-red-500" strokeWidth={1.25} aria-hidden />
              </div>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
              Something went wrong
            </h1>

            <p className="mt-4 text-slate-600 text-[15px] leading-relaxed">
              The server is temporarily unavailable, possibly due to a deployment
              in progress. Please wait a moment and try again.
            </p>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setServerDown(false)
                  window.location.reload()
                }}
                className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
              >
                Try Again
              </button>
            </div>

            <p className="mt-10 text-sm text-slate-400">
              If this keeps happening, please contact your administrator.
            </p>
          </div>
        </div>
      )
    }
    if (teamsAccountMissing) {
      return (
        <TeamsAccountNotFoundScreen
          email={teamsAccountMissing.email || undefined}
          detailMessage={teamsAccountMissing.detail}
          onRetry={() => {
            setTeamsAccountMissing(null)
            window.location.reload()
          }}
        />
      )
    }
    if (isLoggingIn) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 gap-3">
          <Loader2 className="h-9 w-9 text-primary animate-spin" aria-hidden />
        </div>
      )
    }
    if (isTeamsApp && (teamsLoading || teamsProfileCheckPending)) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 gap-3">
          <Loader2 className="h-9 w-9 text-primary animate-spin" aria-hidden />
        </div>
      )
    }
    return (
      <MicrosoftTeamsLoginScreen
        onTeamsLogin={handleTeamsBrowserLogin}
      />
      
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      {/* Header with tab navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-350 mx-auto px-8 lg:px-10">
          <div className="flex items-stretch justify-between gap-6 min-h-16">
            <nav className="flex flex-1 min-w-0 gap-2 overflow-x-auto" aria-label="Main navigation">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`flex shrink-0 items-center gap-2.5 px-6 py-4 border-b-2 text-base font-medium transition-colors cursor-pointer ${activeTab === 'dashboard'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('contracts')}
                className={`flex shrink-0 items-center gap-2.5 px-6 py-4 border-b-2 text-base font-medium transition-colors cursor-pointer ${activeTab === 'contracts'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                <FileText className="w-5 h-5" />
                Contract Management{total > 0 ? ` (${total})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notifications')}
                className={`relative flex shrink-0 items-center gap-2.5 px-6 py-4 border-b-2 text-base font-medium transition-colors cursor-pointer ${activeTab === 'notifications'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                <Bell className="w-5 h-5" />
                Notifications
                {notificationCount > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className={`flex shrink-0 items-center gap-2.5 px-6 py-4 border-b-2 text-base font-medium transition-colors cursor-pointer ${activeTab === 'reports'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                <BarChart3 className="w-5 h-5" />
                Reports
              </button>
              {permissions.userRead && (
                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  className={`flex shrink-0 items-center gap-2.5 px-6 py-4 border-b-2 text-base font-medium transition-colors cursor-pointer ${activeTab === 'users'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <Users className="w-5 h-5" />
                  User Management
                </button>
              )}
            </nav>
            <div className="flex shrink-0 items-center gap-5 py-2 pl-6">
              <button
                type="button"
                disabled={!user?.id}
                onClick={() => {
                  if (!user?.id) return
                  if (selectedContractId !== null) closeContractDetails()
                  openUserDetails(user.id, 'view')
                }}
                className="text-right hidden sm:block rounded-lg px-2 py-1 -mr-2 hover:bg-gray-100 transition-colors cursor-pointer disabled:cursor-default disabled:hover:bg-transparent"
                aria-label="View my profile"
                title="View my profile"
              >
                <div className="flex items-center justify-end gap-2.5">
                  <UserIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-base text-gray-900">{user?.fullName ?? 'N/A'}</span>
                </div>
                <p className="text-sm text-gray-600">
                  {(() => {
                    const roleName = user?.roles?.[0]?.name ?? ''
                    return roleName.includes('ROLE_')
                      ? titleCase(roleName.split('ROLE_')[1])
                      : roleName
                  })()}
                </p>
              </button>
              {!isTeamsApp && (
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-350 mx-auto px-8 lg:px-10 py-8">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'contracts' && (
          <ContractList
            onRefetchReady={(fn) => { contractRefetchRef.current = fn; }}
            onTotalsRefresh={() => { void refetchTotal() }}
            isLoggedIn={isLoggedIn}
            currentUser={user}
            userConfidentialAccess={userHasConfidentialContractAccess(user)}
            contractPermission={{
              create: Boolean(permissions.contractCreate),
              edit: Boolean(permissions.contractUpdate),
              delete: Boolean(permissions.contractDelete),
              viewDocuments: Boolean(permissions.contractRead),
            }}
            onSelectContract={(contract, formMode = 'view') => {
              openContractDetails(contract.contractId, 'details', { formMode });
            }}
          />
        )}
        {activeTab === 'notifications' && (
          <NotificationCenter
            isLoggedIn={isLoggedIn}
            onSelectContract={(id) => {
              openContractDetails(id, 'details', { hideRenew: true });
            }}
          />
        )}
        {activeTab === 'reports' && <ReportDashboard currentUser={user} />}
        {permissions.userRead && activeTab === 'users' && (
          <UserManagement
            currentUser={user}
            userPermission={{
              view: Boolean(permissions.userRead),
              create: Boolean(permissions.userCreate),
              update: Boolean(permissions.userUpdate),
              inactive: Boolean(permissions.userDelete)
            }}
            onRefetchReady={(fn) => { userRefetchRef.current = fn; }}
            onSelectUser={(selectedUser, formMode = 'view') => {
              openUserDetails(Number(selectedUser.id), formMode);
            }}
          />
        )}
      </main>

      {selectedUserId !== null && (
        <UserDetails
          key={selectedUserId}
          userId={selectedUserId}
          initialFormMode={userDetailsFormMode}
          currentUser={user}
          canEdit={Boolean(permissions.userUpdate)}
          onClose={closeUserDetails}
          onUpdateUser={handleUpdateUser}
          onUpdate={() => {
            userRefetchRef.current();
          }}
        />
      )}

      {selectedContractId !== null && (
        <ContractDetails
          key={selectedContractId}
          variant="fullscreen"
          contract={{ contractId: selectedContractId } as Contract}
          initialTab={contractDetailTab}
          onUrlTabChange={(tab) => {
            setContractDetailTab(tab);
            window.history.replaceState(
              {},
              '',
              buildContractDetailPath(selectedContractId),
            );
          }}
          hideRenewContract={contractDetailsHideRenew}
          canRenew={Boolean(permissions.contractUpdate)}
          canEdit={Boolean(permissions.contractUpdate)}
          initialFormMode={contractDetailsFormMode}
          currentUser={user}
          onClose={closeContractDetails}
          onUpdate={() => {
            void refetchTotal();
            contractRefetchRef.current();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to logout?"
        icon={<LogOut className="w-5 h-5 text-red-600" />}
        confirmIcon={<LogOut className="w-4 h-4" />}
        confirmLabel="Logout"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-350 mx-auto px-8 lg:px-10 py-6">
          <div className="flex items-center justify-between text-gray-600">
            <p>© 2026 Contract Management System. All rights reserved.</p>
            <p>Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}