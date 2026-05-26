import {
  getContractById as findContract,
  getContractTypesByDepartment,
  getUserDetailById,
  mockAlertTypeListResponse,
  mockContractStatusListResponse,
  mockContractsByDepartmentResponse,
  mockContractTypeListResponse,
  mockDepartmentListResponse,
  mockPermissionsResponse,
  mockRoleListResponse,
  mockUserDetail,
  mockUserStatusListResponse,
  paginate,
  type Contract,
  type ContractStatus,
  type PermissionName,
} from '../data/mockData'
import { idGen, store } from './mockStore'
import { mockDelay } from './mockDelay'

type MockConfig = { params?: Record<string, unknown>; data?: unknown }

const ts = () => new Date().toISOString()

const ok = <T>(payload: T, message = 'Success') => ({
  success: true,
  message,
  status: '200 OK',
  payload,
  timestamps: ts(),
})

/** Backend uses 0-based `page`; mockData.paginate uses 1-based page */
const paginateApi = <T>(items: T[], pageParam: unknown, sizeParam: unknown) => {
  const size = Number(sizeParam ?? 10)
  const zeroBasedPage = Math.max(0, Number(pageParam ?? 0))
  const { items: pageItems, pagination } = paginate(items, zeroBasedPage + 1, size)
  return {
    items: pageItems,
    paginationResponse: { ...pagination, page: zeroBasedPage },
  }
}

const filterBySearch = <T>(items: T[], search: string | undefined, keys: (keyof T)[]) => {
  if (!search?.trim()) return items
  const q = search.trim().toLowerCase()
  return items.filter((item) =>
    keys.some((k) => String(item[k] ?? '').toLowerCase().includes(q))
  )
}

const toStatusEnum = (status: string) =>
  status.trim().toUpperCase().replace(/\s+/g, '_')

const mapUserToApi = (u: (typeof store.users)[0]) => ({
  userId: u.userId,
  fullName: u.fullName,
  employeeId: u.employeeId,
  email: u.email,
  phoneNumber: u.phoneNumber ?? '',
  jobTitle: u.jobTitle ?? '',
  status: u.status,
  department: u.department,
  roles: u.roles,
  moduleAccess: u.moduleAccess,
  permissions: {
    CONTRACT: u.permissions.filter((p) => p.name.startsWith('CONTRACT_')),
    USER: u.permissions.filter((p) => p.name.startsWith('USER_')),
  },
  audit: u.audit,
  plainTextPassword: u.userId === 1 ? 'CCF@2025' : '',
})

const currentUserProfile = () => ({
  id: mockUserDetail.userId,
  employeeId: mockUserDetail.employeeId,
  fullName: mockUserDetail.fullName,
  email: mockUserDetail.email,
  jobTitle: mockUserDetail.jobTitle,
  phoneNumber: mockUserDetail.phoneNumber,
  status: mockUserDetail.status,
  department: mockUserDetail.department.departmentName,
  confidentialAccess: true,
  moduleAccess: mockUserDetail.moduleAccess,
  permissions: mockUserDetail.permissions,
  roles: mockUserDetail.roles,
})

const dashboardSummary = () => {
  const counts = { ACTIVE: 0, EXPIRING_SOON: 0, EXPIRED: 0, OVERDUE: 0, DRAFT: 0 }
  let totalValue = 0
  for (const c of store.contracts) {
    const s = c.status as keyof typeof counts
    if (s in counts) counts[s]++
    totalValue += c.contractValue
  }
  return {
    activeContracts: counts.ACTIVE,
    closedContracts: 0,
    contractOwners: new Set(store.contracts.map((c) => c.personInCharge)).size,
    expiringSoon90Days: store.contracts.filter((c) => c.remainingDays <= 90 && c.remainingDays > 0).length,
    overdueContracts: counts.OVERDUE,
    totalContractValue: totalValue,
    totalContracts: store.contracts.length,
    totalPartners: store.partners.length,
  }
}

const statusDistribution = () => {
  const counts = { active: 0, expiringSoon: 0, expired: 0, overdue: 0, closed: 0 }
  for (const c of store.contracts) {
    if (c.status === 'ACTIVE') counts.active++
    else if (c.status === 'EXPIRING_SOON') counts.expiringSoon++
    else if (c.status === 'EXPIRED') counts.expired++
    else if (c.status === 'OVERDUE') counts.overdue++
  }
  return counts
}

