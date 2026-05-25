import api from "../api/axios";
import ssoApi from "../api/azure";
import { PaginationResponse } from "./contractTypeService";

export interface ContractHistoryItem {
  historyId: number;
  contractId: number;
  actionType: 'CREATED' | 'MODIFIED' | 'DELETED';
  description: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  actionDate: string;
  actionBy: {
    userId: number;
    fullName: string;
  };
}

export interface ContractHistoryResponse {
  items: ContractHistoryItem[];
  paginationResponse: PaginationResponse;
}

export const getContractHistory = async (
  contractId: number,
  page = 1,
  size = 10
): Promise<ContractHistoryResponse> => {
  const res = await ssoApi.get(`/contracts/${contractId}/history`, {
    params: { page, size },
  });
  console.log('Get contract history', res);
  return res.data.payload;
};