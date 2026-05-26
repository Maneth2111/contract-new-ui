import { X } from "lucide-react";
import { useCreateUser } from "../hook/useUser";
import { useUserForm } from "../hook/useUserForm";
import { UserProfile, UserRequest } from "../services/userService";
import { UserForm } from "./UserForm";
import { UserFormValues } from "../types/user";



interface CreateUserProps {
  currentUser?: UserProfile | null;
  onCancel: () => void;
  onSuccess?: () => void;
}


export function CreateUser({ currentUser, onCancel, onSuccess }: CreateUserProps) {
  const handleSuccess = () => {
    onSuccess?.();
    onCancel();
  };
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
  });

  const { roles } = userFormProps;
  const { handleCreate, loading: creating } = useCreateUser(handleSuccess);

  const onSubmit = async (data: UserFormValues) => {
    console.log('all roles:', roles);
    console.log('matching:', roles?.filter(r => data.roleNames.includes(r.roleName)));
    const payload: UserRequest = {
      ...data,
      departmentId: data.departmentId,
      roleIds: roles?.filter(r => data.roleNames.includes(r.roleName)).map(r => r.roleId) ?? [],
      moduleDepartmentIds: data.deptAccessIds,
      permissionIds: [...new Set([...data.contractPermissionIds, ...data.userPermissionIds ?? []])],
    };
    await handleCreate(payload);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-lg w-full max-w-3xl mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-medium">Create New User</h2>
          <button onClick={onCancel}><X className="w-6 h-6 cursor-pointer" /></button>
        </div>
        <form onSubmit={userFormProps.form.handleSubmit(onSubmit)}>
          <UserForm {...userFormProps} insideModal moduleAccess={currentUser?.moduleAccess} />
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 rounded-lg cursor-pointer">Cancel</button>
            <button type="submit" disabled={creating} className="px-6 py-2 bg-primary text-white rounded-lg disabled:opacity-50 cursor-pointer">
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}