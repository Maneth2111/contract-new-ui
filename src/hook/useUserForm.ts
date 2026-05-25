import { useEffect, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { editUserSchema, userSchema } from '../lib/userSchema';
import { UserFormValues } from "../types/user";
import { getAllDepartment, Department } from '../services/departmentService';
import { useRoles } from './useRoles';
import { usePermissions } from './usePermissions';
import { sortPermissionsByAction } from '../utils/permissionLabels';

export function useUserForm(
  defaultValues: UserFormValues,
  options?: { isEdit?: boolean }
) {
  const isEdit = Boolean(options?.isEdit)
  const schema = isEdit ? editUserSchema : userSchema
  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema) as Resolver<UserFormValues>,
    defaultValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const { setValue, watch } = form;
  const formData = watch();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [depAccess, setDepAccess] = useState(false);
  const permissionRef = useRef<HTMLDivElement>(null);

  const { roles } = useRoles();
  const { permissionsMap } = usePermissions();

  useEffect(() => {
    getAllDepartment()
      .then(data => setDepartments(data.items))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (permissionRef.current && !permissionRef.current.contains(e.target as Node))
        setDepAccess(false);
    };
    if (depAccess) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [depAccess]);

  const contractItems = sortPermissionsByAction(
    (permissionsMap['CONTRACT'] ?? []).map(p => ({ ...p, id: Number(p.id) })),
    'CONTRACT',
  );
  const userItems = sortPermissionsByAction(
    (permissionsMap['USER'] ?? []).map(p => ({ ...p, id: Number(p.id) })),
    'USER',
  );

  const allContractOn = contractItems.length > 0 && contractItems.every(p => formData.contractPermissionIds.includes(p.id));
  const allUserOn = userItems.length > 0 && userItems.every(p => formData.userPermissionIds.includes(p.id));

  const selectedDeptNames = departments
    .filter(d => formData.deptAccessIds.includes(d.departmentId))
    .map(d => d.departmentName);

  const deptAccessLabel =
    selectedDeptNames.length === 0 ? 'Select Department Access'
    : selectedDeptNames.length > 1 ? `${selectedDeptNames.slice(0, 1).join(', ')} +${selectedDeptNames.length - 1} more`
    : selectedDeptNames.join(', ');

  const onDeptAccessToggle = (deptId: number) => {
    const current = formData.deptAccessIds;
    setValue(
      'deptAccessIds',
      current.includes(deptId) ? current.filter(x => x !== deptId) : [...current, deptId],
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const onContractToggle = (id: number) => {
    const current = formData.contractPermissionIds;
    setValue(
      'contractPermissionIds',
      current.includes(id) ? current.filter(x => x !== id) : [...current, id],
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const onAllContract = () => {
    const allIds = contractItems.map(p => p.id);
    setValue(
      'contractPermissionIds',
      allIds.every(id => formData.contractPermissionIds.includes(id)) ? [] : allIds,
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const onUserToggle = (id: number) => {
    const current = formData.userPermissionIds;
    setValue(
      'userPermissionIds',
      current.includes(id) ? current.filter(x => x !== id) : [...current, id],
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const onAllUser = () => {
    const allIds = userItems.map(p => p.id);
    setValue(
      'userPermissionIds',
      allIds.every(id => formData.userPermissionIds.includes(id)) ? [] : allIds,
      { shouldDirty: true, shouldValidate: true }
    );
  };

  return {
    form,
    isEdit,
    departments,
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
  };
}