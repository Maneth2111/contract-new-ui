import type { ApiUser } from '../services/userService'
import type { UserFormValues } from '../types/user'

interface RoleOption {
  roleId: number
  roleName: string
}

export function mapApiUserToFormValues(
  detail: ApiUser,
  roles: RoleOption[]
): UserFormValues {
  const contractIds = (detail.permissions?.['CONTRACT'] ?? []).map((p) => Number(p.id))
  const userIds = (detail.permissions?.['USER'] ?? []).map((p) => Number(p.id))
  const moduleDepartmentIds = (detail.moduleAccess ?? []).map(
    (m) => (m as { id?: number; departmentId?: number }).id ?? (m as { departmentId?: number }).departmentId ?? 0
  )

  return {
    fullName: detail.fullName,
    employeeId: detail.employeeId,
    email: detail.email,
    phoneNumber: detail.phoneNumber ?? '',
    jobTitle: detail.jobTitle ?? '',
    status: detail.status,
    departmentId: detail.department?.departmentId ?? 0,
    roleNames: (detail.roles ?? []).map((r) => {
      return roles.find((role) => role.roleId === r.id)?.roleName ?? r.name
    }),
    deptAccessIds: moduleDepartmentIds.filter(Boolean),
    contractPermissionIds: contractIds,
    userPermissionIds: userIds,
  }
}
