import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Contract, ContractSearchParams, getContractById, getContracts } from '../services/contractService';
import { ContractHistoryItem, getContractHistory } from '../services/contractHistorySevice';

export function useContracts(params: ContractSearchParams = {}, isLoggedIn?: boolean) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const paramsRef = useRef(params)
  paramsRef.current = params

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        page: params.page ?? null,
        size: params.size ?? null,
        departmentId: params.departmentId ?? null,
        status: params.status ?? null,
        search: params.search ?? null,
      }),
    [params.page, params.size, params.departmentId, params.status, params.search]
  )

  const fetchContracts = useCallback(async () => {
    if(!isLoggedIn) return;
    try {
      const res = await getContracts(paramsRef.current);
      console.log('Get all contract with filter: ',res)

      setContracts(res.items);
      setTotalPages(res.paginationResponse.totalPages);
      setTotal(res.paginationResponse.total);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setContracts([]);
        setTotal(0);
        setTotalPages(0);
      } else {
        console.error('Failed to fetch contracts:', err);
      }

    } 
  }, [filterKey, isLoggedIn]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  return { contracts,totalPages, total, refetch: fetchContracts };
}

export function useContractDetail(contractId: number | null) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (contractId === null) return;
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getContractById(contractId);
        if (!cancelled) setContract(data);
      } catch (err) {
        if (!cancelled) setError('Failed to load contract details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [contractId, reloadToken]);

  const refetch = () => setReloadToken((t) => t + 1);

  return { contract, loading, error, refetch };
}

export function useContractHistory(contractId: number, page = 1, size = 10) {
  const [items, setItems] = useState<ContractHistoryItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await getContractHistory(contractId, page, size);
      console.log('Get contract history:', res);

      setItems(res.items);
      setTotalPages(res.paginationResponse.totalPages);
      setTotal(res.paginationResponse.total);
    } catch (err) {
      console.error('Failed to fetch contract history:', err);
    }
  }, [contractId, page, size]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { items, totalPages, total, refetch: fetchHistory };
}