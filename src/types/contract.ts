export type ContractStatus = 'Active' | 'Expired' | 'Expiring Soon' | 'Overdue' | 'Closed';

export interface ContractPartner {
  partnerId: number;
  partnerName: string;
  contactPerson: string;
  contactNumber: string;
}

export interface ContractAlert {
  alertId: number;
  contractId: number;
  alertType: 'AUTO_ALERT' | 'MANUAL_ALERT' | "EXPIRE_90" | "EXPIRE_60" | "EXPIRE_30";
  alertDate?: string;
  daysBeforeExpiry: number;
  isTriggered: boolean;
  remark?: string;
}
export interface ContractDepartment {
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  description: string;
  msChannel: string | null;
  title: string | null;
  msWebhookUrl: string | null;
  msChannelUrl: string | null;
}
export interface Contract {
  id: string;
  contractId: number;
  contractCode: string;
  title: string;
  contractType: string;
  department: string;
  departmentDetail?: ContractDepartment;
  personInCharge: string;
  partnerId: string;
  partnerName: string;
  partnerContact: string;
  partnerContactNumber: string;
  contactPerson?: string;
  contactNumber?: string;
  contractTerms: string;
  effectiveDate: string;
  expiryDate: string;
  renewalFrequency?: number;
  contractValue: number;
  status: ContractStatus;
  confidential: boolean;
  autoRenew: boolean;
  alertDays: number | string;
  manualAlertDates?: string[];
  remarks?: string;
  remainingDays: number;
  partners: ContractPartner[] | string;   
  alerts: ContractAlert[];       
  // documents?: ContractDocument[];
  // history?: ContractHistory[];
}

export interface ContractDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
  uploadedBy: string;
}

export interface ContractHistory {
  id: string;
  actionType: 'Created' | 'Modified' | 'Updated' | 'Renewed' | 'Upload';
  description: string;
  oldValue?: string;
  newValue?: string;
  actionDate: string;
  performedBy: string;
}

