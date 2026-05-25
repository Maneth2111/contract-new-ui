import { titleCase } from 'text-case'

export type PermissionGroup = 'CONTRACT' | 'USER'

const ACTION_SORT: Record<string, number> = {
  CREATE: 1,
  READ: 2,
  UPDATE: 3,
  DELETE: 4,
}


export function formatPermissionLabel (permissionName: string, group: PermissionGroup): string {
  const groupLabel = group === 'CONTRACT' ? 'Contract' : 'User'
  const prefix = `${group}_`
  const upper = permissionName.toUpperCase()
  const actionPart = upper.startsWith(prefix)
    ? permissionName.slice(prefix.length)
    : permissionName

  const action = titleCase(actionPart.replace(/_/g, ' ').toLowerCase())
  return `${action} ${groupLabel}`
}

export function sortPermissionsByAction<T extends { name: string }> (
  items: T[],
  group: PermissionGroup,
): T[] {
  const prefix = `${group}_`
  return [...items].sort((a, b) => {
    const key = (name: string) => {
      const u = name.toUpperCase()
      return u.startsWith(prefix) ? u.slice(prefix.length) : u
    }
    return (ACTION_SORT[key(a.name)] ?? 99) - (ACTION_SORT[key(b.name)] ?? 99)
  })
}
