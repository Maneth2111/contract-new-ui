import api from "../api/axios";
import ssoApi from "../api/azure";
import { PaginationResponse } from "./contractTypeService";
import { Partner } from "./partnerService";

export interface NotificationContract {
  alertDate: string;
  alertType: string;
  status?: string;
  contractCode: string;
  contractId: number;
  contractTitle: string;
  daysRemaining: number;
  departmentName: string;
  expireDate: string;
  personInCharge: string;
  remark: string;
  partners:Partner[];
}

export interface NotificationSummary {
  expire30: number;
  expire60: number;
  expire90: number;
  overdue: number;
}

export interface NotificationResponse {
  expireSoonContracts: {
    items: NotificationContract[];
    paginationResponse: PaginationResponse;
  };
  overdueContracts: {
    items: NotificationContract[];
    paginationResponse: PaginationResponse;
  };
  summary: NotificationSummary;
}

export interface NotificationResponseApi{
  success: boolean;
  message: string;
  status: string;
  payload: NotificationResponse;
  timestamps: string;
}

export const getNotifications = async (
  overduePage = 1,
  overdueSize = 10,
  expireSoonPage = 1,
  expireSoonSize = 10
): Promise<NotificationResponse> => {
  const res = await ssoApi.get<NotificationResponseApi>('/notifications', {
    params: { overduePage, overdueSize, expireSoonPage, expireSoonSize },
  });
  console.log('Get notifications', res);
  return res.data.payload;
};