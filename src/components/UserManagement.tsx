import React, { useState, type ChangeEvent } from 'react';
import { User } from '../types/user';
import { Search, Eye, Edit2, UserX, Plus, ChevronDown, Users } from 'lucide-react';
import { UserDetails } from './UserDetails';
import { EditUser } from './EditUser';
import { CreateUser } from './CreateUser';
import { titleCase } from "text-case";
import { useDepartments } from '../hook/useDepartment';
import { useRoles } from '../hook/useRoles';
import { useUserDetail, useUsers } from '../hook/useUser';
import { useUserActions, useUserStatus } from '../hook/useStatus';
import { usePagination } from '../hook/usePagination';
import { ConfirmDialog } from './ConfirmationDialog';
import { PaginationBar } from './PaginationBar';
import { mapApiUserToUser, UserProfile } from '../services/userService';
import { getAllowedDepartments } from '../utils/departmentAccess';


interface UserManagementProps {
  currentUser?: UserProfile | null;
  userPermission: {
    view: boolean;
    create: boolean;
    update: boolean;
    inactive: boolean;
  };
  onUpdateUser: (user: User) => void;
}

export function UserManagement({ currentUser, userPermission, onUpdateUser }: UserManagementProps) {
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
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const { roles } = useRoles();
  const { userStatus } = useUserStatus();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const { user: userDetail } = useUserDetail(selectedUserId);
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

  React.useEffect(() => {
    if (isSingleDepartment && defaultDepartmentId != null) {
      if (selectedDepartmentId === defaultDepartmentId) return
      setSelectedDepartmentId(defaultDepartmentId)
      goToPage(1)
    }
  }, [defaultDepartmentId, isSingleDepartment, goToPage, selectedDepartmentId])

  // Reset to page 0 when filters change
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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <span><Users className="w-10 h-10 text-blue-600" /></span>
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

      {/* Filters and Create Button */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2>User Management</h2>
          {userPermission.create && (
            <button
              onClick={() => setShowCreateUser(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create User
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
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

          {/* Department Filter */}
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

          {/* Role Filter */}
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

          {/* Status Filter */}
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
                ))

                }
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div
          className={[
            'overflow-x-auto',
            users.length > 10 ? 'overflow-y-auto max-h-[70vh]' : '',
          ].join(' ').trim()}
        >
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-700">Employee ID</th>
                <th className="px-4 py-3 text-left text-gray-700">Full Name</th>
                <th className="px-4 py-3 text-left text-gray-700">Email</th>
                <th className="px-4 py-3 text-left text-gray-700">Department</th>
                <th className="px-4 py-3 text-left text-gray-700">Role</th>
                <th className="px-4 py-3 text-left text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user: User) => (
                  <tr key={user.id} className="hover:bg-gray-50">
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
                            onClick={() => setSelectedUserId(Number(user.id))}
                            className="p-2 hover:bg-gray-100 rounded-lg text-blue-600 cursor-pointer"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {userPermission.update && (
                          <button
                            onClick={() => setEditingUser(user)}
                            className="p-2 hover:bg-gray-100 rounded-lg text-blue-600 cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {userPermission.inactive && user.status === 'Active' && Number(user.id) !== Number(currentUser?.id) && (
                          <button
                            onClick={() => setDeactivateTarget(user)}
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

      {/* Results count */}
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

      {/* User Details Modal */}
      {selectedUserId && userDetail && (
        <UserDetails
          user={mapApiUserToUser(userDetail)}
          onClose={() => setSelectedUserId(null)}
          canEdit={userPermission.update}
          onEdit={(user) => {
            setSelectedUserId(null);
            setEditingUser(user);
          }}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUser
          user={editingUser}
          currentUser={currentUser}
          onUpdate={onUpdateUser}
          onCancel={() => setEditingUser(null)}
          onSuccess={refetch}
        />
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <CreateUser
          currentUser={currentUser}
          onCancel={() => setShowCreateUser(false)}
          onSuccess={refetch}
        />

      )}

      {/*  Confirm form deactivete user */}
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
