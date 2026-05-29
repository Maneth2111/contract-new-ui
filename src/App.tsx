import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Contract } from './types/contract';
import { User } from './types/user';

import { ContractList } from './components/ContractList';
import { NotificationCenter } from './components/NotificationCenter';
import { ReportDashboard } from './components/ReportDashboard';
import { UserManagement } from './components/UserManagement';
import { LayoutDashboard, FileText, Bell, BarChart3, User as UserIcon, Users, LogOut, EllipsisVertical } from 'lucide-react';
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

const Dashboard = React.lazy(() => import('./components/Dashboard'));
// ─── Mock data ────────────────────────────────────────────────────────────────
import {
  mockUsers,
  mockContracts,
  mockContractPermissions,
  mockUserPermissions,
  type Permission,
} from './data/mockData'; // adjust path to wherever you placed the mock data file

// Build a UserProfile from the first admin user in mock data

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
  phoneNumber: rawMockUser.phoneNumber ?? undefined,
  jobTitle: rawMockUser.jobTitle ?? undefined,
  status: rawMockUser.status,
  moduleAccess: rawMockUser.moduleAccess,
  department: rawMockUser.department,
  roles: rawMockUser.roles,
  // UserProfile expects flat Permission array
  permissions: rawMockUser.permissions as Permission[],
};

// Derive a static notification summary from mock contracts
const MOCK_NOTIFICATION_SUMMARY = {
  overdue: mockContracts.filter((c) => c.status === 'OVERDUE').length,
  expire30: mockContracts.filter((c) => c.remainingDays >= 0 && c.remainingDays <= 30).length,
  expire60: mockContracts.filter((c) => c.remainingDays > 30 && c.remainingDays <= 60).length,
  expire90: mockContracts.filter((c) => c.remainingDays > 60 && c.remainingDays <= 90).length,
};

// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'contracts' | 'notifications' | 'reports' | 'users';

export default function App() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [contractDetailsFormMode, setContractDetailsFormMode] = useState<'view' | 'edit' | 'renew'>('view');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userDetailsFormMode, setUserDetailsFormMode] = useState<'view' | 'edit'>('view');
  const [user, setCurrentUser] = useState<UserProfile | null>(MOCK_PROFILE);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [contractDetailsHideRenew, setContractDetailsHideRenew] = useState(false);
  const [contractDetailTab, setContractDetailTab] = useState<ContractDetailTab>('details');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Mock total contracts count (kept as state so child components can trigger a "refetch")
  const [total, setTotal] = useState(mockContracts.length);
  const refetchTotal = useCallback(() => {
    // In mock mode there is nothing to re-fetch; count stays constant
    setTotal(mockContracts.length);
  }, []);

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const closeUserDetails = useCallback(() => {
    setSelectedUserId(null);
    setUserDetailsFormMode('view');
  }, []);

  const openUserDetails = useCallback((
    userId: number,
    formMode: 'view' | 'edit' = 'view',
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
    options?: { hideRenew?: boolean; formMode?: 'view' | 'edit' | 'renew' },
  ) => {
    setContractDetailsHideRenew(options?.hideRenew === true);
    setContractDetailsFormMode(options?.formMode ?? 'view');
    setSelectedContractId(contractId);
    setContractDetailTab(tab);
    window.history.pushState({}, '', buildContractDetailPath(contractId));
  }, []);

  // ── URL / popstate sync ───────────────────────────────────────────────────
  useEffect(() => {
    const parsed = parseContractDetailPath(window.location.pathname);
    if (!parsed) return;
    setSelectedContractId(parsed.contractId);
    setContractDetailTab(parsed.tab);
    setContractDetailsHideRenew(false);
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
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // ── Close profile dropdown on outside click ───────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Permissions ───────────────────────────────────────────────────────────
  const permissions = getPermissionFlagsFromUser(user);

  // ── Notification badge count (from mock summary) ──────────────────────────
  const MOCK_CONTRACTS_TOTAL = 8;
  const [unreadCount, setUnreadCount] = useState(MOCK_CONTRACTS_TOTAL);

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
    setContractDetailsHideRenew(false);
    setContractDetailTab('details');
    if (parseContractDetailPath(window.location.pathname)) {
      window.history.replaceState({}, '', '/');
    }
    // In mock mode, immediately restore the mock user so the UI stays usable
    setTimeout(() => setCurrentUser(MOCK_PROFILE), 500);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-primary/5">
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

      {/* Header with tab navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-350 mx-auto px-3 lg:px-10 ">
          <div className="flex items-stretch justify-between gap-0.5 min-h-16 ">
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
                Contract Management
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
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                    {unreadCount}
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

            {/* Profile dropdown */}
            <div className="flex shrink-0 items-center py-2 pl-6" ref={profileMenuRef}>
              <div className="relative">
                <button
                  type="button"
                  disabled={!user?.id}
                  onClick={() => setProfileMenuOpen((o) => !o)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors cursor-pointer disabled:cursor-default disabled:hover:bg-transparent"
                  aria-haspopup="true"
                  aria-expanded={profileMenuOpen}
                >
                  <EllipsisVertical className="w-5 h-5 text-gray-600" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 px-1 rounded-xl border border-gray-200 bg-white shadow-lg py-1 z-50">
                    {/* My Profile */}
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        if (!user?.id) return;
                        if (selectedContractId !== null) closeContractDetails();
                        openUserDetails(user.id, 'view');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-nowrap transition-colors cursor-pointer"
                    >
                      <span><UserIcon className="w-4 h-4 text-gray-400" /></span>
                      My Profile
                    </button>

                    {/* Logout */}
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:w-full transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
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
              openContractDetails(contract.contractId, 'details', { formMode });
            }}
          />
        )}
        {activeTab === 'notifications' && (
          <NotificationCenter
            isLoggedIn={true}
            onSelectContract={(id) => {
              openContractDetails(id, 'details', { hideRenew: true });
            }}
            onUnreadChange={setUnreadCount}
          />
        )}
        {activeTab === 'reports' && <ReportDashboard currentUser={user} onSelectContract={(contract) => {
          openContractDetails(contract.contractId, 'details');
        }} />}
        {permissions.userRead && activeTab === 'users' && (
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
              openUserDetails(Number(selectedUser.id), formMode);
            }}
          />
        )}
      </main>

      {/* User Details Drawer */}
      {selectedUserId !== null && (
        <UserDetails
          key={selectedUserId}
          userId={selectedUserId}
          initialFormMode={userDetailsFormMode}
          currentUser={user}
          canEdit={Boolean(permissions.userUpdate)}
          onClose={closeUserDetails}
          onUpdateUser={handleUpdateUser}
          onUpdate={() => { userRefetchRef.current(); }}
        />
      )}

      {/* Contract Details Drawer */}
      {selectedContractId !== null && (
        <ContractDetails
          key={selectedContractId}
          variant="fullscreen"
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
        />
      )}

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