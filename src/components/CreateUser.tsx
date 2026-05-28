import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { UserForm } from './UserForm';
import { User, UserFormValues } from '../types/user';
import {
  mockDepartments,
  mockRoles,
  mockContractPermissions,
  mockUserPermissions,
  mockUsers,
} from '../data/mockData';
import type { UserProfile } from '../services/userService';
import toast from 'react-hot-toast';

interface CreateUserProps {
  currentUser?: UserProfile | null;
  onCancel: () => void;
  onSuccess?: (newUser?: User) => void;
}

const defaultValues: UserFormValues = {
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
};

export function CreateUser({ currentUser, onCancel, onSuccess }: CreateUserProps) {
  const [creating, setCreating] = useState(false);
  const [depAccess, setDepAccess] = useState(false);
  const depAccessRef = { current: null } as React.RefObject<HTMLDivElement | null>;

  const form = useForm<UserFormValues>({ defaultValues });
  const formData = form.watch();

  // ── Derived permission toggle state ────────────────────────────────
  const allContractOn = mockContractPermissions.every(p =>
    formData.contractPermissionIds.includes(p.id)
  );
  const allUserOn = mockUserPermissions.every(p =>
    formData.userPermissionIds.includes(p.id)
  );

  const deptAccessLabel = formData.deptAccessIds.length === 0
    ? 'Select departments'
    : mockDepartments
      .filter(d => formData.deptAccessIds.includes(d.departmentId))
      .map(d => d.departmentName)
      .join(', ');

  const onDeptAccessToggle = (id: number) => {
    const current = formData.deptAccessIds;
    form.setValue(
      'deptAccessIds',
      current.includes(id) ? current.filter(x => x !== id) : [...current, id],
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const onContractToggle = (id: number) => {
    const current = formData.contractPermissionIds;
    form.setValue(
      'contractPermissionIds',
      current.includes(id) ? current.filter(x => x !== id) : [...current, id],
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const onAllContract = () => {
    form.setValue(
      'contractPermissionIds',
      allContractOn ? [] : mockContractPermissions.map(p => p.id),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const onUserToggle = (id: number) => {
    const current = formData.userPermissionIds;
    form.setValue(
      'userPermissionIds',
      current.includes(id) ? current.filter(x => x !== id) : [...current, id],
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const onAllUser = () => {
    form.setValue(
      'userPermissionIds',
      allUserOn ? [] : mockUserPermissions.map(p => p.id),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const onSubmit = async (data: UserFormValues) => {
    setCreating(true);
    await new Promise(r => setTimeout(r, 400));

    // Build a User object from the form data so the list updates immediately
    const newUser: User = {
      id: String(Date.now()), // temporary id
      employeeId: data.employeeId,
      fullName: data.fullName,
      email: data.email,
      phoneNumber: data.phoneNumber ?? '',
      jobTitle: data.jobTitle ?? '',
      department: mockDepartments.find(d => d.departmentId === data.departmentId)?.departmentName ?? '',
      role: data.roleNames[0] ?? '',
      status: 'Active',
      moduleAccess: mockDepartments
        .filter(d => data.deptAccessIds.includes(d.departmentId))
        .map(d => ({ id: d.departmentId, name: d.departmentName })),
      roles: mockRoles
        .filter(r => data.roleNames.includes(r.roleName))
        .map(r => ({ id: r.roleId, name: r.roleName })),
      permissions: [
        ...mockContractPermissions.filter(p => data.contractPermissionIds.includes(p.id)),
        ...mockUserPermissions.filter(p => data.userPermissionIds.includes(p.id)),
      ],
    } as unknown as User;

    toast.success(`User ${data.fullName} has been created successfully!`);
    setCreating(false);
    onSuccess?.(newUser);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-lg w-full max-w-3xl mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-medium">Create New User</h2>
          <button onClick={onCancel}><X className="w-6 h-6 cursor-pointer" /></button>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <UserForm
            form={form}
            departments={mockDepartments}
            moduleAccess={currentUser?.moduleAccess}
            roles={mockRoles}
            contractItems={mockContractPermissions}
            userItems={mockUserPermissions}
            depAccess={depAccess}
            setDepAccess={setDepAccess}
            permissionRef={depAccessRef}
            deptAccessLabel={deptAccessLabel}
            allContractOn={allContractOn}
            allUserOn={allUserOn}
            onDeptAccessToggle={onDeptAccessToggle}
            onContractToggle={onContractToggle}
            onAllContract={onAllContract}
            onUserToggle={onUserToggle}
            onAllUser={onAllUser}
            insideModal
          />
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 rounded-lg cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={creating} className="px-6 py-2 bg-primary text-white rounded-lg disabled:opacity-50 cursor-pointer">
              {creating ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}