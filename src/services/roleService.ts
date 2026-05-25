import api from "../api/axios";
import ssoApi from "../api/azure";
import { PaginationResponse } from "./contractTypeService";


export interface Roles{
    roleId: number;
    roleName: string;
    permissions: string[];
}
export interface RolesResponse{
    success: boolean;
    message: string;
    status: string;
    payload:{
        items: Roles[],
        paginationResponse:PaginationResponse
    }
}

// Get all Roles
export const getAllRoles = async(page = 1, size = 10) => {
    const response = await ssoApi.get<RolesResponse>(
        `/roles?page=${page}&size=${size}`
    )
    return response.data.payload.items
}