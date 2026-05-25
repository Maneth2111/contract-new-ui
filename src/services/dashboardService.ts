import api from "../api/axios";
import ssoApi from "../api/azure";

export interface StatusDistrabution{
    active:number;
    expiringSoon: number;
    expired:number;
    overdue: number;
    closed: number;
}

export interface StatusDistrabutionResponse{
    success: boolean;
    message: string;
    status: string;
    payload: StatusDistrabution;
    timestamps: string;    
}

export interface UpcomingExpirations{
    month: string;
    count: number;
}

export interface UpcomingExpirationsResponse{
    success: boolean;
    message: string;
    status: string;
    payload: UpcomingExpirations[];
    timestamps: string;
}

export interface ContractByDepartment{
    department: string;
    contractCount: Number;
}

export interface ContractByDepartmentResponse{
    success: boolean;
    message: string;
    status: string;
    payload: ContractByDepartment[];
    timestamps: string;
}

export interface SummaryDashboard{
    activeContracts: number;
    closedContracts: number;
    contractOwners: number;
    expiringSoon90Days: number;
    overdueContracts: number;
    totalContractValue: number;
    totalContracts: number;
    totalPartners: number;
}

export interface SummaryDashboardResponse{
    success: boolean;
    message: string;
    status: string;
    payload: SummaryDashboard;
    timestamps: string;
}

// Get Summary Dashboard 
export const getDashboardSummary = async() => {
    const response = await ssoApi.get<SummaryDashboardResponse>(`/dashboard/summary`);
    return response.data.payload;
} 

// Get all contracts by department
export const getContractsByDepartment = async() => {
    const response = await api.get<ContractByDepartmentResponse>(`/dashboard/contracts-by-department`);
    return response.data.payload;
}

// Get upcoming expirations
export const getUpcommingExpirations = async() => {
    const response = await ssoApi.get<UpcomingExpirationsResponse>(`/dashboard/upcoming-expirations`);
    return response.data.payload;
}

// Get Status distribution
export const getStatusDistribution = async() =>{
    const response = await ssoApi.get<StatusDistrabutionResponse>(`/dashboard/status-distribution`)
    return response.data.payload;
}