const upcomingExpirations = () => {
  const byMonth: Record<string, number> = {}
  for (const c of store.contracts) {
    const month = c.expireDate.slice(0, 7)
    byMonth[month] = (byMonth[month] ?? 0) + 1
  }
  return Object.entries(byMonth).map(([month, count]) => ({ month, count }))
}

const notificationAlertType = (remainingDays: number): string => {
  if (remainingDays <= 30) return '30days'
  if (remainingDays <= 60) return '60days'
  return '90days'
}

const notificationPayload = (overduePage = 1, overdueSize = 10, expireSoonPage = 1, expireSoonSize = 10) => {
  const toNotif = (c: Contract) => ({
    alertDate: c.expireDate,
    alertType:
      c.status === 'OVERDUE' || c.remainingDays < 0
        ? 'OVERDUE_ALERT'
        : notificationAlertType(c.remainingDays),
    contractCode: c.contractCode,
    contractId: c.contractId,
    contractTitle: c.contractTitle,
    daysRemaining: c.remainingDays,
    status: c.status,
    departmentName: c.department.departmentName,
    expireDate: c.expireDate,
    personInCharge: c.personInCharge,
    remark: c.remark,
    partners: c.partners,
  })
  const overdue = store.contracts.filter(
    (c) => c.status === 'OVERDUE' || c.remainingDays < 0
  )
  const expireSoon = store.contracts.filter(
    (c) => c.status === 'EXPIRING_SOON' && c.remainingDays >= 0
  )
  const overduePaginated = paginate(overdue.map(toNotif), overduePage, overdueSize)
  const expirePaginated = paginate(expireSoon.map(toNotif), expireSoonPage, expireSoonSize)
  return {
    expireSoonContracts: {
      items: expirePaginated.items,
      paginationResponse: expirePaginated.pagination,
    },
    overdueContracts: {
      items: overduePaginated.items,
      paginationResponse: overduePaginated.pagination,
    },
    summary: {
      expire30: expireSoon.filter((c) => c.remainingDays <= 30).length,
      expire60: expireSoon.filter((c) => c.remainingDays <= 60).length,
      expire90: expireSoon.filter((c) => c.remainingDays <= 90).length,
      overdue: overdue.length,
    },
  }
}

const contractReports = (params: MockConfig['params'] = {}) => {
  const page = Number(params?.page ?? 1)
  const size = Number(params?.size ?? 10)
  let items = store.contracts.map((c) => ({
    contractId: c.contractId,
    contractCode: c.contractCode,
    title: c.contractTitle,
    department: c.department.departmentName,
    personInCharge: c.personInCharge,
    partner: c.partners.map((p) => p.partnerName).join(', '),
    effectiveDate: c.effectiveDate,
    expiryDate: c.expireDate,
    status: c.status,
    contractValue: c.contractValue,
  }))
  if (params?.departmentId) {
    items = items.filter(
      (i) =>
        store.contracts.find((c) => c.contractId === i.contractId)?.department.departmentId ===
        Number(params.departmentId)
    )
  }
  if (params?.status) {
    const st = toStatusEnum(String(params.status))
    items = items.filter((i) => i.status === st)
  }
  if (params?.search) {
    const q = String(params.search).toLowerCase()
    items = items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.contractCode.toLowerCase().includes(q) ||
        i.personInCharge.toLowerCase().includes(q)
    )
  }
  const paged = paginate(items, page, size)
  const summary = {
    active: store.contracts.filter((c) => c.status === 'ACTIVE').length,
    expiringSoon: store.contracts.filter((c) => c.status === 'EXPIRING_SOON').length,
    totalContracts: store.contracts.length,
    totalValue: store.contracts.reduce((s, c) => s + c.contractValue, 0),
    closed: 0,
  }
  return { summary, data: { items: paged.items, paginationResponse: paged.pagination } }
}

