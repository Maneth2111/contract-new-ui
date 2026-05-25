import api from "../api/axios";
import ssoApi from "../api/azure";
import { PaginationResponse } from "./contractTypeService";
import Cookies from "js-cookie";

export interface FilterParam{
  page?: number;
  size?: number;
  departmentId?: number;
  status?: string;
  search?: string;
  createDateFrom?: string;
  createDateTo?: string;
  expireDateFrom?: string;
  expireDateTo?: string;
}
export interface SummaryReport{
    active: number;
    expiringSoon: number;
    totalContracts: number;
    totalValue: number;
    closed?: number;
}
export interface ContractReport{
  contractId: number;
  contractCode: string;
  title: string;
  department: string;
  personInCharge: string;
  partner: string;
  effectiveDate: string;
  expiryDate: string;
  status: string;
  contractValue: number;
}
export interface ReportsResponse{
    success: string;
    message: string;
    status: string;
    payload:{
        summary:SummaryReport;
        data:{
            items:ContractReport[];
            paginationResponse:PaginationResponse;
        }
    };
    timestamps: string;
}

export const getAllContractReport = async (params: FilterParam) => {
  const res = await ssoApi.get<ReportsResponse>("/reports/contracts", { params }); 

  return res.data.payload; 
};

/** Fetches every page for the given filters (for CSV/PDF export). */
export const fetchAllContractReportPages = async (
  params: Omit<FilterParam, 'page' | 'size'>,
  pageSize = 100,
): Promise<{ items: ContractReport[]; summary: SummaryReport }> => {
  const first = await getAllContractReport({ ...params, page: 1, size: pageSize });
  const { totalPages } = first.data.paginationResponse;
  const items = [...first.data.items];

  for (let page = 2; page <= totalPages; page++) {
    const next = await getAllContractReport({ ...params, page, size: pageSize });
    items.push(...next.data.items);
  }

  return { items, summary: first.summary };
};

export const exportContractReportPDF = async (params: FilterParam): Promise<void> => {
  const res = await api.get("/reports/contracts/export/pdf", {
    params,
    responseType: "blob", 
  });

  const blob = new Blob([res.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `contract-report-${new Date().toISOString().split("T")[0]}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
};