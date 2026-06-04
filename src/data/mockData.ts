// ============================================================
// Contract Management System – Full Mock Data (TypeScript)
// Covers: Contracts, Departments, ContractTypes, Partners,
//         Users, Roles, Permissions
// ============================================================

// ─────────────────────────────────────────────
// SHARED / PRIMITIVE TYPES
// ─────────────────────────────────────────────

export type ContractStatus = "ACTIVE" | "EXPIRING_SOON" | "OVERDUE" | "EXPIRED" | "DRAFT";
export type UserStatus = "ACTIVE" | "INACTIVE";
export type RoleName = "ROLE_ADMINISTRATOR" | "ROLE_TOP_MANAGEMENT" | "ROLE_MANAGER" | "ROLE_OFFICER";

export type ContractPermissionName =
  | "CONTRACT_CREATE"
  | "CONTRACT_READ"
  | "CONTRACT_UPDATE"
  | "CONTRACT_DELETE";

export type UserPermissionName =
  | "USER_CREATE"
  | "USER_READ"
  | "USER_UPDATE"
  | "USER_DELETE";

export type PermissionName = ContractPermissionName | UserPermissionName;

// ─────────────────────────────────────────────
// DEPARTMENT
// ─────────────────────────────────────────────

export interface Department {
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  description: string;
  msChannel: string;
  title: string;
  msWebhookUrl: string;
  msChannelUrl: string;
}

export interface DepartmentListResponse {
  success: boolean;
  message: string;
  status: string;
  payload: {
    items: Department[];
    paginationResponse: PaginationResponse;
  };
  timestamps: string;
}

// ─────────────────────────────────────────────
// CONTRACT TYPE
// ─────────────────────────────────────────────

export interface ContractType {
  contractTypeId: number;
  departmentId: number;
  contractTypeCode: string;
  contractTypeName: string;
  description: string;
}

export interface ContractTypeListResponse {
  success: boolean;
  message: string;
  status: string;
  payload: ContractType[];
  timestamps: string;
}

// ─────────────────────────────────────────────
// PARTNER
// ─────────────────────────────────────────────

export interface Partner {
  partnerId: number;
  partnerName: string;
  contactPerson: string;
  contactNumber: string;
}

// ─────────────────────────────────────────────
// CONTRACT
// ─────────────────────────────────────────────

export interface Contract {
  contractId: number;
  contractCode: string;
  contractTitle: string;
  personInCharge: string;
  contractTerm: string;
  effectiveDate: string;
  expireDate: string;
  renewalFrequencyMonths: number;
  contractValue: number;
  alertDays: number | null;
  remark: string;
  remainingDays: number;
  status: ContractStatus;
  createdBy: number;
  department: Department;
  contractType: ContractType;
  partners: Partner[];
  alerts: unknown | null;
}

export interface ContractListResponse {
  success: boolean;
  message: string;
  status: string;
  payload: {
    items: Contract[];
    paginationResponse: PaginationResponse;
  };
  timestamps: string;
}

// ─────────────────────────────────────────────
// PERMISSION & ROLE
// ─────────────────────────────────────────────

export interface Permission {
  id: number;
  name: PermissionName;
}

export interface PermissionsResponse {
  success: boolean;
  message: string;
  status: string;
  payload: {
    CONTRACT: Permission[];
    USER: Permission[];
  };
  timestamps: string;
}

export interface Role {
  roleId: number;
  roleName: RoleName;
  permissions: PermissionName[];
}

export interface RoleRef {
  id: number;
  name: RoleName;
}

export interface RoleListResponse {
  success: boolean;
  message: string;
  status: string;
  payload: {
    items: Role[];
    paginationResponse: PaginationResponse;
  };
  timestamps: string;
}

// ─────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────

export interface ModuleAccess {
  id: number;
  name: string;
}

export interface DepartmentRef {
  departmentId: number;
  departmentName: string;
}

export interface UserAudit {
  createdBy: string | null;
  createdByEmail: string | null;
  createdDateTime: string;
  lastUpdatedBy: string | null;
  lastUpdatedByEmail: string | null;
  lastUpdatedDateTime: string | null;
}

export interface User {
  userId: number;
  fullName: string;
  employeeId: string;
  email: string;
  phoneNumber: string | null;
  jobTitle: string | null;
  status: UserStatus;
  moduleAccess: ModuleAccess[];
  department: DepartmentRef;
  roles: RoleRef[];
  permissions: Permission[];
  audit: UserAudit;
}

