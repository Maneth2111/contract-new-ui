import api from "../api/axios";
import ssoApi from "../api/azure";

export type AlertType = 'MANUAL_ALERT' | 'AUTO_ALERT' | 'EXPIRE_90' | 'EXPIRE_60' | 'EXPIRE_30' | 'OVERDUE_ALERT';

export interface CreateAlertRequest {
  contractId: number;
  alertType: AlertType;
  daysBeforeExpiry: number;
  alertDate?: string;   
  remark?: string;
}

export interface AlertResponse {
  alertId: number;
  contractId: number;
  alertType: AlertType;
  alertDate: string;
  isTriggered: boolean;
  remark: string;
}

export interface AlertTypes{
  label: string;
  key: string;
}

export interface AlertTypesResponse{
  success: string;
  message: string;
  status: string;
  payload: AlertTypes[];
  timestamps: string;
}
export interface UpdateAlertRequest {
  alertType: AlertType;
  daysBeforeExpiry: number;  // for AUTO_ALERT
  alertDate?: string;        // for MANUAL_ALERT 
  remark?: string;
}

export const updateAlert = async (alertId: number, payload: UpdateAlertRequest): Promise<AlertResponse> => {
  const res = await ssoApi.put(`/alerts/${alertId}`, payload);
  console.log('alert updated: '
    ,res)
  return res.data.payload;
};
//Get all alert types
export const getAlertTypes = async() => {
  const res = await ssoApi.get('/enums/alert-type');
  return res.data.payload;

}

// Create Alert
export const createAlert = async (payload: CreateAlertRequest): Promise<AlertResponse> => {
  const res = await ssoApi.post('/alerts', payload);
  console.log("Alert date: ===", res)
  return res.data.payload;
};

// Get all alerts by Contract ID
export const getAlertsByContractId = async (contractId: number): Promise<AlertResponse[]> => {
  const res = await ssoApi.get(`/alerts/contract/${contractId}`);
  console.log('Get alert by contract Id',res)
  return res.data.payload;
};

// Get all alerts by Alert ID
export const getAlertById = async (alertId: number): Promise<AlertResponse> => {
  const res = await ssoApi.get(`/alerts/${alertId}`);
  console.log('Get alert by alert Id',res)
  return res.data.payload;
};

// Delete Alert 
export const deleteAlert = async (alertId: number): Promise<void> => {
  const res = await ssoApi.delete(`/alerts/${alertId}`);
  return res.data.message;
};