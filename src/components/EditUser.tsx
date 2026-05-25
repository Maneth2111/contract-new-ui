import {useEffect} from 'react';
import { User } from '../types/user';
import { X } from 'lucide-react';
import { useUpdateUser } from '../hook/useUser';
import { getUserById, UserProfile, UserRequest } from '../services/userService';
import { useUserForm } from '../hook/useUserForm';
import { UserFormValues } from "../types/user";
import { UserForm } from './UserForm';
import { getPermissionFlagsFromUser } from '../utils/appProfileHelpers';

interface EditUserProps {
  user: User;
  currentUser?: UserProfile | null; 
  onUpdate: (user: User) => void;
  onCancel: () => void;
  onSuccess?: ()  => void;
}

export function EditUser({ user,currentUser, onUpdate, onCancel, onSuccess }: EditUserProps) {
  const userId = Number(user.id);
  const permissions = getPermissionFlagsFromUser(currentUser ?? null);                        
  const isOwnProfile = userId === Number(currentUser?.id);
  const userFormProps = useUserForm({
    fullName: '', 
    employeeId: '', 
    email: '', 
    phoneNumber: '',
    jobTitle: '', 
    status: 'ACTIVE', 
    departmentId: 0,
    roleNames: [], 
    deptAccessIds: [], 
    contractPermissionIds: [], 
    userPermissionIds: [],
  }, { isEdit: true });

  const { form, departments, roles } = userFormProps;
  const { handleUpdate, loading: updating } = useUpdateUser(onSuccess);

  useEffect(() => {
    if (!roles || roles.length === 0) return; 

    getUserById(userId).then(detail => {
      const contractIds = (detail.permissions?.['CONTRACT'] ?? []).map((p: any) => Number(p.id));
      const userIds = (detail.permissions?.['USER'] ?? []).map((p: any) => Number(p.id));
      const moduleDepartmentIds = (detail.moduleAccess ?? []).map((m: any) => m.id ?? m.departmentId);

      form.reset({
        fullName: detail.fullName,
        employeeId: detail.employeeId,
        email: detail.email,
        phoneNumber: detail.phoneNumber ?? '',
        jobTitle: detail.jobTitle ?? '',
        status: detail.status,
        departmentId: detail.department?.departmentId ?? 0,
        roleNames: (detail.roles ?? []).map((r: any) => {
          return roles.find(role => role.roleId === r.id)?.roleName ?? r.name;
        }),
        deptAccessIds: moduleDepartmentIds,
        contractPermissionIds: contractIds,
        userPermissionIds: userIds,
      });
    });
  }, [userId, roles]);

  const onSubmit = async (data: UserFormValues) => {
    const payload: UserRequest = {
      fullName: data.fullName,
      employeeId: data.employeeId,
      email: data.email,
      phoneNumber: data.phoneNumber ?? '',
      jobTitle: data.jobTitle,
      status: data.status,
      departmentId: data.departmentId,
      roleIds: roles?.filter(r => data.roleNames.includes(r.roleName)).map(r => r.roleId) ?? [],
      moduleDepartmentIds: data.deptAccessIds,
      permissionIds: [...new Set([...data.contractPermissionIds, ...data.userPermissionIds])],
    };
    const success = await handleUpdate(userId, payload);
    console.log(success)
    if (success) {
      const deptName = departments.find(d => d.departmentId === data.departmentId)?.departmentName ?? user.department;
      onUpdate({ ...user, ...data, department: deptName, status: data.status as User['status'] });
      onCancel();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-lg w-full max-w-3xl mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className='font-medium text-xl'>Edit User</h2>
          <button onClick={onCancel}><X className="w-6 h-6 cursor-pointer" /></button>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <UserForm 
            {...userFormProps} 
            editingUserId={userId}
            isOwnProfile={isOwnProfile}
            currentUserPermissions={permissions} />
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 rounded-lg cursor-pointer">Cancel</button>
            <button type="submit" disabled={updating} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 cursor-pointer">
              Edit User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}