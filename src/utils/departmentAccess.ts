import type { Department } from '../services/departmentService'

export type ModuleAccessItem = { id: number; name: string }

export function getAllowedDepartments(
  departmentList: Department[],
  moduleAccess: ModuleAccessItem[] | null | undefined
) {
  const access = Array.isArray(moduleAccess) ? moduleAccess : []

  if (access.length === 0) {
    return {
      allowedDepartments: departmentList,
      hasRestrictedAccess: false,
      isSingleDepartment: false,
      defaultDepartmentId: undefined as number | undefined,
    }
  }

  const accessIds = new Set(access.map((a) => Number(a.id)).filter((id) => Number.isFinite(id)))
  const allowed = departmentList.filter((d) => accessIds.has(Number(d.departmentId)))

  // ← If departmentList hasn't loaded yet, allowed is [].
  // Treat it as not-yet-resolved instead of "restricted with no departments".
  if (allowed.length === 0) {
    return {
      allowedDepartments: [],
      hasRestrictedAccess: false,
      isSingleDepartment: false,
      defaultDepartmentId: undefined as number | undefined,
    }
  }

  const isSingleDepartment = allowed.length === 1
  return {
    allowedDepartments: allowed,
    hasRestrictedAccess: true,
    isSingleDepartment,
    defaultDepartmentId: isSingleDepartment ? allowed[0]?.departmentId : undefined,
  }
}