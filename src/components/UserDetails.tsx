import { titleCase } from 'text-case';
import { formatPermissionLabel } from '../utils/permissionLabels';
import { User } from '../types/user';
import { X, Edit2 } from 'lucide-react';

interface UserDetailsProps {
  user: User;
  onClose: () => void;
  canEdit?: boolean;
  onEdit?: (user: User) => void;
}

export function UserDetails({ user, onClose, canEdit = false, onEdit }: UserDetailsProps) {
  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getModuleAccessList = () => {
    return Array.isArray(user.moduleAccess)
      ? user.moduleAccess.map(m => m.name)
      : [];
  };

  const getPermissionList = (group: string) => {
    return user.permissions?.[group] ?? [];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-lg w-full max-w-3xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className='font-medium'>User Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Basic Information */}
          <div>
            <h3 className="mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Employee ID</p>
                <p className="mt-1">{user.employeeId}</p>
              </div>
              <div>
                <p className="text-gray-600">Full Name</p>
                <p className="mt-1">{user.fullName}</p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <p className="mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs ${user.status === 'Active' ? 'bg-green-100 text-green-800' :
                    user.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                    {user.status}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-gray-600">Email Address</p>
                <p className="mt-1">{user.email}</p>
              </div>
              <div>
                <p className="text-gray-600">Department</p>
                <p className="mt-1">{user.department}</p>
              </div>
              <div>
                <p className="text-gray-600">Job Title</p>
                <p className="mt-1">{user.jobTitle ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Phone Number</p>
                <p className="mt-1">{user.phoneNumber ?? 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Role & Permissions */}
          <div>
            <h3 className="mb-4">Role & Permissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">System Role</p>
                <p className="mt-1">{titleCase(user.role).split("Role")}</p>

              </div>
              <div>
                <p className="text-gray-600">Department Access Level</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {getModuleAccessList().length === 0 ? (
                    <p className="text-sm">N/A</p>
                  ) : (
                    getModuleAccessList().map(module => (
                      <span key={module} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {module}
                      </span>
                    ))
                  )}
                </div>
              </div>
              {/* Contract Permissions */}
              <div>
                <h3 className="text-gray-600">Contract Permissions</h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {getPermissionList('CONTRACT').length === 0 ? (
                    <p className=" text-sm ">N/A</p>
                  ) : (
                    getPermissionList('CONTRACT').map(p => (
                      <span key={p.id} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        {formatPermissionLabel(p.name, 'CONTRACT')}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* User Permissions */}
              <div>
                <h3 className="text-gray-600">User Permissions</h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {getPermissionList('USER').length === 0 ? (
                    <p className=" text-sm mt-1">N/A</p>
                  ) : (
                    getPermissionList('USER').map(p => (
                      <span key={p.id} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                        {formatPermissionLabel(p.name, 'USER')}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Audit Information */}
          <div>
            <h3 className="mb-4">Audit Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Created By</p>
                <p className="mt-1">{user.createdBy}</p>
              </div>
              <div>
                <p className="text-gray-600">Created Date/Time</p>
                <p className="mt-1">{formatDateTime(user.createdDate)}</p>
              </div> 
              <div>
                <p className="text-gray-600">Last Updated By</p>
                <p className="mt-1">{user.lastUpdatedBy || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-600">Last Updated Date/Time</p>
                <p className="mt-1">{formatDateTime(user.lastUpdatedDate)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(user)}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
              Edit User
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
