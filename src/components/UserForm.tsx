import React, { useEffect, useMemo } from 'react'
import { ChevronDown } from 'lucide-react';
import { Controller, UseFormReturn } from 'react-hook-form';
import { titleCase } from 'text-case';
import { Department } from '../services/departmentService';
import { UserFormValues } from "../types/user";
import { useUserStatus } from '../hook/useStatus';
import { PermissionFlags } from '../utils/appProfileHelpers';
import { getAllowedDepartments, type ModuleAccessItem } from '../utils/departmentAccess'
import { formatPermissionLabel } from '../utils/permissionLabels'

interface Role { roleId: number; roleName: string; }
interface Permission { id: number; name: string; }

interface UserFormProps {
  form: UseFormReturn<UserFormValues>;
  departments: Department[];
  moduleAccess?: ModuleAccessItem[] | null;
  roles: Role[] | undefined;
  contractItems: Permission[];
  userItems: Permission[];
  depAccess: boolean;
  setDepAccess: (v: boolean) => void;
  permissionRef: React.RefObject<HTMLDivElement | null>;
  deptAccessLabel: string;
  allContractOn: boolean;
  allUserOn: boolean;
  onDeptAccessToggle: (id: number) => void;
  onContractToggle: (id: number) => void;
  onAllContract: () => void;
  onUserToggle: (id: number) => void;
  onAllUser: () => void;
  isEdit?: boolean;
  editingUserId?: number;
  isOwnProfile?: boolean; 
  currentUserPermissions?: PermissionFlags;
}

const ErrorMsg = ({ message }: { message?: string }) =>
  message ? <p className="text-red-500 text-sm mt-1">{message}</p> : null;

