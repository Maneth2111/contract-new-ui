import {
  mockContracts,
  mockContractTypes,
  mockDepartments,
  mockPartners,
  mockRoles,
  mockUsers,
  type Contract,
  type ContractType,
  type Department,
  type Partner,
  type Role,
  type User,
} from '../data/mockData'

let nextContractId = Math.max(...mockContracts.map((c) => c.contractId), 0) + 1
let nextPartnerId = Math.max(...mockPartners.map((p) => p.partnerId), 0) + 1
let nextUserId = Math.max(...mockUsers.map((u) => u.userId), 0) + 1
let nextAlertId = 1

export const store = {
  contracts: structuredClone(mockContracts) as Contract[],
  contractTypes: structuredClone(mockContractTypes) as ContractType[],
  departments: structuredClone(mockDepartments) as Department[],
  partners: structuredClone(mockPartners) as Partner[],
  roles: structuredClone(mockRoles) as Role[],
  users: structuredClone(mockUsers) as User[],
  alerts: [] as {
    alertId: number
    contractId: number
    alertType: string
    alertDate: string
    daysBeforeExpiry?: number
    isTriggered: boolean
    remark: string
  }[],
  files: [] as {
    fileId: number
    contractId: number
    fileName: string
    fileUrl: string
    fileSize: number
    contentType: string
    uploadedAt: string
    uploadedBy: number
    uploadedByName: string
  }[],
  history: [] as {
    historyId: number
    contractId: number
    actionType: 'CREATED' | 'MODIFIED' | 'DELETED'
    oldValue: Record<string, unknown> | null
    newValue: Record<string, unknown> | null
    actionDate: string
    actionBy: { userId: number; fullName: string }
  }[],
}

export const idGen = {
  nextContractId: () => nextContractId++,
  nextPartnerId: () => nextPartnerId++,
  nextUserId: () => nextUserId++,
  nextAlertId: () => nextAlertId++,
  nextFileId: () => store.files.length + 1,
  nextHistoryId: () => store.history.length + 1,
}
