import api from "../api/axios";
import ssoApi from "../api/azure";
import { ContractType, PaginationResponse } from "./contractTypeService";
import { Department } from "./departmentService";


export interface ContractPartner {
  partnerId: number;
  partnerName: string;
  contactPerson: string;
  contactNumber: string;
}

export interface ContractAlert {
  alertId: number;
  contractId: number;
  alertType: 'AUTO_ALERT' | 'MANUAL_ALERT' | 'EXPIRE_90' | 'EXPIRE_60' | 'EXPIRE_30';
  alertDate?: string;
  daysBeforeExpiry?: number;
  isTriggered: boolean;
  remark?: string;
}

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
  alertDays: number | string;   
  remark: string;
  remainingDays: number;
  status: string;
  createdBy: number;
  department: Department;
  contractType: ContractType;
  partners: ContractPartner[];
  alerts: ContractAlert[];
  confidential?: boolean;
}

export interface ContractResponse {
  success: boolean;
  message: string;
  status: string;
  payload: {
    items: Contract[];
    paginationResponse: PaginationResponse;
  };
  timestamps: string;
}

export interface SingleContractResponse {
  success: boolean;
  message: string;
  status: string;
  payload: Contract;
  timestamps: string;
}

export interface ContractSearchParams {
  page?: number;
  size?: number;
  departmentId?: number;
  status?: string;
  search?: string;
}

export const EMPTY_CONTRACT_SEARCH_PARAMS: ContractSearchParams = {}

export interface Status {
  key: string;
  label: string;
}

export interface ContractPartnerPayload {
  partnerId?: number | null;
  partnerName: string;
  contactPerson: string;
  contactNumber: string;
}

export interface ContractAlertPayload {
  alertType: 'AUTO_ALERT' | 'MANUAL_ALERT' | "EXPIRE_90" | "EXPIRE_60" | "EXPIRE_30";
  alertDate?: string;
  daysBeforeExpiry?: number;
}

export interface ContractRequest {
  contractTitle: string;
  personInCharge: string;
  contractTerm: string;
  effectiveDate: string;
  expireDate: string;
  renewalFrequencyMonths: number;
  contractValue: number;
  status: string;
  remark: string;
  contractTypeId: number;
  departmentId: number;
  partners: ContractPartnerPayload[];
  alerts: ContractAlertPayload[];
  alertRemark?: string;
}

// Get contract status
export const  getContractStatuses =async () => {
    const response = await ssoApi.get("/enums/contract-status");
    return response.data.payload;
}

// Get all contracts
const toStatusEnum = (status: string): string =>
  status.trim().toUpperCase().replace(/\s+/g, '_');
export const getContracts = async (params: ContractSearchParams): Promise<ContractResponse['payload']> => {
  const normalizedParams = {
    ...params,
    status: params.status ? toStatusEnum(params.status) : undefined,
  };
  const response = await ssoApi.get("/contracts", { params:normalizedParams });
  return response.data.payload;
};

// Get contract detail
export const getContractById = async (id: number): Promise<SingleContractResponse["payload"]> => {
  const response = await ssoApi.get(`/contracts/${id}`);
      console.log(
      "Get contract detail =============",response
    )
  return response.data.payload;
};

// Create contract
export const createContract = async (contract: ContractRequest): Promise<SingleContractResponse> => {
  const response = await ssoApi.post("/contracts", contract);
  console.log("Create contract =============", response);
  return response.data;
};

// Updata contract
export const updateContract = async (
  id: number,
  contract: ContractRequest
): Promise<SingleContractResponse> => {
  const response = await ssoApi.put(`/contracts/${id}`, contract);
  console.log('Update contract =============', response);
  return response.data;
};

// Delete Contract
export const deleteContract = async (id: number) => {
  const response = await ssoApi.delete(`/contracts/${id}`);
  return response.data.message;
};
