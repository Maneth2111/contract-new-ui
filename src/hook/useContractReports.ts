import { useEffect, useState } from "react";
import { ContractReport, FilterParam, getAllContractReport, SummaryReport, } from "../services/reportsService";

interface UseContractsResult {
  contracts: ContractReport[];
  summary: SummaryReport | null;
  total: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
}

export const useContractReport = (params: FilterParam): UseContractsResult => {
  const [contracts, setContracts] = useState<ContractReport[]>([]);
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const loadContracts = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getAllContractReport(params);
        console.log('all contract report', data);

        setContracts(data.data.items);
        setSummary(data.summary);
        setTotal(data.data.paginationResponse.total);
        setTotalPages(data.data.paginationResponse.totalPages);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    loadContracts();
  }, [
    params.page,
    params.size,
    params.departmentId,
    params.status,
    params.search,
    params.createDateFrom,  
    params.createDateTo,   
    params.expireDateFrom, 
    params.expireDateTo,
  ]);

  return { contracts, summary, loading, error,total,totalPages };
};