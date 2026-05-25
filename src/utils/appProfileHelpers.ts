import type { UserProfile } from '../services/userService'

export type ApplyTokenSource = 'teams' | 'password'

export type ApplyTokenResult =
  | { ok: true }
  | { ok: false; reason: 'unregistered'; email: string; message?: string }
  | { ok: false; reason: 'server_down'; message?: string }
  | { ok: false; reason: 'invalid' | 'other' }

export type PermissionFlags = {
  contractCreate: boolean
  contractRead: boolean
  contractUpdate: boolean
  contractDelete: boolean
  userCreate: boolean
  userRead: boolean
  userUpdate: boolean
  userDelete: boolean
}

const EMPTY_PERMISSIONS: PermissionFlags = {
  contractCreate: false,
  contractRead: false,
  contractUpdate: false,
  contractDelete: false,
  userCreate: false,
  userRead: false,
  userUpdate: false,
  userDelete: false,
}


export function isTeamsUserNotRegisteredError (error: unknown, teamsContext: boolean): boolean {
  const err = error as {
    response?: { status?: number; data?: { message?: string } }
  }
  const status = err.response?.status
  const msg = String(err.response?.data?.message ?? '').toLowerCase()

  if (status === 404 || status === 403) return true
  if (
    /not\s*found|not\s*registered|unknown\s*user|no\s*such\s*user|does\s*not\s*exist|not\s*provisioned|user\s*not\s*(found|exist)|no\s*account|access\s*denied/i.test(
      msg
    )
  ) {
    return true
  }
  if (teamsContext && status === 401) return true
  return false
}

export function getPermissionFlagsFromUser (user: UserProfile | null): PermissionFlags {
  if (!user) return { ...EMPTY_PERMISSIONS }

  const permNames = Object.values(user.permissions ?? {})
    .flat()
    .map((p) => p.name)

  return {
    contractCreate: permNames.includes('CONTRACT_CREATE'),
    contractRead: permNames.includes('CONTRACT_READ'),
    contractUpdate: permNames.includes('CONTRACT_UPDATE'),
    contractDelete: permNames.includes('CONTRACT_DELETE'),
    userCreate: permNames.includes('USER_CREATE'),
    userRead: permNames.includes('USER_READ'),
    userUpdate: permNames.includes('USER_UPDATE'),
    userDelete: permNames.includes('USER_DELETE'),
  }
}

// Used by contract list filtering for confidential rows
export function userHasConfidentialContractAccess (user: UserProfile | null): boolean {
  return (
    user?.confidentialAccess === true ||
    (user?.roles?.some((r) => r.name === 'ROLE_ADMINISTRATOR') ?? false)
  )
}

export function getApiErrorMessage (error: unknown): string | undefined {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
}
