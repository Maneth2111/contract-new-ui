import api from "../api/axios";
import ssoApi from "../api/azure";


export type PermissionItem = { id: number; name: string };
export type PermissionsMap = Record<string, PermissionItem[]>;

interface PermissionsResponse {
  success: boolean;
  message: string;
  status: string;
  payload: PermissionsMap;
  timestamps: string;
}


export const getAllPermissions = async (): Promise<PermissionsMap> => {
  const response = await ssoApi.get<PermissionsResponse>('/users/permissions');
  return response.data.payload;
};