export async function handleMockRequest(
  method: string,
  url: string,
  config?: MockConfig
): Promise<{ data: unknown; status: number }> {
  await mockDelay()
  const path = url.split('?')[0].replace(/\/+$/, '')
  const params = config?.params ?? {}
  const body = config?.data

  // Auth
  if (method === 'POST' && path.endsWith('/auths/login')) {
    return {
      status: 200,
      data: ok({
        token: 'mock-jwt-token',
        mustChangePassword: false,
        user: { id: 1, username: 'ponlouer.ouy@chokchey.com.kh', fullName: 'Ouy Ponlouer', role: 'ROLE_ADMINISTRATOR' },
      }, 'Login successful'),
    }
  }
  if (method === 'POST' && path.endsWith('/auths/change-password')) {
    return { status: 200, data: ok(null, 'Password changed successfully') }
  }
  if (method === 'GET' && path.endsWith('/auths/me')) {
    return { status: 200, data: ok(currentUserProfile(), 'Current user fetched') }
  }

  // Enums
  if (method === 'GET' && path.endsWith('/enums/contract-status')) {
    return { status: 200, data: mockContractStatusListResponse }
  }
  if (method === 'GET' && path.endsWith('/enums/user-status')) {
    return { status: 200, data: mockUserStatusListResponse }
  }
  if (method === 'GET' && path.endsWith('/enums/alert-type')) {
    return { status: 200, data: mockAlertTypeListResponse }
  }

  // Departments
  if (method === 'GET' && path === '/departments') {
    const page = Number(params.page ?? 1)
    const size = Number(params.size ?? 10)
    const paged = paginate(store.departments, page, size)
    return {
      status: 200,
      data: ok({ items: paged.items, paginationResponse: paged.pagination }, mockDepartmentListResponse.message),
    }
  }
  const deptMatch = path.match(/^\/departments\/(\d+)$/)
  if (deptMatch && method === 'GET') {
    const dept = store.departments.find((d) => d.departmentId === Number(deptMatch[1]))
    if (!dept) return { status: 404, data: { success: false, message: 'Department not found' } }
    return { status: 200, data: ok(dept) }
  }

  // Contract types
  if (method === 'GET' && path === '/contract-types') {
    return { status: 200, data: mockContractTypeListResponse }
  }
  const ctMatch = path.match(/^\/contract-types\/(\d+)$/)
  if (ctMatch && method === 'GET') {
    const ct = store.contractTypes.find((t) => t.contractTypeId === Number(ctMatch[1]))
    if (!ct) return { status: 404, data: { success: false, message: 'Not found' } }
    return { status: 200, data: ok(ct) }
  }

  // Roles
  if (method === 'GET' && path === '/roles') {
    const page = Number(params.page ?? 1)
    const size = Number(params.size ?? 10)
    const paged = paginate(store.roles, page, size)
    return { status: 200, data: ok({ items: paged.items, paginationResponse: paged.pagination }, mockRoleListResponse.message) }
  }

  // Permissions
  if (method === 'GET' && path === '/users/permissions') {
    return { status: 200, data: mockPermissionsResponse }
  }

  // Partners
  if (method === 'GET' && path === '/partners') {
    const page = Number(params.page ?? 1)
    const size = Number(params.size ?? 10)
    let items = [...store.partners]
    items = filterBySearch(items, params.search as string | undefined, ['partnerName', 'contactPerson'])
    const paged = paginate(items, page, size)
    return { status: 200, data: ok({ items: paged.items, paginationResponse: paged.pagination }) }
  }
  const partnerMatch = path.match(/^\/partners\/(\d+)$/)
  if (partnerMatch) {
    const id = Number(partnerMatch[1])
    if (method === 'GET') {
      const p = store.partners.find((x) => x.partnerId === id)
      if (!p) return { status: 404, data: { success: false, message: 'Partner not found' } }
      return { status: 200, data: ok(p) }
    }
    if (method === 'PUT' && body) {
      const idx = store.partners.findIndex((x) => x.partnerId === id)
      if (idx >= 0) store.partners[idx] = { ...store.partners[idx], ...(body as object) }
      return { status: 200, data: ok(store.partners[idx]) }
    }
    if (method === 'DELETE') {
      store.partners = store.partners.filter((x) => x.partnerId !== id)
      return { status: 200, data: ok(null, 'Partner deleted') }
    }
  }
  if (method === 'POST' && path === '/partners') {
    const req = body as { partnerName: string; contactPerson: string; contactNumber: string }
    const created = { partnerId: idGen.nextPartnerId(), ...req }
    store.partners.push(created)
    return { status: 200, data: ok(created, 'Partner created') }
  }

  // Contracts
  if (method === 'GET' && path === '/contracts') {
    const page = Number(params.page ?? 1)
    const size = Number(params.size ?? 10)
    let items = [...store.contracts]
    if (params.departmentId) {
      items = items.filter((c) => c.department.departmentId === Number(params.departmentId))
    }
    if (params.status) {
      items = items.filter((c) => c.status === toStatusEnum(String(params.status)))
    }
    items = filterBySearch(items, params.search as string | undefined, ['contractTitle', 'contractCode', 'personInCharge'])
    const paged = paginate(items, page, size)
    return { status: 200, data: ok({ items: paged.items, paginationResponse: paged.pagination }) }
  }
  const contractMatch = path.match(/^\/contracts\/(\d+)$/)
  if (contractMatch) {
    const id = Number(contractMatch[1])
    if (method === 'GET') {
      const c = store.contracts.find((x) => x.contractId === id) ?? findContract(id)
      if (!c) return { status: 404, data: { success: false, message: 'Contract not found' } }
      return { status: 200, data: ok(c) }
    }
    if (method === 'PUT' && body) {
      const idx = store.contracts.findIndex((x) => x.contractId === id)
      const req = body as Record<string, unknown>
      const dept = store.departments.find((d) => d.departmentId === Number(req.departmentId))
      const ctype = store.contractTypes.find((t) => t.contractTypeId === Number(req.contractTypeId))
      if (idx >= 0 && dept && ctype) {
        store.contracts[idx] = {
          ...store.contracts[idx],
          contractTitle: String(req.contractTitle ?? store.contracts[idx].contractTitle),
          personInCharge: String(req.personInCharge ?? ''),
          contractTerm: String(req.contractTerm ?? ''),
          effectiveDate: String(req.effectiveDate ?? ''),
          expireDate: String(req.expireDate ?? ''),
          renewalFrequencyMonths: Number(req.renewalFrequencyMonths ?? 0),
          contractValue: Number(req.contractValue ?? 0),
          status: String(req.status ?? store.contracts[idx].status) as ContractStatus,
          remark: String(req.remark ?? ''),
          department: dept,
          contractType: ctype,
          partners: (req.partners as Contract['partners']) ?? store.contracts[idx].partners,
        }
      }
      return { status: 200, data: ok(store.contracts[idx]) }
    }
    if (method === 'DELETE') {
      store.contracts = store.contracts.filter((x) => x.contractId !== id)
      return { status: 200, data: ok(null, 'Contract deleted successfully') }
    }
  }
  if (method === 'POST' && path === '/contracts') {
    const req = body as Record<string, unknown>
    const dept = store.departments.find((d) => d.departmentId === Number(req.departmentId))!
    const ctype = store.contractTypes.find((t) => t.contractTypeId === Number(req.contractTypeId))!
    const newContract: Contract = {
      contractId: idGen.nextContractId(),
      contractCode: `CCF-2026-${String(idGen.nextContractId()).padStart(3, '0')}`,
      contractTitle: String(req.contractTitle),
      personInCharge: String(req.personInCharge),
      contractTerm: String(req.contractTerm ?? ''),
      effectiveDate: String(req.effectiveDate),
      expireDate: String(req.expireDate),
      renewalFrequencyMonths: Number(req.renewalFrequencyMonths),
      contractValue: Number(req.contractValue),
      alertDays: null,
      remark: String(req.remark ?? ''),
      remainingDays: 90,
      status: String(req.status ?? 'ACTIVE') as ContractStatus,
      createdBy: 1,
      department: dept,
      contractType: ctype,
      partners: (req.partners as Contract['partners']) ?? [],
      alerts: null,
    }
    store.contracts.unshift(newContract)
    return { status: 200, data: ok(newContract, 'Contract created') }
  }

  // Contract files
  const filesMatch = path.match(/^\/contracts\/(\d+)\/files$/)
  if (filesMatch) {
    const contractId = Number(filesMatch[1])
    if (method === 'GET') {
      const uploader = currentUserProfile()
      const files = store.files
        .filter((f) => f.contractId === contractId)
        .map((f) => ({
          ...f,
          uploadedByName:
            f.uploadedBy === uploader.id ? uploader.fullName : f.uploadedByName,
        }))
      return { status: 200, data: ok(files) }
    }
    if (method === 'POST') {
      const uploader = currentUserProfile()
      const uploaded = {
        fileId: idGen.nextFileId(),
        contractId,
        fileName: 'mock-upload.pdf',
        fileUrl: '#',
        fileSize: 1024,
        contentType: 'application/pdf',
        uploadedAt: ts(),
        uploadedBy: uploader.id,
        uploadedByName: uploader.fullName,
      }
      store.files.push(uploaded)
      return { status: 200, data: ok([uploaded]) }
    }
  }
  const fileItemMatch = path.match(/^\/contracts\/(\d+)\/files\/(\d+)$/)
  if (fileItemMatch && method === 'DELETE') {
    const [, cId, fId] = fileItemMatch
    store.files = store.files.filter(
      (f) => !(f.contractId === Number(cId) && f.fileId === Number(fId))
    )
    return { status: 200, data: ok(null, 'File deleted') }
  }
  const fileDownloadMatch = path.match(/^\/contracts\/(\d+)\/files\/(\d+)\/download$/)
  if (fileDownloadMatch && method === 'GET') {
    return { status: 200, data: new Blob(['Mock file content'], { type: 'application/pdf' }) }
  }

  // Contract history
  const historyMatch = path.match(/^\/contracts\/(\d+)\/history$/)
  if (historyMatch && method === 'GET') {
    const contractId = Number(historyMatch[1])
    const page = Number(params.page ?? 1)
    const size = Number(params.size ?? 10)
    let items = store.history.filter((h) => h.contractId === contractId)
    if (items.length === 0) {
      items = [{
        historyId: 1,
        contractId,
        actionType: 'CREATED',
        oldValue: null,
        newValue: null,
        actionDate: ts(),
        actionBy: { userId: 1, fullName: 'Ouy Ponlouer' },
      }]
    }
    const paged = paginate(items, page, size)
    return { status: 200, data: ok({ items: paged.items, paginationResponse: paged.pagination }) }
  }

  // Users (GET /users uses 0-based page from useUser.ts)
  if (method === 'GET' && path === '/users') {
    let items = store.users.map(mapUserToApi)
    if (params.status) items = items.filter((u) => u.status === params.status)
    if (params.departmentId) {
      items = items.filter((u) => u.department?.departmentId === Number(params.departmentId))
    }
    if (params.role) {
      const role = String(params.role)
      items = items.filter((u) =>
        u.roles.some((r) => r.name === role || String(r.id) === role)
      )
    }
    if (params.search) {
      const q = String(params.search).toLowerCase()
      items = items.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.employeeId.toLowerCase().includes(q)
      )
    }
    const paged = paginateApi(items, params.page, params.size)
    return {
      status: 200,
      data: ok({
        summary: {
          total_users: store.users.length,
          active_users: store.users.filter((u) => u.status === 'ACTIVE').length,
          inactive_users: store.users.filter((u) => u.status === 'INACTIVE').length,
          administrators: store.users.filter((u) => u.roles.some((r) => r.name === 'ROLE_ADMINISTRATOR')).length,
        },
        users: { items: paged.items, paginationResponse: paged.paginationResponse },
      }),
    }
  }
  const userMatch = path.match(/^\/users\/(\d+)$/)
  if (userMatch) {
    const id = Number(userMatch[1])
    if (method === 'GET') {
      const res = getUserDetailById(id)
      if (!res.success) return { status: 404, data: res }
      const apiUser = {
        ...res.payload,
        permissions: res.payload.permissions,
        plainTextPassword: res.payload.plainTextPassword ?? '',
      }
      return { status: 200, data: { ...res, payload: apiUser } }
    }
    if (method === 'PUT') {
      return { status: 200, data: ok(mapUserToApi(store.users.find((u) => u.userId === id)!)) }
    }
    if (method === 'DELETE') {
      store.users = store.users.filter((u) => u.userId !== id)
      return { status: 200, data: ok(null, 'User deleted') }
    }
  }
  if (method === 'POST' && path === '/users') {
    const req = body as Record<string, unknown>
    const dept = store.departments.find((d) => d.departmentId === Number(req.departmentId))
    const newUser = {
      userId: idGen.nextUserId(),
      fullName: String(req.fullName),
      employeeId: String(req.employeeId),
      email: String(req.email),
      phoneNumber: String(req.phoneNumber ?? ''),
      jobTitle: String(req.jobTitle ?? ''),
      status: String(req.status ?? 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
      moduleAccess: store.departments
        .filter((d) => (req.moduleDepartmentIds as number[])?.includes(d.departmentId))
        .map((d) => ({ id: d.departmentId, name: d.departmentName })),
      department: { departmentId: dept?.departmentId ?? 1, departmentName: dept?.departmentName ?? '' },
      roles: store.roles
        .filter((r) => (req.roleIds as number[])?.includes(r.roleId))
        .map((r) => ({ id: r.roleId, name: r.roleName })),
      permissions: store.users[0]?.permissions ?? [],
      audit: {
        createdBy: 'Ouy Ponlouer',
        createdByEmail: 'ponlouer.ouy@chokchey.com.kh',
        createdDateTime: ts(),
        lastUpdatedBy: null,
        lastUpdatedByEmail: null,
        lastUpdatedDateTime: null,
      },
    }
    store.users.unshift(newUser)
    return { status: 200, data: ok(mapUserToApi(newUser)) }
  }

  // Alerts
  if (method === 'GET' && path.match(/^\/alerts\/contract\/\d+$/)) {
    const contractId = Number(path.split('/').pop())
    return { status: 200, data: ok(store.alerts.filter((a) => a.contractId === contractId)) }
  }
  const alertMatch = path.match(/^\/alerts\/(\d+)$/)
  if (alertMatch) {
    const id = Number(alertMatch[1])
    if (method === 'GET') {
      const a = store.alerts.find((x) => x.alertId === id)
      if (!a) return { status: 404, data: { success: false, message: 'Alert not found' } }
      return { status: 200, data: ok(a) }
    }
    if (method === 'PUT' && body) {
      const idx = store.alerts.findIndex((x) => x.alertId === id)
      if (idx >= 0) store.alerts[idx] = { ...store.alerts[idx], ...(body as object) }
      return { status: 200, data: ok(store.alerts[idx]) }
    }
    if (method === 'DELETE') {
      store.alerts = store.alerts.filter((x) => x.alertId !== id)
      return { status: 200, data: ok(null, 'Alert deleted') }
    }
  }
  if (method === 'POST' && path === '/alerts') {
    const req = body as { contractId: number; alertType: string; daysBeforeExpiry: number; remark?: string }
    const created = {
      alertId: idGen.nextAlertId(),
      contractId: req.contractId,
      alertType: req.alertType,
      alertDate: new Date().toISOString().slice(0, 10),
      daysBeforeExpiry: req.daysBeforeExpiry,
      isTriggered: false,
      remark: req.remark ?? '',
    }
    store.alerts.push(created)
    return { status: 200, data: ok(created) }
  }

  // Dashboard
  if (method === 'GET' && path.endsWith('/dashboard/summary')) {
    return { status: 200, data: ok(dashboardSummary()) }
  }
  if (method === 'GET' && path.endsWith('/dashboard/contracts-by-department')) {
    return { status: 200, data: mockContractsByDepartmentResponse }
  }
  if (method === 'GET' && path.endsWith('/dashboard/upcoming-expirations')) {
    return { status: 200, data: ok(upcomingExpirations()) }
  }
  if (method === 'GET' && path.endsWith('/dashboard/status-distribution')) {
    return { status: 200, data: ok(statusDistribution()) }
  }

  // Notifications
  if (method === 'GET' && path === '/notifications') {
    return {
      status: 200,
      data: ok(
        notificationPayload(
          Number(params.overduePage ?? 1),
          Number(params.overdueSize ?? 10),
          Number(params.expireSoonPage ?? 1),
          Number(params.expireSoonSize ?? 10)
        )
      ),
    }
  }

  // Reports
  if (method === 'GET' && path === '/reports/contracts') {
    return { status: 200, data: ok(contractReports(params)) }
  }
  if (method === 'GET' && path.endsWith('/reports/contracts/export/pdf')) {
    return { status: 200, data: new Blob(['Mock PDF'], { type: 'application/pdf' }) }
  }

  console.warn(`[mock] Unhandled ${method} ${path}`)
  return { status: 404, data: { success: false, message: `Mock route not found: ${method} ${path}` } }
}

/** Exported for contract type filter helper used in forms */
export { getContractTypesByDepartment }
