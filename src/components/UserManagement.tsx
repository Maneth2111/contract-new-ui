import React, { useState, type ChangeEvent } from 'react';
import { User } from '../types/user';
import { Search, Eye, Edit2, UserX, Plus, ChevronDown, Users } from 'lucide-react';
import { CreateUser } from './CreateUser';
import { titleCase } from "text-case";
import { useDepartments } from '../hook/useDepartment';
import { useRoles } from '../hook/useRoles';
import { useUsers } from '../hook/useUser';
import { useUserActions, useUserStatus } from '../hook/useStatus';
import { usePagination } from '../hook/usePagination';
import { ConfirmDialog } from './ConfirmationDialog';
import { PaginationBar } from './PaginationBar';
import { UserProfile } from '../services/userService';
import { getAllowedDepartments } from '../utils/departmentAccess';
import { userTableSortAccessors } from '../utils/userTableSort';
import { useTableSort } from '../hook/useTableSort';
import { SortableTableHead } from './SortableTableHead';
import { tableRowHover, tableTheadClass } from '../utils/tableRowHover';

interface UserManagementProps {
  currentUser?: UserProfile | null;
  userPermission: {
    view: boolean;
    create: boolean;
    update: boolean;
    inactive: boolean;
  };
  onSelectUser?: (user: User, formMode?: 'view' | 'edit') => void;
  onRefetchReady?: (refetch: () => void) => void;
}