export interface UserSummary {
  total_users: number;
  active_users: number;
  inactive_users: number;
  administrators: number;
}

export interface UserListResponse {
  success: boolean;
  message: string;
  status: string;
  payload: {
    summary: UserSummary;
    users: {
      items: User[];
      paginationResponse: PaginationResponse;
    };
  };
  timestamps: string;
}

// ─────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────

export interface PaginationResponse {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

// ══════════════════════════════════════════════
// SEED DATA
// ══════════════════════════════════════════════

// ── Departments ──────────────────────────────

export const mockDepartments: Department[] = [
  {
    departmentId: 1,
    departmentCode: "IT",
    departmentName: "IT Department",
    description: "Handles IT systems and infrastructure",
    msChannel: "Contract Management Alert",
    title: "Contract Management Alert",
    msWebhookUrl: "https://example.webhook.office.com/it",
    msChannelUrl: "https://teams.microsoft.com/it-channel",
  },
  {
    departmentId: 3,
    departmentCode: "LC",
    departmentName: "Legal and Compliance",
    description: "Description",
    msChannel: "Legal and Compliance Channel",
    title: "Legal and Compliance Department",
    msWebhookUrl: "https://example.webhook.office.com/lc",
    msChannelUrl: "https://teams.microsoft.com/lc-channel",
  },
  {
    departmentId: 5,
    departmentCode: "AM",
    departmentName: "Admin and Marketing",
    description: "Description",
    msChannel: "Admin and Marketing Channel",
    title: "Admin and Marketing",
    msWebhookUrl: "https://example.webhook.office.com/am",
    msChannelUrl: "https://teams.microsoft.com/am-channel",
  },
];

// ── Contract Types ───────────────────────────

export const mockContractTypes: ContractType[] = [
  { contractTypeId: 1,  departmentId: 1, contractTypeCode: "ITO",    contractTypeName: "Other",                                                          description: "description" },
  { contractTypeId: 2,  departmentId: 1, contractTypeCode: "ITCHDA", contractTypeName: "Cloud Hosting / Data Center Agreement",                           description: "description" },
  { contractTypeId: 5,  departmentId: 1, contractTypeCode: "ITSLA",  contractTypeName: "Software Licensing Agreement (core system, CRM, digital onboarding)", description: "description" },
  { contractTypeId: 6,  departmentId: 5, contractTypeCode: "ORAG",   contractTypeName: "Other",                                                          description: "description" },
  { contractTypeId: 7,  departmentId: 5, contractTypeCode: "MSAG",   contractTypeName: "Marketing Service Agreement",                                    description: "description" },
  { contractTypeId: 10, departmentId: 3, contractTypeCode: "LGAC",   contractTypeName: "Other",                                                          description: "description" },
  { contractTypeId: 11, departmentId: 3, contractTypeCode: "LGPA",   contractTypeName: "Partnership Agreement",                                          description: "description" },
  { contractTypeId: 12, departmentId: 3, contractTypeCode: "LGGC",   contractTypeName: "General Contract",                                               description: "description" },
  { contractTypeId: 13, departmentId: 3, contractTypeCode: "LGNDA",  contractTypeName: "Non-Disclosure Agreement",                                       description: "description" },
  { contractTypeId: 14, departmentId: 3, contractTypeCode: "LGNPa",  contractTypeName: "Plusdico Agreement",                                             description: "description" },
  { contractTypeId: 15, departmentId: 3, contractTypeCode: "LGMAE",  contractTypeName: "Morokot Agreement",                                              description: "description" },
  { contractTypeId: 16, departmentId: 5, contractTypeCode: "ADGA",   contractTypeName: "General Agreement",                                              description: "description" },
  { contractTypeId: 18, departmentId: 5, contractTypeCode: "ADLA",   contractTypeName: "Lease Agreement",                                                description: "description" },
  { contractTypeId: 22, departmentId: 1, contractTypeCode: "ITSMC",  contractTypeName: "IT Support & Maintenance Contract",                              description: "description" },
  { contractTypeId: 24, departmentId: 3, contractTypeCode: "LGAAC",  contractTypeName: "Agency Contract",                                                description: "description" },
  { contractTypeId: 25, departmentId: 3, contractTypeCode: "LGCSA",  contractTypeName: "Cozy Space Agreement",                                           description: "description" },
  { contractTypeId: 26, departmentId: 6, contractTypeCode: "CEOF",   contractTypeName: "Other",                                                          description: "description" },
  { contractTypeId: 27, departmentId: 6, contractTypeCode: "CEOOF",  contractTypeName: "CEO Office",                                                     description: "description" },
  { contractTypeId: 28, departmentId: 5, contractTypeCode: "AdPO",   contractTypeName: "Purchase Order (PO-based)",                                      description: "description" },
  { contractTypeId: 29, departmentId: 5, contractTypeCode: "ADFA",   contractTypeName: "Framework Agreement",                                            description: "description" },
  { contractTypeId: 30, departmentId: 5, contractTypeCode: "ADCC",   contractTypeName: "Construction Contract",                                          description: "description" },
  { contractTypeId: 31, departmentId: 5, contractTypeCode: "ADOC",   contractTypeName: "One-Time Contract",                                              description: "description" },
  { contractTypeId: 32, departmentId: 5, contractTypeCode: "ADFPC",  contractTypeName: "Fixed-Price Contract",                                           description: "description" },
  { contractTypeId: 33, departmentId: 5, contractTypeCode: "ADMC",   contractTypeName: "Maintenance Contract",                                           description: "description" },
  { contractTypeId: 34, departmentId: 5, contractTypeCode: "ADSC",   contractTypeName: "Supply Contract",                                                description: "description" },
  { contractTypeId: 35, departmentId: 5, contractTypeCode: "ADSA",   contractTypeName: "Service Agreement",                                              description: "description" },
  { contractTypeId: 37, departmentId: 1, contractTypeCode: "ITTPAA", contractTypeName: "Third-Party Administrator Agreement",                            description: "description" },
];

// ── Partners ─────────────────────────────────

export const mockPartners: Partner[] = [
  { partnerId: 1,  partnerName: "ABC Company",     contactPerson: "Sok Dara",   contactNumber: "012100001"    },
  { partnerId: 4,  partnerName: "YTest Corp",       contactPerson: "YTest",      contactNumber: "0123456782"   },
  { partnerId: 6,  partnerName: "Global Software",  contactPerson: "Lim David",  contactNumber: "099887766"    },
  { partnerId: 7,  partnerName: "Training Experts", contactPerson: "Kim Long",   contactNumber: "010223344"    },
  { partnerId: 21, partnerName: "S Company",        contactPerson: "A Person",   contactNumber: "092682683"    },
  { partnerId: 22, partnerName: "EE Solutions",     contactPerson: "E Contact",  contactNumber: "012200300"    },
  { partnerId: 24, partnerName: "Sok Theavy",       contactPerson: "Sok Theavy", contactNumber: "+85588694999" },
];

// ── Contracts ────────────────────────────────

const dept = (id: number) => mockDepartments.find((d) => d.departmentId === id)!;
const ctype = (id: number) => mockContractTypes.find((t) => t.contractTypeId === id)!;
const partner = (id: number) => mockPartners.find((p) => p.partnerId === id)!;

export const mockContracts: Contract[] = [
  {
    contractId: 50, contractCode: "CCF-2026-046", contractTitle: "Legal Contract",
    personInCharge: "John", contractTerm: "", effectiveDate: "2026-01-19",
    expireDate: "2026-08-19", renewalFrequencyMonths: 7, contractValue: 100,
    alertDays: null, remark: "", remainingDays: 89, status: "EXPIRING_SOON",
    createdBy: 1, department: dept(3), contractType: ctype(13),
    partners: [partner(6)], alerts: null,
  },
  {
    contractId: 49, contractCode: "CCF-2026-045", contractTitle: "Contract Testing",
    personInCharge: "John", contractTerm: "", effectiveDate: "2026-01-19",
    expireDate: "2026-07-21", renewalFrequencyMonths: 6, contractValue: 200,
    alertDays: null, remark: "", remainingDays: 60, status: "EXPIRING_SOON",
    createdBy: 1, department: dept(3), contractType: ctype(25),
    partners: [partner(7)], alerts: null,
  },
  {
    contractId: 48, contractCode: "CCF-2026-044", contractTitle: "Lease Agreement",
    personInCharge: "John", contractTerm: "", effectiveDate: "2026-05-19",
    expireDate: "2026-08-19", renewalFrequencyMonths: 3, contractValue: 200,
    alertDays: null, remark: "", remainingDays: 89, status: "EXPIRING_SOON",
    createdBy: 1, department: dept(5), contractType: ctype(18),
    partners: [partner(6)], alerts: null,
  },
  {
    contractId: 46, contractCode: "CCF-2026-042", contractTitle: "Testing Agreement",
    personInCharge: "Test User", contractTerm: "", effectiveDate: "2026-05-13",
    expireDate: "2026-06-18", renewalFrequencyMonths: 1, contractValue: 5000,
    alertDays: null, remark: "", remainingDays: 27, status: "EXPIRING_SOON",
    createdBy: 9, department: dept(3), contractType: ctype(25),
    partners: [partner(4)], alerts: null,
  },
  {
    contractId: 43, contractCode: "CCF-2026-039", contractTitle: "Testing",
    personInCharge: "John Smith", contractTerm: "", effectiveDate: "2026-05-18",
    expireDate: "2026-07-18", renewalFrequencyMonths: 2, contractValue: 6000,
    alertDays: null, remark: "", remainingDays: 57, status: "EXPIRING_SOON",
    createdBy: 10, department: dept(1), contractType: ctype(1),
    partners: [partner(1)], alerts: null,
  },
  {
    contractId: 41, contractCode: "CCF-2026-037", contractTitle: "CHK Branch Lease Renewal",
    personInCharge: "Nov Lakena", contractTerm: "5 years", effectiveDate: "2026-01-05",
    expireDate: "2026-12-30", renewalFrequencyMonths: 12, contractValue: 33360,
    alertDays: null, remark: "", remainingDays: 222, status: "ACTIVE",
    createdBy: 17, department: dept(5), contractType: ctype(18),
    partners: [partner(24)], alerts: null,
  },
];

// ── Permissions ──────────────────────────────

export const mockContractPermissions: Permission[] = [
  { id: 5, name: "CONTRACT_CREATE" },
  { id: 6, name: "CONTRACT_READ"   },
  { id: 7, name: "CONTRACT_UPDATE" },
  { id: 8, name: "CONTRACT_DELETE" },
];

export const mockUserPermissions: Permission[] = [
  { id: 1, name: "USER_CREATE" },
  { id: 2, name: "USER_READ"   },
  { id: 3, name: "USER_UPDATE" },
  { id: 4, name: "USER_DELETE" },
];

export const mockAllPermissions: Permission[] = [
  ...mockUserPermissions,
  ...mockContractPermissions,
];

// ── Roles ────────────────────────────────────

export const mockRoles: Role[] = [
  {
    roleId: 1, roleName: "ROLE_ADMINISTRATOR",
    permissions: ["USER_CREATE", "USER_READ", "USER_UPDATE", "USER_DELETE",
                  "CONTRACT_CREATE", "CONTRACT_READ", "CONTRACT_UPDATE", "CONTRACT_DELETE"],
  },
  { roleId: 2, roleName: "ROLE_TOP_MANAGEMENT", permissions: [] },
  { roleId: 3, roleName: "ROLE_MANAGER",        permissions: [] },
  { roleId: 4, roleName: "ROLE_OFFICER",         permissions: [] },
];

// ── Users ────────────────────────────────────

export const mockUsers: User[] = [
  {
    userId: 21, fullName: "Ovisana", employeeId: "0865",
    email: "visana.o@chokchey.com.kh", phoneNumber: "0123456789",
    jobTitle: "Senior Legal and Compliance", status: "ACTIVE",
    moduleAccess: [{ id: 3, name: "Legal and Compliance" }],
    department: { departmentId: 3, departmentName: "Legal and Compliance" },
    roles: [{ id: 2, name: "ROLE_TOP_MANAGEMENT" }],
    permissions: mockAllPermissions,
    audit: {
      createdBy: "SAN Simaneth", createdByEmail: "simaneth.san@chokchey.com.kh",
      createdDateTime: "2026-05-07 08:18:03.876816",
      lastUpdatedBy: "Ouy Ponlouer", lastUpdatedByEmail: "ponlouer.ouy@chokchey.com.kh",
      lastUpdatedDateTime: "2026-05-12 16:20:14.359+07",
    },
  },
  {
    userId: 18, fullName: "CHHAY Sokundaneth", employeeId: "1066",
    email: "sokundaneth.chhay@chokchey.com.kh", phoneNumber: null, jobTitle: null,
    status: "ACTIVE",
    moduleAccess: [{ id: 5, name: "Admin and Marketing" }],
    department: { departmentId: 5, departmentName: "Admin and Marketing" },
    roles: [{ id: 2, name: "ROLE_TOP_MANAGEMENT" }],
    permissions: mockAllPermissions,
    audit: {
      createdBy: "Neang Kakada", createdByEmail: "kakada.neang@chokchey.com.kh",
      createdDateTime: "2026-05-06 11:09:47.321614",
      lastUpdatedBy: null, lastUpdatedByEmail: null, lastUpdatedDateTime: null,
    },
  },
  {
    userId: 17, fullName: "NOV Lakena", employeeId: "0978",
    email: "lakena.nov@chokchey.com.kh", phoneNumber: null, jobTitle: null,
    status: "ACTIVE",
    moduleAccess: [{ id: 5, name: "Admin and Marketing" }],
    department: { departmentId: 5, departmentName: "Admin and Marketing" },
    roles: [{ id: 2, name: "ROLE_TOP_MANAGEMENT" }],
    permissions: mockAllPermissions,
    audit: {
      createdBy: "Neang Kakada", createdByEmail: "kakada.neang@chokchey.com.kh",
      createdDateTime: "2026-05-06 11:08:48.114097",
      lastUpdatedBy: null, lastUpdatedByEmail: null, lastUpdatedDateTime: null,
    },
  },
  {
    userId: 16, fullName: "LY Vannlyda", employeeId: "1045",
    email: "vannlyda.ly@chokchey.com.kh", phoneNumber: null, jobTitle: null,
    status: "ACTIVE",
    moduleAccess: [{ id: 3, name: "Legal and Compliance" }],
    department: { departmentId: 3, departmentName: "Legal and Compliance" },
    roles: [{ id: 3, name: "ROLE_MANAGER" }],
    permissions: mockContractPermissions,
    audit: {
      createdBy: "Neang Kakada", createdByEmail: "kakada.neang@chokchey.com.kh",
      createdDateTime: "2026-05-06 11:08:01.54532",
      lastUpdatedBy: null, lastUpdatedByEmail: null, lastUpdatedDateTime: null,
    },
  },
  {
    userId: 15, fullName: "PICH Vanlyda", employeeId: "0624",
    email: "vanlyda.pich@chokchey.com.kh", phoneNumber: null, jobTitle: null,
    status: "ACTIVE",
    moduleAccess: [{ id: 3, name: "Legal and Compliance" }],
    department: { departmentId: 3, departmentName: "Legal and Compliance" },
    roles: [{ id: 3, name: "ROLE_MANAGER" }],
    permissions: mockAllPermissions,
    audit: {
      createdBy: "Neang Kakada", createdByEmail: "kakada.neang@chokchey.com.kh",
      createdDateTime: "2026-05-06 11:07:10.073479",
      lastUpdatedBy: null, lastUpdatedByEmail: null, lastUpdatedDateTime: null,
    },
  },
  {
    userId: 14, fullName: "TAB Chansorya", employeeId: "0843",
    email: "chansorya.tab@chokchey.com.kh", phoneNumber: null, jobTitle: null,
    status: "ACTIVE",
    moduleAccess: [{ id: 3, name: "Legal and Compliance" }],
    department: { departmentId: 3, departmentName: "Legal and Compliance" },
    roles: [{ id: 3, name: "ROLE_MANAGER" }],
    permissions: mockAllPermissions,
    audit: {
      createdBy: "Neang Kakada", createdByEmail: "kakada.neang@chokchey.com.kh",
      createdDateTime: "2026-05-06 11:06:27.496554",
      lastUpdatedBy: null, lastUpdatedByEmail: null, lastUpdatedDateTime: null,
    },
  },
  {
    userId: 13, fullName: "BUN Menghok", employeeId: "0971",
    email: "menghok.bun@chokchey.com.kh", phoneNumber: null, jobTitle: null,
    status: "ACTIVE",
    moduleAccess: [
      { id: 3, name: "Legal and Compliance" },
      { id: 5, name: "Admin and Marketing" },
      { id: 1, name: "IT Department" },
    ],
    department: { departmentId: 3, departmentName: "Legal and Compliance" },
    roles: [{ id: 1, name: "ROLE_ADMINISTRATOR" }],
    permissions: mockAllPermissions,
    audit: {
      createdBy: "Neang Kakada", createdByEmail: "kakada.neang@chokchey.com.kh",
      createdDateTime: "2026-05-06 11:05:31.049508",
      lastUpdatedBy: null, lastUpdatedByEmail: null, lastUpdatedDateTime: null,
    },
  },
  {
    userId: 11, fullName: "MOEUN Sreymom", employeeId: "1002",
    email: "sreymom.moeun@chokchey.com.kh", phoneNumber: "098744581",
    jobTitle: "Deputy Head of IT Department", status: "ACTIVE",
    moduleAccess: [{ id: 1, name: "IT Department" }],
    department: { departmentId: 1, departmentName: "IT Department" },
    roles: [{ id: 1, name: "ROLE_ADMINISTRATOR" }],
    permissions: mockAllPermissions,
    audit: {
      createdBy: "Ouy Ponlouer", createdByEmail: "ponlouer.ouy@chokchey.com.kh",
      createdDateTime: "2026-05-06 10:38:26.441265",
      lastUpdatedBy: null, lastUpdatedByEmail: null, lastUpdatedDateTime: null,
    },
  },
  {
    userId: 1, fullName: "Ouy Ponlouer", employeeId: "1068",
    email: "ponlouer.ouy@chokchey.com.kh", phoneNumber: "012000001",
    jobTitle: "Administrator", status: "ACTIVE",
    moduleAccess: [
      { id: 3, name: "Legal and Compliance" },
      { id: 5, name: "Admin and Marketing" },
      { id: 1, name: "IT Department" },
    ],
    department: { departmentId: 1, departmentName: "IT Department" },
    roles: [{ id: 1, name: "ROLE_ADMINISTRATOR" }],
    permissions: mockAllPermissions,
    audit: {
      createdBy: null, createdByEmail: null,
      createdDateTime: "2026-05-04 10:33:03.95499",
      lastUpdatedBy: "Ouy Ponlouer", lastUpdatedByEmail: "ponlouer.ouy@chokchey.com.kh",
      lastUpdatedDateTime: "2026-05-06 16:45:14.151+07",
    },
  },
  {
    userId: 3, fullName: "Neang Kakada", employeeId: "0970",
    email: "kakada.neang@chokchey.com.kh", phoneNumber: null, jobTitle: null,
    status: "ACTIVE",
    moduleAccess: [
      { id: 3, name: "Legal and Compliance" },
      { id: 5, name: "Admin and Marketing" },
      { id: 1, name: "IT Department" },
    ],
    department: { departmentId: 1, departmentName: "IT Department" },
    roles: [{ id: 1, name: "ROLE_ADMINISTRATOR" }],
    permissions: mockAllPermissions,
    audit: {
      createdBy: "Ouy Ponlouer", createdByEmail: "ponlouer.ouy@chokchey.com.kh",
      createdDateTime: "2026-04-30 15:32:38.442495",
      lastUpdatedBy: null, lastUpdatedByEmail: null, lastUpdatedDateTime: null,
    },
  },
];

// ══════════════════════════════════════════════
// FULL API RESPONSE MOCKS
// ══════════════════════════════════════════════

export const mockDepartmentListResponse: DepartmentListResponse = {
  success: true,
  message: "All departments fetched successfully",
  status: "200 OK",
  payload: {
    items: mockDepartments,
    paginationResponse: { page: 1, size: 10, total: 4, totalPages: 1 },
  },
  timestamps: new Date().toISOString(),
};

export const mockContractTypeListResponse: ContractTypeListResponse = {
  success: true,
  message: "All Contract type fetched successfully",
  status: "200 OK",
  payload: mockContractTypes,
  timestamps: new Date().toISOString(),
};

export const mockContractListResponse: ContractListResponse = {
  success: true,
  message: "All Contract fetched successfully",
  status: "200 OK",
  payload: {
    items: mockContracts,
    paginationResponse: { page: 1, size: 10, total: 20, totalPages: 2 },
  },
  timestamps: new Date().toISOString(),
};

export const mockPermissionsResponse: PermissionsResponse = {
  success: true,
  message: "Permissions fetched successfully.",
  status: "200 OK",
  payload: {
    CONTRACT: mockContractPermissions,
    USER: mockUserPermissions,
  },
  timestamps: new Date().toISOString(),
};

export const mockRoleListResponse: RoleListResponse = {
  success: true,
  message: "All roles fetched successfully",
  status: "200 OK",
  payload: {
    items: mockRoles,
    paginationResponse: { page: 1, size: 10, total: 4, totalPages: 1 },
  },
  timestamps: new Date().toISOString(),
};

export const mockUserListResponse: UserListResponse = {
  success: true,
  message: "User list retrieved successfully",
  status: "200 OK",
  payload: {
    summary: { total_users: 10, active_users: 10, inactive_users: 0, administrators: 4 },
    users: {
      items: mockUsers,
      paginationResponse: { page: 1, size: 10, total: 10, totalPages: 1 },
    },
  },
  timestamps: new Date().toISOString(),
};

// ══════════════════════════════════════════════
// HELPER UTILITIES
// ══════════════════════════════════════════════

/** Filter contracts by status */
export const getContractsByStatus = (status: ContractStatus): Contract[] =>
  mockContracts.filter((c) => c.status === status);

/** Find a contract by ID */
export const getContractById = (id: number): Contract | undefined =>
  mockContracts.find((c) => c.contractId === id);

/** Paginate any array (1-indexed page) */
export const paginate = <T>(
  items: T[],
  page: number,
  size: number
): { items: T[]; pagination: PaginationResponse } => ({
  items: items.slice((page - 1) * size, page * size),
  pagination: { page, size, total: items.length, totalPages: Math.ceil(items.length / size) },
});

/** Get contract types for a specific department */
export const getContractTypesByDepartment = (departmentId: number): ContractType[] =>
  mockContractTypes.filter((t) => t.departmentId === departmentId);

/** Get users by role */
export const getUsersByRole = (roleName: RoleName): User[] =>
  mockUsers.filter((u) => u.roles.some((r) => r.name === roleName));

/** Check if a user has a specific permission */
export const userHasPermission = (userId: number, permission: PermissionName): boolean => {
  const user = mockUsers.find((u) => u.userId === userId);
  return user?.permissions.some((p) => p.name === permission) ?? false;
};

// ══════════════════════════════════════════════
// ENUM / LABEL–KEY TYPES
// ══════════════════════════════════════════════

export interface LabelKey<T extends string = string> {
  label: string;
  key: T;
}

export type ContractStatusKey = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "OVERDUE" | "CLOSED";
export type UserStatusKey     = "ACTIVE" | "INACTIVE";
export type AlertTypeKey      =
  | "EXPIRE_90"
  | "EXPIRE_60"
  | "EXPIRE_30"
  | "AUTO_ALERT"
  | "MANUAL_ALERT"
  | "OVERDUE_ALERT";

// ── Contract Statuses ────────────────────────

export const mockContractStatuses: LabelKey<ContractStatusKey>[] = [
  { label: "ACTIVE",        key: "ACTIVE"        },
  { label: "EXPIRING SOON", key: "EXPIRING_SOON" },
  { label: "EXPIRED",       key: "EXPIRED"       },
  { label: "OVERDUE",       key: "OVERDUE"       },
  { label: "CLOSED",        key: "CLOSED"        },
];

export interface ContractStatusListResponse {
  success: boolean;
  message: string;
  status: string;
  payload: LabelKey<ContractStatusKey>[];
  timestamps: string;
}

export const mockContractStatusListResponse: ContractStatusListResponse = {
  success: true,
  message: "All Contract Status fetched successfully",
  status: "200 OK",
  payload: mockContractStatuses,
  timestamps: new Date().toISOString(),
};

// ── User Statuses ────────────────────────────

export const mockUserStatuses: LabelKey<UserStatusKey>[] = [
  { label: "ACTIVE",   key: "ACTIVE"   },
  { label: "INACTIVE", key: "INACTIVE" },
];

export interface UserStatusListResponse {
  success: boolean;
  message: string;
  status: string;
  payload: LabelKey<UserStatusKey>[];
  timestamps: string;
}

export const mockUserStatusListResponse: UserStatusListResponse = {
  success: true,
  message: "All User Status fetched successfully",
  status: "200 OK",
  payload: mockUserStatuses,
  timestamps: new Date().toISOString(),
};

// ── Alert Types ──────────────────────────────

export const mockAlertTypes: LabelKey<AlertTypeKey>[] = [
  { label: "EXPIRE 90",    key: "EXPIRE_90"    },
  { label: "EXPIRE 60",    key: "EXPIRE_60"    },
  { label: "EXPIRE 30",    key: "EXPIRE_30"    },
  { label: "AUTO ALERT",   key: "AUTO_ALERT"   },
  { label: "MANUAL ALERT", key: "MANUAL_ALERT" },
  { label: "OVERDUE ALERT",key: "OVERDUE_ALERT"},
];

export interface AlertTypeListResponse {
  success: boolean;
  message: string;
  status: string;
  payload: LabelKey<AlertTypeKey>[];
  timestamps: string;
}

export const mockAlertTypeListResponse: AlertTypeListResponse = {
  success: true,
  message: "All Alert Type fetched successfully",
  status: "200 OK",
  payload: mockAlertTypes,
  timestamps: new Date().toISOString(),
};

// ══════════════════════════════════════════════
// CONTRACTS BY DEPARTMENT (Dashboard stat)
// ══════════════════════════════════════════════

export interface ContractByDepartment {
  department: string;
  contractCount: number;
}

export interface ContractByDepartmentResponse {
  success: boolean;
  message: string;
  status: string;
  payload: ContractByDepartment[];
  timestamps: string;
}

export const mockContractsByDepartment: ContractByDepartment[] = [
  { department: "Admin and Marketing",   contractCount: 5 },
  { department: "IT Department",         contractCount: 4 },
  { department: "Legal and Compliance",  contractCount: 7 },
];

export const mockContractsByDepartmentResponse: ContractByDepartmentResponse = {
  success: true,
  message: "Contracts by department fetched successfully",
  status: "200 OK",
  payload: mockContractsByDepartment,
  timestamps: new Date().toISOString(),
};

// ══════════════════════════════════════════════
// GET USER BY ID  (permissions returned as grouped object)
// ══════════════════════════════════════════════

export interface UserPermissionsGrouped {
  CONTRACT: Permission[];
  USER: Permission[];
}

export interface UserDetail extends Omit<User, "permissions"> {
  permissions: UserPermissionsGrouped;
  plainTextPassword?: string; // only returned by some admin endpoints
}

export interface UserDetailResponse {
  success: boolean;
  message: string;
  status: string;
  payload: UserDetail;
  timestamps: string;
}

/** Single user detail – mirrors GET /users/{id} response shape */
export const mockUserDetail: UserDetail = {
  userId: 1,
  fullName: "Ouy Ponlouer",
  employeeId: "1068",
  email: "ponlouer.ouy@chokchey.com.kh",
  phoneNumber: "012000001",
  jobTitle: "System Administrator",
  status: "ACTIVE",
  moduleAccess: [
    { id: 3, name: "Legal and Compliance"  },
    { id: 5, name: "Admin and Marketing"   },
    { id: 1, name: "IT Department"         },
  ],
  department: { departmentId: 1, departmentName: "IT Department" },
  roles: [{ id: 1, name: "ROLE_ADMINISTRATOR" }],
  permissions: {
    CONTRACT: mockContractPermissions,
    USER: mockUserPermissions,
  },
  plainTextPassword: "CCF@2025",
  audit: {
    createdBy: null,
    createdByEmail: null,
    createdDateTime: "2026-05-04 10:33:03.95499",
    lastUpdatedBy: "Ouy Ponlouer",
    lastUpdatedByEmail: "ponlouer.ouy@chokchey.com.kh",
    lastUpdatedDateTime: "2026-05-06 16:45:14.151+07",
  },
};

export const mockUserDetailResponse: UserDetailResponse = {
  success: true,
  message: "User 1 fetched successfully.",
  status: "200 OK",
  payload: mockUserDetail,
  timestamps: new Date().toISOString(),
};

/**
 * Simulate GET /users/{id} — returns grouped permissions shape.
 * Falls back to the first user found in mockUsers if no detail record exists.
 */
export const getUserDetailById = (id: number): UserDetailResponse => {
  const base = mockUsers.find((u) => u.userId === id);
  if (!base) {
    return { ...mockUserDetailResponse, success: false, message: `User ${id} not found.`, status: "404 Not Found" };
  }
  const detail: UserDetail = {
    ...base,
    permissions: {
      CONTRACT: base.permissions.filter((p): p is Permission =>
        (["CONTRACT_CREATE","CONTRACT_READ","CONTRACT_UPDATE","CONTRACT_DELETE"] as PermissionName[]).includes(p.name)
      ) as Permission[],
      USER: base.permissions.filter((p): p is Permission =>
        (["USER_CREATE","USER_READ","USER_UPDATE","USER_DELETE"] as PermissionName[]).includes(p.name)
      ) as Permission[],
    },
  };
  return {
    success: true,
    message: `User ${id} fetched successfully.`,
    status: "200 OK",
    payload: detail,
    timestamps: new Date().toISOString(),
  };
};