export function UserForm({
  form,
  departments,
  moduleAccess,
  roles,
  contractItems,
  userItems,
  depAccess,
  setDepAccess,
  permissionRef,
  deptAccessLabel,
  allContractOn,
  allUserOn,
  onDeptAccessToggle,
  onContractToggle,
  onAllContract,
  onUserToggle,
  onAllUser,
  isEdit = false,
  editingUserId,
  isOwnProfile = false,
  currentUserPermissions
}: UserFormProps) {
  const { register, control, watch, setValue, formState: { errors } } = form;
  const formData = watch();
  const { userStatus } = useUserStatus();

  const { allowedDepartments, isSingleDepartment, defaultDepartmentId } = useMemo(
    () => getAllowedDepartments(departments, moduleAccess),
    [departments, moduleAccess]
  )

  useEffect(() => {
    if (!isSingleDepartment || defaultDepartmentId == null) return
    if (Number(formData.departmentId) === Number(defaultDepartmentId)) return
    setValue('departmentId', defaultDepartmentId, { shouldDirty: true, shouldValidate: true })
  }, [defaultDepartmentId, formData.departmentId, isSingleDepartment, setValue])

  useEffect(() => {
    if (!isSingleDepartment || defaultDepartmentId == null) return
    if (formData.deptAccessIds.includes(defaultDepartmentId) && formData.deptAccessIds.length === 1) return
    setValue('deptAccessIds', [defaultDepartmentId], { shouldDirty: true, shouldValidate: true })
  }, [defaultDepartmentId, formData.deptAccessIds, isSingleDepartment, setValue])

  return (
    <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">

      {/* User Information */}
      <div className="space-y-4">
        <h3>User Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="block text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label>
            <input
              {...register('fullName')}
              placeholder="e.g. SOK Raksmey"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              maxLength={50}
            />
            <ErrorMsg message={errors.fullName?.message} />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Employee ID <span className="text-red-500">*</span></label>
            <input {...register('employeeId')}
              placeholder="e.g. 1010"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            <ErrorMsg message={errors.employeeId?.message} />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Email Address <span className="text-red-500">*</span></label>
            <input {...register('email')}
              placeholder="raksmey.sok@chokchey.com.kh"
              disabled={isOwnProfile}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            <ErrorMsg message={errors.email?.message} />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Department <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                {...register('departmentId', { valueAsNumber: true })}
                disabled={isSingleDepartment}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white ${isSingleDepartment ? 'cursor-default' : 'cursor-pointer pr-8'}`}
              >
                <option value="">Select Department</option>
                {allowedDepartments.map(dept => (
                  <option key={dept.departmentId} value={dept.departmentId}>{dept.departmentName}</option>
                ))}
              </select>
              {!isSingleDepartment && (
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              )}
            </div>
            <ErrorMsg message={errors.departmentId?.message} />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">
              Job Title / Position
              {isEdit ? <span className="text-red-500"> *</span> : null}
            </label>
            <input
              {...register('jobTitle')}
              placeholder="e.g. Software Engineer"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              maxLength={100} />
            <ErrorMsg message={errors.jobTitle?.message} />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">
              Phone Number
              {isEdit ? <span className="text-red-500"> *</span> : null}
            </label>
            <input
              {...register('phoneNumber')}
              placeholder="e.g. +855 or 0123456789"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              maxLength={50} />
            <ErrorMsg message={errors.phoneNumber?.message} />
          </div>

          {isEdit &&!isOwnProfile && currentUserPermissions?.userUpdate && currentUserPermissions?.userDelete && (
            <div>
              <label className="block text-gray-700 mb-2">Account Status </label>
              <div className="relative">
                <select
                  {...register('status')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white pr-8 cursor-pointer">
                  {userStatus?.map(status => (
                    <option key={status.key} value={status.key}>{titleCase(status.label)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role & Permissions */}
      <div className="space-y-4">
        <h3>Role & Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="block text-gray-700 mb-2">System Role <span className="text-red-500">*</span></label>
            <div className="relative">
              <Controller
                name="roleNames"
                control={control}
                render={({ field }) => (
                  <select
                    value={field.value[0] ?? ''}
                    onChange={e => field.onChange(e.target.value ? [e.target.value] : [])}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white pr-8 cursor-pointer"
                  >
                    <option value="">Select Role</option>
                    {roles?.map(role => (
                      <option key={role.roleId} value={role.roleName}>
                        {titleCase(role.roleName).replace('Role', '')}
                      </option>
                    ))}
                  </select>
                )}
              />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
            <ErrorMsg message={errors.roleNames?.message} />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Department Access <span className="text-red-500">*</span></label>
            <div className="relative" ref={permissionRef}>
              <button
                type="button"
                disabled={isSingleDepartment}
                onClick={() => setDepAccess(!depAccess)}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between disabled:opacity-60 ${isSingleDepartment ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <span className="text-gray-700 truncate">{deptAccessLabel}</span>
                {!isSingleDepartment && (
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ml-2 ${depAccess ? 'rotate-180' : ''}`} />
                )}
              </button>
              {depAccess && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {allowedDepartments.map(dept => (
                    <label key={dept.departmentId} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.deptAccessIds.includes(dept.departmentId)}
                        onChange={() => onDeptAccessToggle(dept.departmentId)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-gray-700">{dept.departmentName}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <ErrorMsg message={errors.deptAccessIds?.message} />
          </div>

        </div>
      </div>

      {/* Contract Access */}
      <div className="space-y-4">
        <h3>Contract Access (Select at least one) <span className="text-red-500">*</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={allContractOn} onChange={onAllContract} className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer" />
            <span className="text-gray-700">Full Access</span>
          </label>
          {contractItems.map(perm => (
            <label key={perm.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.contractPermissionIds.includes(perm.id)}
                onChange={() => onContractToggle(perm.id)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer"
              />
              <span className="text-gray-700">{formatPermissionLabel(perm.name, 'CONTRACT')}</span>
            </label>
          ))}
        </div>
        <ErrorMsg message={errors.contractPermissionIds?.message} />
      </div>

      {/* User Access */}
      <div className="space-y-4">
        <h3>User Access</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={allUserOn}
              onChange={onAllUser}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer" />
            <span className="text-gray-700">Full Access</span>
          </label>
          {userItems.map(perm => (
            <label key={perm.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.userPermissionIds.includes(perm.id) ?? false}
                onChange={() => onUserToggle(perm.id)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer"
              />
              <span className="text-gray-700">{formatPermissionLabel(perm.name, 'USER')}</span>
            </label>
          ))}
        </div>
        <ErrorMsg message={errors.userPermissionIds?.message} />
      </div>
    </div>
  );
}