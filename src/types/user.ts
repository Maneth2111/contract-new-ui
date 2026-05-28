export type UserRole = 'Administrator' | 'Top Management' | 'Manager' | 'Officer';

export type UserStatus = 'Active' | 'Inactive' | 'Disabled';

export type PermissionLevel = 'View Only' | 'View & Edit' | 'Edit & Delete' | 'Full Access';

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
export interface ModuleAccessItem {
  id: number;
  name: string;
}

export interface PermissionItem {
  id: number;
  name: string;
}

export interface User {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  department: string;
  jobTitle: string;
  phoneNumber: string;
  status: UserStatus;
  role: UserRole;
  permissionLevel: PermissionLevel;
  moduleAccess: ModuleAccessItem[];                       
  permissions: Record<string, PermissionItem[]>;          
  createdBy: string;
  createdDate: string;
  lastUpdatedBy: string;
  lastUpdatedDate: string;
}

//Form model shared by create/edit
export type UserFormValues = {
  fullName: string
  employeeId: string
  email: string
  phoneNumber: string
  jobTitle: string
  status: string
  departmentId: number
  roleNames: string[]
  deptAccessIds: number[]
  contractPermissionIds: number[]
  userPermissionIds: number[]
}




