import api from "../api/axios";
import ssoApi from "../api/azure";
import { User } from "../types/user";
import { PaginationResponse } from "./contractTypeService";


export interface Audit {
  createdBy: string;
  createdByEmail: string;
  createdDateTime: string;
  lastUpdatedBy: string;
  lastUpdatedByEmail: string;
  lastUpdatedDateTime: string;
}
export interface CurrentUserResponse {
  success: boolean;
  status: string;
  payload: UserProfile;
  timestamps: string;
}

export interface UserProfile {
  id: number;
  employeeId: string | null;
  fullName: string;
  email: string;
  jobTitle: string | null;
  phoneNumber: string | null;
  status: string | null;
  department: string | null;
  confidentialAccess?: boolean;
  moduleAccess: { id: number; name: string }[];
  permissions: Record<string, { id: number; name: string }[]>;
  roles: { id: number; name: string }[];
}

export interface LastUpdate {
  lastUpdate: number;
  createdBy: number;
  jobTitle: string;
  employeeId: string;
  username: string;
  department: string | null;
  moduleAccess: string | null;
}

export interface UserCreatedResponse {
  success: boolean;
  status: string;
  payload: {
    items: UserProfile[],
    paginationResponse: PaginationResponse
  }
  timestamps: string;
}

export interface UserSummary {
  total_users: number;
  active_users: number;
  inactive_users: number;
  administrators: number;
}


export interface UserRole {
  id: number;
  name: string;
}

export interface UserDepartment {
  departmentId: number;
  departmentName: string;
}

export interface ApiUser {
  userId: number;
  fullName: string;
  employeeId: string;
  email: string;
  phoneNumber: string;
  jobTitle: string;
  status: string;
  department: UserDepartment | null;
  roles: UserRole[];
  moduleAccess: { id: number; name: string }[];
  permissions?: Record<string, { id: number; name: string }[]>;
  audit: Audit;
  plainTextPassword: string;
}

export interface UserSearchParams {
  search?: string;
  status?: string;
  departmentId?: number;
  role?: string;
  roleId?: number;
  page?: number;
  size?: number;
}
export interface UsersListResponse {
  summary: UserSummary;
  users: {
    items: ApiUser[];
    paginationResponse: PaginationResponse;
  };
}
export interface UserResponse {
  success: boolean;
  message: string;
  status: string;
  payload: UsersListResponse;
  timestamps: string;
}

export interface SingleUserResponse {
  success: boolean;
  message: string;
  status: string;
  payload: ApiUser;
  timestamps: string;
}

export interface UserRequest {
  fullName: string;
  employeeId: string;
  email: string;
  phoneNumber: string;
  jobTitle: string;
  departmentId: number;
  roleIds: number[];
  moduleDepartmentIds: number[];
  permissionIds: number[];
  status: string;
}

export interface UserApiResponse {
  success: boolean;
  message: string;
  status: string;
  payload: ApiUser;
  timestamps: string;
};

//--------------------------
// GET Current user
//--------------------------
export const getCurrentUser = async (): Promise<UserProfile> => {
  const response = await ssoApi.get<CurrentUserResponse>("/auths/me");
  console.log('Current user: ', response);
  return response.data.payload;
};

// ------------------------------------------
//  User Status
// ------------------------------------------
export const getUserStatuses = async () => {
  const response = await ssoApi.get("/enums/user-status");
  return response.data.payload;
}

//------------------------------------------
// Get all users created by Current user
//------------------------------------------
export const getUsers = async (params: UserSearchParams = {}): Promise<UserResponse['payload']> => {
  const apiParams = {
    ...params,
    role: params.role || (params.roleId != null ? String(params.roleId) : undefined),
  }

  const response = await ssoApi.get('/users', { params: apiParams });
  return response.data.payload;
};
// Map role
const mapApiRole = (roleName?: string): User['role'] => {
  const clean = String(roleName ?? '').toUpperCase()
  if (clean.includes('ADMIN')) return 'Administrator'
  if (clean.includes('TOP')) return 'Top Management'
  if (clean.includes('MANAGER')) return 'Manager'
  return 'Officer'
}
// Map API to User
export const mapApiUserToUser = (apiUser: ApiUser): User => ({
  id: String(apiUser.userId),
  fullName: apiUser.fullName,
  employeeId: apiUser.employeeId,
  email: apiUser.email,
  phoneNumber: apiUser.phoneNumber,
  jobTitle: apiUser.jobTitle,
  status: apiUser.status === 'ACTIVE' ? 'Active' :
    apiUser.status === 'INACTIVE' ? 'Inactive' : 'Disabled' as User['status'],
  department: apiUser.department?.departmentName ?? '',
  role: mapApiRole(apiUser.roles[0]?.name ) as User['role'],
  permissionLevel: 'read' as User['permissionLevel'],
  moduleAccess: apiUser.moduleAccess ?? [],
  permissions: apiUser.permissions ?? {},
  createdBy: apiUser.audit?.createdBy ?? '',
  createdDate: apiUser.audit?.createdDateTime ?? '',
  lastUpdatedBy: apiUser.audit?.lastUpdatedBy ?? '',
  lastUpdatedDate: apiUser.audit?.lastUpdatedDateTime ?? '',
});

//------------------------------------------
// Create user
//------------------------------------------

export const createUser = async (data: UserRequest): Promise<ApiUser> => {
  const response = await ssoApi.post<UserApiResponse>('/users', data);
  console.log('Create User: ', response);
  return response.data.payload;
};

//------------------------------------------
// Get users by ID
//------------------------------------------
export const getUserById = async (id: number) => {
  const response = await ssoApi.get<SingleUserResponse>(`/users/${id}`);
  return response.data.payload;
};

//------------------------------------------
// Update user
//------------------------------------------
export const updateUser = async (
  id: number,
  data: UserRequest
): Promise<SingleUserResponse> => {
  const response = await ssoApi.put<UserApiResponse>(`/users/${id}`, data);
  return response.data;
};

//------------------------------------------
// Delete user
//------------------------------------------
export const deleteUser = async (id: number) => {
  const response = await ssoApi.delete(`/users/${id}`);
  return response.data.message;
};




