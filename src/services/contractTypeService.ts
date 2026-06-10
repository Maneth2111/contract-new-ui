import api from "../api/axios"
import ssoApi from "../api/azure";

export interface ContractType {
  contractTypeId: number;
  departmentId: number;
  contractTypeCode: string;
  contractTypeName: string;
  description: string;
}

export interface PaginationResponse {
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

// Get contract by ID response
export interface SingleContractTypeResponse {
  success: boolean;
  message: string;
  status: string;
  payload: ContractType;
  timestamps: string;
}
// Update contract type by ID
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  status: string;
  payload: T;
  timestamps: string;
}

// GET all contract types
export const getContractTypes = async (): Promise<ContractType[]> => {
  const response = await ssoApi.get<ApiResponse<ContractType[]>>(
    '/contract-types'
  );

  const payload = response.data.payload as unknown;
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object' && 'items' in payload) {
    return (payload as { items: ContractType[] }).items;
  }

  return response.data.payload as ContractType[];
};

// GET contract type by ID
export const getContractTypeById = async(id: number) =>{
    const response = await api.get<SingleContractTypeResponse>(
        `/contract-types/${id}`)
    return response.data.payload;
}

// Update contract type by ID
export const updateContractType = async (
  id: number,
  data: Partial<ContractType>
) => {
  const response = await ssoApi.put<ApiResponse<ContractType>>(
    `/contract-types/${id}`,
    data
  );

  return response.data.payload;
};

// Delete Contract Type
export const deleteContractType = async (id: number) => {
  const response = await ssoApi.delete(`/contract-types/${id}`);
  return response.data.message;
};