import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Contract } from './types/contract';
import { User } from './types/user';

import { ContractList } from './components/ContractList';
import { NotificationCenter } from './components/NotificationCenter';
import { ReportDashboard } from './components/ReportDashboard';
import { UserManagement } from './components/UserManagement';
import {
  LayoutDashboard,
  FileText,
  Bell,
  BarChart3,
  User as UserIcon,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Edit2,
  RefreshCw,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { ConfirmDialog } from './components/ConfirmationDialog';
import { ContractDetails } from './components/ContractDetails';
import { UserDetails } from './components/UserDetails';
import {
  type ContractDetailTab,
  buildContractDetailPath,
  parseContractDetailPath,
} from './utils/contractDetailRoute';
import { getPermissionFlagsFromUser, userHasConfidentialContractAccess } from './utils/appProfileHelpers';
import { titleCase } from 'text-case';

const Dashboard = React.lazy(() => import('./components/Dashboard'));

// ─── Mock data ────────────────────────────────────────────────────────────────
import {
  mockUsers,
  mockContracts,
  type Permission,
} from './data/mockData';

export interface UserProfile {
  id: number;
  employeeId: string | null;
  fullName: string;
  email: string;
  jobTitle: string | null;
  phoneNumber: string | null;
  status: string | null;
  department: string | null;
  confidentialAccess?: boolean;
  moduleAccess: { id: number; name: string }[];
  permissions: Record<string, { id: number; name: string }[]>;
  roles: { id: number; name: string }[];
}

const MOCK_USER_ID = 1;
const rawMockUser = mockUsers.find((u) => u.userId === MOCK_USER_ID) ?? mockUsers[0];

const MOCK_PROFILE: UserProfile = {
  id: rawMockUser.userId,
  fullName: rawMockUser.fullName,
  employeeId: rawMockUser.employeeId,
  email: rawMockUser.email,
  phoneNumber: rawMockUser.phoneNumber,
  jobTitle: rawMockUser.jobTitle,
  status: rawMockUser.status,
  moduleAccess: rawMockUser.moduleAccess,
  department: rawMockUser.department,
  roles: rawMockUser.roles,
  permissions: rawMockUser.permissions as Permission[],
};

// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'contracts' | 'notifications' | 'reports' | 'users';

// Ref passed down to ContractDetails so App can trigger edit/renew from the top bar
export interface ContractDetailActions {
  enterEditMode: () => void;
  enterRenewMode: () => void;
  exitFormMode: () => void;
  canEdit: boolean;
  canShowRenew: boolean;
}

// Ref passed down to UserDetails (page variant) so App can trigger edit from the top bar
export interface UserDetailActions {
  enterEditMode: () => void;
  exitFormMode: () => void;
  canEdit: boolean;
}

export default function App() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Contract detail state
  const [contractDetailsFormMode, setContractDetailsFormMode] = useState<'view' | 'edit' | 'renew'>('view');
  const [activeContractFormMode, setActiveContractFormMode] = useState<'view' | 'edit' | 'renew'>('view');
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [contractDetailsHideRenew, setContractDetailsHideRenew] = useState(false);
  const [contractDetailTab, setContractDetailTab] = useState<ContractDetailTab>('details');
  const [selectedContractTitle, setSelectedContractTitle] = useState<string>('');
  const [contractCanEdit, setContractCanEdit] = useState(false);
  const [contractCanShowRenew, setContractCanShowRenew] = useState(false);

  // User detail state (page-level, like contract)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userDetailsFormMode, setUserDetailsFormMode] = useState<'view' | 'edit'>('view');
  const [activeUserFormMode, setActiveUserFormMode] = useState<'view' | 'edit'>('view');
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [userCanEdit, setUserCanEdit] = useState(false);
  // 'list' = opened from User Management table; 'profile' = opened from My Profile sidebar link
  const [userDetailsSource, setUserDetailsSource] = useState<'list' | 'profile'>('list');

  const [user, setCurrentUser] = useState<UserProfile | null>(MOCK_PROFILE);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const [total, setTotal] = useState(mockContracts.length);
  const refetchTotal = useCallback(() => {
    setTotal(mockContracts.length);
  }, []);

  const MOCK_CONTRACTS_TOTAL = 8;
  const [unreadCount, setUnreadCount] = useState(MOCK_CONTRACTS_TOTAL);

  // Refs for action callbacks
  const contractDetailActionsRef = useRef<ContractDetailActions>({
    enterEditMode: () => { },
    enterRenewMode: () => { },
    exitFormMode: () => { },
    canEdit: false,
    canShowRenew: false,
  });

  const userDetailActionsRef = useRef<UserDetailActions>({
    enterEditMode: () => { },
    exitFormMode: () => { },
    canEdit: false,
  });

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const closeUserDetails = useCallback(() => {
    setSelectedUserId(null);
    setUserDetailsFormMode('view');
    setActiveUserFormMode('view');
    setSelectedUserName('');
    setUserCanEdit(false);
    setUserDetailsSource('list');
  }, []);

  const openUserDetails = useCallback((
    userId: number,
    formMode: 'view' | 'edit' = 'view',
    name?: string,
    source: 'list' | 'profile' = 'list',
  ) => {
    setUserDetailsFormMode(formMode);
    setActiveUserFormMode(formMode);
    setSelectedUserId(userId);
    setSelectedUserName(name ?? '');
    setUserDetailsSource(source);
    setActiveTab('users');
  }, []);

  const closeContractDetails = useCallback(() => {
    setSelectedContractId(null);
    setContractDetailsHideRenew(false);
    setContractDetailTab('details');
    setContractDetailsFormMode('view');
    setActiveContractFormMode('view');
    setSelectedContractTitle('');
    setContractCanEdit(false);
    setContractCanShowRenew(false);
    if (parseContractDetailPath(window.location.pathname)) {
      window.history.pushState({}, '', '/');
    }
  }, []);

  const openContractDetails = useCallback((
    contractId: number,
    tab: ContractDetailTab = 'details',
    options?: { hideRenew?: boolean; formMode?: 'view' | 'edit' | 'renew'; title?: string },
  ) => {
    setContractDetailsHideRenew(options?.hideRenew === true);
    setContractDetailsFormMode(options?.formMode ?? 'view');
    setActiveContractFormMode(options?.formMode ?? 'view');
    setSelectedContractId(contractId);
    setContractDetailTab(tab);
    setSelectedContractTitle(options?.title ?? '');
    window.history.pushState({}, '', buildContractDetailPath(contractId));
  }, []);

  // ── URL / popstate sync ───────────────────────────────────────────────────
  useEffect(() => {
    const parsed = parseContractDetailPath(window.location.pathname);
    if (!parsed) return;
    setSelectedContractId(parsed.contractId);
    setContractDetailTab(parsed.tab);
    setContractDetailsHideRenew(false);
    setActiveTab('contracts');
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const parsed = parseContractDetailPath(window.location.pathname);
      if (parsed) {
        setSelectedContractId(parsed.contractId);
        setContractDetailTab(parsed.tab);
        setContractDetailsHideRenew(false);
        return;
      }
      setSelectedContractId(null);
      setContractDetailsHideRenew(false);
      setContractDetailTab('details');
      setContractDetailsFormMode('view');
      setActiveContractFormMode('view');
      setSelectedContractTitle('');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // ── Permissions ───────────────────────────────────────────────────────────
  const permissions = getPermissionFlagsFromUser(user);

  // ── Refs shared with child components ─────────────────────────────────────
  const contractRefetchRef = useRef<() => void>(() => { });
  const userRefetchRef = useRef<() => void>(() => { });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUpdateUser = (updatedUser: User) => {
    toast.success(`User ${updatedUser.fullName} has been updated successfully!`);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    setCurrentUser(null);
    setActiveTab('dashboard');
    setSelectedContractId(null);
    setSelectedUserId(null);
    setContractDetailsHideRenew(false);
    setContractDetailTab('details');
    setActiveContractFormMode('view');
    setSelectedContractTitle('');
    if (parseContractDetailPath(window.location.pathname)) {
      window.history.replaceState({}, '', '/');
    }
    setTimeout(() => setCurrentUser(MOCK_PROFILE), 500);
  };

  // ── Sidebar nav helper ────────────────────────────────────────────────────
  const navTo = (tab: Tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    if (tab !== 'users') {
      closeUserDetails();
    } else {
      // Direct sidebar click on User Management always resets to list context
      setUserDetailsSource('list');
      setSelectedUserId(null);
    }
    if (tab !== 'contracts') {
      closeContractDetails();
    }
  };

  // ── Breadcrumb segments for the contracts tab ─────────────────────────────
  const contractBreadcrumbs = (() => {
    if (activeTab !== 'contracts') return null;

    const base = (
      <button
        type="button"
        onClick={selectedContractId !== null ? closeContractDetails : undefined}
        className={`transition-colors text-brand-navy text-lg font-semibold leading-tight ${selectedContractId !== null
            ? 'text-primary hover:text-primary/80 cursor-pointer'
            : 'text-[#1A2B4A] cursor-default'
          }`}
      >
        Contract Management
      </button>
    );

    if (selectedContractId === null) return <div className="flex items-center">{base}</div>;

    const details = (
      <button
        type="button"
        onClick={activeContractFormMode !== 'view' ? () => contractDetailActionsRef.current.exitFormMode() : undefined}
        className={`text-sm font-medium transition-colors ${activeContractFormMode !== 'view'
            ? 'text-primary hover:text-primary/80 cursor-pointer'
            : 'text-[#1A2B4A] cursor-default'
          }`}
      >
        {selectedContractTitle || 'Contract Details'}
      </button>
    );

    const modeLabel =
      activeContractFormMode === 'edit'
        ? 'Edit'
        : activeContractFormMode === 'renew'
          ? 'Renew'
          : null;

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {base}
        <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        {details}
        {modeLabel && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-sm font-medium text-[#1A2B4A]">{modeLabel}</span>
          </>
        )}
      </div>
    );
  })();

  // ── Breadcrumb segments for the users tab ────────────────────────────────
  const userBreadcrumbs = (() => {
    if (activeTab !== 'users') return null;

    const isProfile = userDetailsSource === 'profile';

    // Root label: "User Management" when from list, "My Profile" when from profile link
    const rootLabel = isProfile ? 'My Profile' : 'User Management';
    // Clicking root when a user is selected: go back to list (list source) or just close (profile source)
    const handleRootClick = selectedUserId !== null
      ? isProfile ? closeUserDetails : closeUserDetails
      : undefined;

    const base = (
      <button
        type="button"
        onClick={handleRootClick}
        className={`transition-colors text-brand-navy text-lg font-semibold leading-tight ${selectedUserId !== null
            ? 'text-primary hover:text-primary/80 cursor-pointer'
            : 'text-[#1A2B4A] cursor-default'
          }`}
      >
        {rootLabel}
      </button>
    );

    // When source is 'profile' and no user selected yet, just show "My Profile" with no chevron
    if (selectedUserId === null) return <div className="flex items-center">{base}</div>;

    const details = (
      <button
        type="button"
        onClick={activeUserFormMode !== 'view' ? () => userDetailActionsRef.current.exitFormMode() : undefined}
        className={`text-sm font-medium transition-colors ${activeUserFormMode !== 'view'
            ? 'text-primary hover:text-primary/80 cursor-pointer'
            : 'text-[#1A2B4A] cursor-default'
          }`}
      >
        {selectedUserName || 'User Details'}
      </button>
    );

    const modeLabel = activeUserFormMode === 'edit' ? 'Edit' : null;

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {base}
        <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        {details}
        {modeLabel && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-sm font-medium text-[#1A2B4A]">{modeLabel}</span>
          </>
        )}
      </div>
    );
  })();

  // ── Top-bar action buttons for contract detail ────────────────────────────
  const contractTopBarActions = (() => {
    if (activeTab !== 'contracts' || selectedContractId === null) return null;
    const actions = contractDetailActionsRef.current;

    if (activeContractFormMode !== 'view') {
      return (
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => actions.exitFormMode()}
            className="px-3 py-1.5 text-sm text-primary rounded-lg bg-white border border-primary hover:bg-primary/10 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={`contract-details-form-${selectedContractId}-${activeContractFormMode}`}
            className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer text-sm"
          >
            {activeContractFormMode === 'renew' ? 'Renew Contract' : 'Save Changes'}
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 shrink-0">
        {contractCanEdit && (
          <button
            type="button"
            onClick={() => actions.enterEditMode()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer text-sm font-medium"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
        {contractCanShowRenew && (
          <button
            type="button"
            onClick={() => actions.enterRenewMode()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-pink text-white rounded-lg hover:bg-brand-pink/80 cursor-pointer text-sm font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Renew
          </button>
        )}
      </div>
    );
  })();

  // ── Top-bar action buttons for user detail ────────────────────────────────
  const userTopBarActions = (() => {
    if (activeTab !== 'users' || selectedUserId === null) return null;
    const actions = userDetailActionsRef.current;

    if (activeUserFormMode === 'edit') {
      return (
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => actions.exitFormMode()}
            className="px-3 py-1.5 text-sm text-primary rounded-lg bg-white border border-primary hover:bg-primary/10 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={`user-details-form-${selectedUserId}`}
            className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer text-sm"
          >
            Save Changes
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 shrink-0">
        {userCanEdit && (
          <button
            type="button"
            onClick={() => actions.enterEditMode()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer text-sm font-medium"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </div>
    );
  })();

  // ── Determine active breadcrumb / actions for top bar ─────────────────────
  const activeBreadcrumb =
    activeTab === 'contracts' && contractBreadcrumbs
      ? contractBreadcrumbs
      : activeTab === 'users' && userBreadcrumbs
        ? userBreadcrumbs
        : null;

  const activeTopBarActions =
    activeTab === 'contracts'
      ? contractTopBarActions
      : activeTab === 'users'
        ? userTopBarActions
        : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#f0fafb] overflow-hidden">
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-60 flex flex-col bg-white border-r border-primary/20 shadow-sm shadow-primary/10
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:z-auto lg:shrink-0
      `}>

        {/* Logo / Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-primary/15">
          <img src="/color.png" alt="Chokchey Finance" className="w-9 h-9 object-contain shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[#1A2B4A] font-semibold text-sm leading-tight truncate">Contract Management</p>
            <p className="text-primary text-xs leading-tight truncate">CHOKCHEY Finance Plc.</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          <p className="text-[10px] font-semibold text-[#5b7a85] uppercase tracking-widest px-3 pt-2 pb-1">Main Menu</p>

          <button
            onClick={() => navTo('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${activeTab === 'dashboard'
              ? 'bg-primary text-white shadow-sm shadow-primary/30'
              : 'text-[#1A2B4A] hover:bg-[#e0f7fa] hover:text-primary'
              }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => navTo('contracts')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${activeTab === 'contracts'
              ? 'bg-primary text-white shadow-sm shadow-primary/30'
              : 'text-[#1A2B4A] hover:bg-[#e0f7fa] hover:text-primary'
              }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Contract Management</span>
          </button>

          <button
            onClick={() => navTo('notifications')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer relative ${activeTab === 'notifications'
              ? 'bg-primary text-white shadow-sm shadow-primary/30'
              : 'text-[#1A2B4A] hover:bg-[#e0f7fa] hover:text-primary'
              }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-4.5 h-4.5 flex items-center justify-center px-1 shrink-0">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => navTo('reports')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${activeTab === 'reports'
              ? 'bg-primary text-white shadow-sm shadow-primary/30'
              : 'text-[#1A2B4A] hover:bg-[#e0f7fa] hover:text-primary'
              }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>Reports</span>
          </button>
          <button
            type="button"
            disabled={!user?.id}
            onClick={() => {
              if (!user?.id) return;
              openUserDetails(user.id, 'view', user.fullName, 'profile');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default ${activeTab === 'users' && userDetailsSource === 'profile'
                ? 'bg-primary text-white shadow-sm shadow-primary/30'
                : 'text-[#1A2B4A] hover:bg-[#e0f7fa] hover:text-primary'
              }`}
          >
            <UserIcon className="w-4 h-4 shrink-0" />
            <span>My Profile</span>
          </button>

          {permissions.userRead && (
            <>
              <p className="text-[10px] font-semibold text-[#5b7a85] uppercase tracking-widest px-3 pt-4 pb-1">Administration</p>
              <button
                onClick={() => navTo('users')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${activeTab === 'users' && userDetailsSource !== 'profile'
                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                    : 'text-[#1A2B4A] hover:bg-[#e0f7fa] hover:text-primary'
                  }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>User Management</span>
              </button>
            </>
          )}

          {!permissions.userRead && (
            <p className="text-[10px] font-semibold text-[#5b7a85] uppercase tracking-widest px-3 pt-4 pb-1">Administration</p>
          )}

        </nav>

        {/* User info + logout at bottom */}
        <div className="border-t border-primary/15 p-4 space-y-3">
          <div className="flex items-center gap-3 px-1 py-1">
            <div className="w-8 h-8 rounded-full bg-[#e0f7fa] border border-primary/30 flex items-center justify-center shrink-0">
              <UserIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#1A2B4A] truncate leading-tight">
                {user?.fullName ?? 'N/A'}
              </p>
              <p className="text-xs text-[#5b7a85] truncate leading-tight">
                {(() => {
                  const roleName = user?.roles?.[0]?.name ?? '';
                  return roleName.includes('ROLE_')
                    ? titleCase(roleName.split('ROLE_')[1])
                    : roleName;
                })()}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-[#5b7a85] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-primary/15 hover:border-red-200"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>

          <p className="text-sm text-center text-[#5b7a85]/60">© 2026 CHOKCHEY Finance</p>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="shrink-0 bg-white border-b border-primary/20 px-4 sm:px-8 py-6.5 flex items-center gap-4">
          {/* Hamburger — mobile/tablet only */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-[#1A2B4A] hover:bg-[#e0f7fa] hover:text-primary transition-colors cursor-pointer shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Title / breadcrumb area */}
          <div className="flex-1 min-w-0">
            {activeBreadcrumb ? (
              activeBreadcrumb
            ) : (
              <>
                <h1 className="text-brand-navy text-lg font-semibold leading-tight truncate">
                  {activeTab === 'dashboard' && 'Dashboard'}
                  {activeTab === 'contracts' && 'Contract Management'}
                  {activeTab === 'notifications' && 'Notifications'}
                  {activeTab === 'reports' && 'Reports'}
                  {activeTab === 'users' && (userDetailsSource === 'profile' ? 'My Profile' : 'User Management')}
                </h1>
                {/* <p className="text-gray-600 text-sm mt-0.5 truncate">
                  {activeTab === 'dashboard' && 'Overview of all contract activity'}
                  {activeTab === 'contracts' && 'Manage and track all your contracts'}
                  {activeTab === 'notifications' && 'Alerts for expiring and overdue contracts'}
                  {activeTab === 'reports' && 'Analytics and export reports'}
                  {activeTab === 'users' && (userDetailsSource === 'profile' ? 'View and edit your profile' : 'Manage system users and roles')}
                </p> */}
              </>
            )}
          </div>

          {/* Action buttons */}
          {activeTopBarActions}
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          {activeTab === 'dashboard' && <Dashboard />}

          {activeTab === 'contracts' && (
            <div>
              {selectedContractId !== null ? (
                <ContractDetails
                  key={selectedContractId}
                  variant="page"
                  contract={{ contractId: selectedContractId } as Contract}
                  initialTab={contractDetailTab}
                  onUrlTabChange={(tab) => {
                    setContractDetailTab(tab);
                    window.history.replaceState({}, '', buildContractDetailPath(selectedContractId));
                  }}
                  hideRenewContract={contractDetailsHideRenew}
                  canRenew={Boolean(permissions.contractUpdate)}
                  canEdit={Boolean(permissions.contractUpdate)}
                  initialFormMode={contractDetailsFormMode}
                  currentUser={user}
                  onClose={closeContractDetails}
                  onUpdate={() => {
                    refetchTotal();
                    contractRefetchRef.current();
                  }}
                  onFormModeChange={(mode, title) => {
                    setActiveContractFormMode(mode);
                    if (title) setSelectedContractTitle(title);
                  }}
                  onActionsReady={(canEdit, canShowRenew) => {
                    setContractCanEdit(canEdit);
                    setContractCanShowRenew(canShowRenew);
                  }}
                  actionsRef={contractDetailActionsRef}
                />
              ) : (
                <ContractList
                  onRefetchReady={(fn) => { contractRefetchRef.current = fn; }}
                  onTotalsRefresh={() => { refetchTotal(); }}
                  isLoggedIn={true}
                  currentUser={user}
                  userConfidentialAccess={userHasConfidentialContractAccess(user)}
                  contractPermission={{
                    create: Boolean(permissions.contractCreate),
                    edit: Boolean(permissions.contractUpdate),
                    delete: Boolean(permissions.contractDelete),
                    viewDocuments: Boolean(permissions.contractRead),
                  }}
                  onSelectContract={(contract, formMode = 'view') => {
                    openContractDetails(contract.contractId, 'details', {
                      formMode,
                      title: contract.title,
                    });
                  }}
                />
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <NotificationCenter
              isLoggedIn={true}
              onSelectContract={(id) => {
                openContractDetails(id, 'details');
                setActiveTab('contracts');
              }}
              onUnreadChange={setUnreadCount}
            />
          )}

          {activeTab === 'reports' && (
            <ReportDashboard
              currentUser={user}
              onSelectContract={(contract) => {
                openContractDetails(contract.contractId, 'details');
                setActiveTab('contracts');
              }}
            />
          )}

          {activeTab === 'users' && (
            <>
              {/* User list — hidden (not unmounted) when a user is selected so it keeps state */}
              <div className={selectedUserId !== null ? 'hidden' : ''}>
                {permissions.userRead && (
                  <UserManagement
                    currentUser={user}
                    userPermission={{
                      view: Boolean(permissions.userRead),
                      create: Boolean(permissions.userCreate),
                      update: Boolean(permissions.userUpdate),
                      inactive: Boolean(permissions.userDelete),
                    }}
                    onRefetchReady={(fn) => { userRefetchRef.current = fn; }}
                    onSelectUser={(selectedUser, formMode = 'view') => {
                      openUserDetails(
                        Number(selectedUser.id),
                        formMode,
                        selectedUser.fullName,
                      );
                    }}
                  />
                )}
              </div>

              {/* User details page — rendered inline like ContractDetails */}
              {selectedUserId !== null && (
                <UserDetails
                  key={selectedUserId}
                  variant="page"
                  userId={selectedUserId}
                  initialFormMode={userDetailsFormMode}
                  currentUser={user}
                  canEdit={Boolean(permissions.userUpdate)}
                  onClose={closeUserDetails}
                  onUpdateUser={handleUpdateUser}
                  onUpdate={() => { userRefetchRef.current(); }}
                  onFormModeChange={(mode, name) => {
                    setActiveUserFormMode(mode);
                    if (name) setSelectedUserName(name);
                  }}
                  onActionsReady={(canEdit) => {
                    setUserCanEdit(canEdit);
                  }}
                  actionsRef={userDetailActionsRef}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Logout confirmation */}
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
    </div>
  );
}