import type { User } from '../types/user'

export const userTableSortAccessors: Record<string, (u: User) => string> = {
  employeeId: (u) => u.employeeId,
  fullName: (u) => u.fullName,
  email: (u) => u.email,
  department: (u) => u.department,
  role: (u) => u.role,
  status: (u) => u.status,
}
