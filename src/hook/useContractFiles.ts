import { useState, useEffect, useCallback } from "react";
import { ContractFile, getContractFiles } from "../services/contractFileService";

interface UseContractFilesResult {
  files: ContractFile[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useContractFiles(contractId: number): UseContractFilesResult {
  const [files, setFiles] = useState<ContractFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!contractId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getContractFiles(contractId);
        console.log("file ", data)
        if (!cancelled) setFiles(data);
      } catch (err: any) {
        if (!cancelled)
          setError(err?.response?.data?.message ?? "Failed to load files");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [contractId, tick]);

  return { files, loading, error, refetch };
}
 