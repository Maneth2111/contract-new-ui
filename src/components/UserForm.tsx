import React, { useEffect, useMemo } from 'react'
import { ChevronDown } from 'lucide-react';
import { Controller, UseFormReturn } from 'react-hook-form';
import { titleCase } from 'text-case';
import { UserFormValues } from "../types/user";

import { PermissionFlags } from '../utils/appProfileHelpers';
import { getAllowedDepartments, type ModuleAccessItem } from '../utils/departmentAccess'
import { formatPermissionLabel } from '../utils/permissionLabels'
import { mockUserStatuses } from '../data/mockData';

interface Role { roleId: number; roleName: string; }
interface Permission { id: number; name: string; }
export interface Department{
    departmentId: number,
    departmentCode: string,
    departmentName: string,
    description: string,
    msChannel: string | null,
    title: string | null,
    msWebhookUrl: string | null
    msChannelUrl: string | null
}

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
  readOnly?: boolean;
  /** When true (Create User modal), form scrolls inside a max height. Fullscreen details should leave this false. */
  insideModal?: boolean;
}

const readOnlyBoxClass = 'px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 min-h-11 text-gray-800'

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
  currentUserPermissions,
  readOnly = false,
  insideModal = false,
}: UserFormProps) {
  const { register, control, watch, setValue, formState: { errors } } = form;
  const formData = watch();
  const userStatus = mockUserStatuses;

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

  const fieldClass = readOnly
    ? readOnlyBoxClass
    : 'w-full px-4 py-2 border border-gray-300 rounded-lg'
  const selectClass = readOnly
    ? readOnlyBoxClass
    : `w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white ${isSingleDepartment ? 'cursor-default' : 'cursor-pointer pr-8'}`

  const departmentName =
    allowedDepartments.find((d) => Number(d.departmentId) === Number(formData.departmentId))?.departmentName ?? 'N/A'

  const statusLabel =
    userStatus?.find((s) => s.key === formData.status)?.label
      ? titleCase(userStatus.find((s) => s.key === formData.status)!.label)
      : titleCase(formData.status)

  const roleLabel =
    formData.roleNames[0]
      ? titleCase(formData.roleNames[0]).replace('Role', '')
      : 'N/A'

  const selectedDeptNames = useMemo(
    () => departments
      .filter((d) => formData.deptAccessIds.includes(d.departmentId))
      .map((d) => d.departmentName),
    [departments, formData.deptAccessIds]
  )

  const renderPermissionTags = (ids: number[], items: Permission[], group: 'CONTRACT' | 'USER') => {
    const selected = items.filter((p) => ids.includes(p.id))
    if (selected.length === 0) return <p className="text-sm text-gray-500">N/A</p>
    const tagClass = group === 'CONTRACT' ? 'bg-brand-navy text-white text-center' : 'bg-brand-pink text-white text-center'
    return (
      <div className="flex flex-wrap gap-2">
        {selected.map((p) => (
          <span key={p.id} className={`px-3 py-1 rounded-full text-xs ${tagClass}`}>
            {formatPermissionLabel(p.name, group)}
          </span>
        ))}
      </div>
    )
  }

  const bodyClass = insideModal
    ? 'p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto'
    : 'p-6 space-y-6 w-full'

  return (
    <div className={bodyClass}>

      {/* User Information */}
      <div className="space-y-3">
        <h3>User Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="block text-gray-700 mb-2">Full Name {!readOnly && <span className="text-red-500">*</span>}</label>
            {readOnly ? (
              <div className={readOnlyBoxClass}>{formData.fullName || 'N/A'}</div>
            ) : (
              <>
                <input
                  {...register('fullName')}
                  placeholder="e.g. SOK Raksmey"
                  className={fieldClass}
                  maxLength={50}
                />
                <ErrorMsg message={errors.fullName?.message} />
              </>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Employee ID {!readOnly && <span className="text-red-500">*</span>}</label>
            {readOnly ? (
              <div className={readOnlyBoxClass}>{formData.employeeId || 'N/A'}</div>
            ) : (
              <>
                <input {...register('employeeId')} placeholder="e.g. 1010" className={fieldClass} />
                <ErrorMsg message={errors.employeeId?.message} />
              </>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Email Address {!readOnly && <span className="text-red-500">*</span>}</label>
            {readOnly ? (
              <div className={readOnlyBoxClass}>{formData.email || 'N/A'}</div>
            ) : (
              <>
                <input
                  {...register('email')}
                  placeholder="raksmey.sok@chokchey.com.kh"
                  disabled={isOwnProfile}
                  className={fieldClass}
                />
                <ErrorMsg message={errors.email?.message} />
              </>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Department {!readOnly && <span className="text-red-500">*</span>}</label>
            {readOnly ? (
              <div className={readOnlyBoxClass}>{departmentName}</div>
            ) : (
              <>
                <div className="relative">
                  <select
                    {...register('departmentId', { valueAsNumber: true })}
                    disabled={isSingleDepartment}
                    className={selectClass}
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
              </>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-2">
              Job Title / Position
              {!readOnly && isEdit ? <span className="text-red-500"> *</span> : null}
            </label>
            {readOnly ? (
              <div className={readOnlyBoxClass}>{formData.jobTitle || 'N/A'}</div>
            ) : (
              <>
                <input
                  {...register('jobTitle')}
                  placeholder="e.g. Software Engineer"
                  className={fieldClass}
                  maxLength={100}
                />
                <ErrorMsg message={errors.jobTitle?.message} />
              </>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-2">
              Phone Number
              {!readOnly && isEdit ? <span className="text-red-500"> *</span> : null}
            </label>
            {readOnly ? (
              <div className={readOnlyBoxClass}>{formData.phoneNumber || 'N/A'}</div>
            ) : (
              <>
                <input
                  {...register('phoneNumber')}
                  placeholder="e.g. +855 or 0123456789"
                  className={fieldClass}
                  maxLength={50}
                />
                <ErrorMsg message={errors.phoneNumber?.message} />
              </>
            )}
          </div>

          {(readOnly || (isEdit && !isOwnProfile && currentUserPermissions?.userUpdate && currentUserPermissions?.userDelete)) && (
            <div>
              <label className="block text-gray-700 mb-2">Account Status</label>
              {readOnly ? (
                <div className={readOnlyBoxClass}>{statusLabel}</div>
              ) : (
                <div className="relative">
                  <select
                    {...register('status')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white pr-8 cursor-pointer"
                  >
                    {userStatus?.map(status => (
                      <option key={status.key} value={status.key}>{titleCase(status.label)}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Role & Permissions */}
      <div className="space-y-4">
        <h3>Role & Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="block text-gray-700 mb-2">System Role {!readOnly && <span className="text-red-500">*</span>}</label>
            {readOnly ? (
              <div className={readOnlyBoxClass}>{roleLabel}</div>
            ) : (
              <>
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
              </>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Department Access {!readOnly && <span className="text-red-500">*</span>}</label>
            {readOnly ? (
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedDeptNames.length === 0 ? (
                  <p className="text-sm text-gray-500">N/A</p>
                ) : (
                  selectedDeptNames.map((name) => (
                    <span key={name} className="px-3 py-1 bg-primary text-white rounded-full text-xs text-medium text-center">
                      {name}
                    </span>
                  ))
                )}
              </div>
            ) : (
              <>
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
                            className="w-4 h-4 text-primary rounded"
                          />
                          <span className="text-gray-700">{dept.departmentName}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <ErrorMsg message={errors.deptAccessIds?.message} />
              </>
            )}
          </div>

        </div>
      </div>

      {/* Contract Access */}
      <div className="space-y-4">
        <h3>
          Contract Access
          {!readOnly && <> (Select at least one) <span className="text-red-500">*</span></>}
        </h3>
        {readOnly ? (
          renderPermissionTags(formData.contractPermissionIds, contractItems, 'CONTRACT')
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center space-x-2">
                <input type="checkbox" checked={allContractOn} onChange={onAllContract} className="w-4 h-4 text-primary border-gray-300 rounded cursor-pointer" />
                <span className="text-gray-700">Full Access</span>
              </label>
              {contractItems.map(perm => (
                <label key={perm.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.contractPermissionIds.includes(perm.id)}
                    onChange={() => onContractToggle(perm.id)}
                    className="w-4 h-4 text-primary border-gray-300 rounded cursor-pointer"
                  />
                  <span className="text-gray-700">{formatPermissionLabel(perm.name, 'CONTRACT')}</span>
                </label>
              ))}
            </div>
            <ErrorMsg message={errors.contractPermissionIds?.message} />
          </>
        )}
      </div>

      {/* User Access */}
      <div className="space-y-4">
        <h3>User Access</h3>
        {readOnly ? (
          renderPermissionTags(formData.userPermissionIds, userItems, 'USER')
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={allUserOn}
                  onChange={onAllUser}
                  className="w-4 h-4 text-primary border-gray-300 rounded cursor-pointer"
                />
                <span className="text-gray-700">Full Access</span>
              </label>
              {userItems.map(perm => (
                <label key={perm.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.userPermissionIds.includes(perm.id) ?? false}
                    onChange={() => onUserToggle(perm.id)}
                    className="w-4 h-4 text-primary border-gray-300 rounded cursor-pointer"
                  />
                  <span className="text-gray-700">{formatPermissionLabel(perm.name, 'USER')}</span>
                </label>
              ))}
            </div>
            <ErrorMsg message={errors.userPermissionIds?.message} />
          </>
        )}
      </div>
    </div>
  );
}