export function UserManagement({ currentUser, userPermission, onSelectUser, onRefetchReady }: UserManagementProps) {
  const [searchText, setSearchText] = useState('');
  const { departmentList } = useDepartments();
  const {
    allowedDepartments,
    isSingleDepartment,
    defaultDepartmentId,
  } = getAllowedDepartments(departmentList, currentUser?.moduleAccess);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | undefined>(() => defaultDepartmentId);
  const [selectedRoleName, setSelectedRoleName] = useState<string | undefined>(undefined);
  const [selectedStatusKey, setSelectedStatusKey] = useState<string | undefined>(undefined);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const { roles } = useRoles();
  const { userStatus } = useUserStatus();
  const { pagination, goToPage, setSize } = usePagination(10);
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);

  const { users, summary, refetch, total, totalPages } = useUsers({
    search: searchText.trim() || undefined,
    status: selectedStatusKey,
    role: selectedRoleName,
    departmentId: selectedDepartmentId,
    page: pagination.page,
    size: pagination.size,
  });
  const { handleDelete } = useUserActions(refetch);

  const { sortKey, sortDirection, toggleSort, sortedItems: sortedUsers } = useTableSort(
    users,
    userTableSortAccessors
  );

  React.useEffect(() => {
    onRefetchReady?.(refetch);
  }, [refetch, onRefetchReady]);

  React.useEffect(() => {
    if (isSingleDepartment && defaultDepartmentId != null) {
      if (selectedDepartmentId === defaultDepartmentId) return
      setSelectedDepartmentId(defaultDepartmentId)
      goToPage(1)
    }
  }, [defaultDepartmentId, isSingleDepartment, goToPage, selectedDepartmentId])

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    goToPage(1);
  };

  const handleStatusChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatusKey(e.target.value === '' ? undefined : e.target.value);
    goToPage(1);
  };

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800';
      case 'Disabled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewUserDetails = (user: User, formMode: 'view' | 'edit' = 'view') => {
    if (formMode === 'view' && !userPermission.view) return
    if (formMode === 'edit' && !userPermission.update) return
    onSelectUser?.(user, formMode)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <span><Users className="w-10 h-10 text-primary" /></span>
            <div>
              <p className="text-gray-600">Total Users</p>
              <p className="mt-1">{summary?.total_users ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <span><Users className="w-10 h-10 text-green-600" /></span>
            <div>
              <p className="text-gray-600">Active Users</p>
              <p className="mt-1">{summary?.active_users ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <span><Users className="w-10 h-10 text-gray-600" /></span>
            <div>
              <p className="text-gray-600">Inactive Users</p>
              <p className="mt-1">{summary?.inactive_users ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <span><Users className="w-10 h-10 text-purple-600" /></span>
            <div>
              <p className="text-gray-600">Administrators</p>
              <p className="mt-1">{summary?.administrators ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-medium">User Management</h2>
          {userPermission.create && (
            <button
              type="button"
              onClick={() => setShowCreateUser(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create User
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">Search Users</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Employee ID, Name, Email..."
                value={searchText}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Department</label>
            <div className="relative">
              <select
                value={selectedDepartmentId ?? ''}
                disabled={isSingleDepartment}
                onChange={(e) => { setSelectedDepartmentId(e.target.value === '' ? undefined : Number(e.target.value)); goToPage(1); }}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white ${isSingleDepartment ? 'cursor-default' : 'cursor-pointer pr-8'}`}
              >
                {!isSingleDepartment && <option value="">All Departments</option>}
                {allowedDepartments.map(dept => (
                  <option key={dept.departmentId} value={dept.departmentId}>{dept.departmentName}</option>
                ))}
              </select>
              {!isSingleDepartment && (
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              )}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Role</label>
            <div className="relative">
              <select
                value={selectedRoleName ?? ''}
                onChange={(e) => { setSelectedRoleName(e.target.value === '' ? undefined : e.target.value); goToPage(1); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white pr-8 cursor-pointer"
              >
                <option value="">All Roles</option>
                {roles?.map(role => (
                  <option key={role?.roleId} value={role?.roleName}>{titleCase(role?.roleName).replace("Role", "")}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Status</label>
            <div className="relative">
              <select
                value={selectedStatusKey ?? ''}
                onChange={handleStatusChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white pr-8 cursor-pointer"
              >
                <option value="">All Status</option>
                {userStatus.map(status => (
                  <option key={status.key} value={status.key}>{titleCase(status.label)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div
          className={[
            'overflow-x-auto',
            sortedUsers.length > 10 ? 'overflow-y-auto max-h-[70vh]' : '',
          ].join(' ').trim()}
        >
          <table className={`w-full ${tableRowHover}`}>
            <thead className={tableTheadClass}>
              <tr>
                <SortableTableHead label="Employee ID" columnKey="employeeId" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="px-4 py-3" />
                <SortableTableHead label="Full Name" columnKey="fullName" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="px-4 py-3" />
                <SortableTableHead label="Email" columnKey="email" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="px-4 py-3" />
                <SortableTableHead label="Department" columnKey="department" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="px-4 py-3" />
                <SortableTableHead label="Role" columnKey="role" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="px-4 py-3" />
                <SortableTableHead label="Status" columnKey="status" sortKey={sortKey} sortDirection={sortDirection} onSort={toggleSort} className="px-4 py-3" />
                <th className="px-4 py-3 text-left text-brand-navy font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedUsers.length === 0 ? (
                <tr data-empty>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user: User) => (
                  <tr
                    key={user.id}
                    onClick={() => userPermission.view && handleViewUserDetails(user)}
                    className={`transition-colors ${userPermission.view ? 'cursor-pointer' : ''}`}
                  >
                    <td className="px-4 py-3">{user.employeeId}</td>
                    <td className="px-4 py-3">{user.fullName}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{user.department}</td>
                    <td className="px-4 py-3">{titleCase(user.role).replace("Role", "") ?? 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {userPermission.view && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewUserDetails(user)
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg text-primary cursor-pointer"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {userPermission.update && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewUserDetails(user, 'edit')
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg text-primary cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {userPermission.inactive && user.status === 'Active' && Number(user.id) !== Number(currentUser?.id) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeactivateTarget(user)
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg text-red-600 cursor-pointer"
                            title="Inactive"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between w-full items-start sm:items-center gap-3 sm:gap-0">
        <div className="text-gray-600 text-sm sm:text-base whitespace-nowrap">
          Showing {users.length} of {total} users
        </div>

        <div className="flex items-center gap-3">
          {total > 10 && (
            <select
              value={pagination.size}
              onChange={e => { setSize(Number(e.target.value)); goToPage(1); }}
              className="px-2 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-sm bg-white cursor-pointer"
            >
              {[10, 20, 50].map(s => (
                <option key={s} value={s}>Show {s}</option>
              ))}
            </select>
          )}
          <PaginationBar
            currentPage={pagination.page}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </div>
      </div>

      {showCreateUser && (
        <CreateUser
          currentUser={currentUser}
          onCancel={() => setShowCreateUser(false)}
          onSuccess={() => {
            setShowCreateUser(false)
            void refetch()
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deactivateTarget}
        title="Inactivate User"
        message={`Are you sure you want to inactivate user "${deactivateTarget?.fullName}"?`}
        confirmLabel="Inactivate"
        cancelLabel="Cancel"
        icon={<UserX className="w-5 h-5 text-red-600" />}
        confirmIcon={<UserX className="w-4 h-4" />}
        onConfirm={() => {
          handleDelete(Number(deactivateTarget!.id));
          setDeactivateTarget(null);
        }}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
