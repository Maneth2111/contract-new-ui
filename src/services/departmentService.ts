import api from "../api/axios"
import ssoApi from "../api/azure";
import { ApiResponse, PaginationResponse } from "./contractTypeService";

export interface Department{
    departmentId: number,
    departmentCode: string,
    departmentName: string,
    description: string,
    msChannel: string | null,
    title: string | null,
    msWebhookUrl: string | null
    msChannelUrl: string | null
}

export interface DepartmentResponse{
    success: boolean,
    message: string,
    status: string,
    payload:{
        items: Department[],
        paginationResponse: PaginationResponse
    }
}

// Get Department by ID response
export interface SingleDepartmentResponse {
  success: boolean;
  message: string;
  status: string;
  payload: Department;
  timestamps: string;
}

// Get all Department
export const getAllDepartment = async(page = 1, size = 10) => {
    const response = await ssoApi.get<DepartmentResponse>(
        `/departments?page=${page}&size=${size}`
    )
    console.log('Get all departments ', response)
    return response.data.payload
}

// Get Department by ID 
export const getDepartmentById = async(id: number) =>{
    const response = await ssoApi.get<SingleDepartmentResponse>(
        `/departments/${id}`
    )
    return response.data.payload;
}

// Update Department by ID
export const createDepartment = async(id: number)=>{
    const response = await ssoApi.post<ApiResponse<SingleDepartmentResponse>>(
        `/departments/${id}`   
    )
    return response.data.payload;
}

// Update Department by ID
export const updateDepartment = async(id: number)=>{
    const response = await ssoApi.put<ApiResponse<SingleDepartmentResponse>>(
        `/departments/${id}`
    )
    return response.data.payload;
}

// Delete Department by ID 
export const deleteDepartment = async(id: number)=>{
    const response = await ssoApi.delete(
        `/departments/${id}`
    )
    return response.data.message
}