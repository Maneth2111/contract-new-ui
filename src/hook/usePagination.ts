import { useCallback, useState } from 'react';

export interface PaginationState {
  page: number;
  size: number;
}

export function usePagination(initialSize = 10) {
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, size: initialSize });

  const goToPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  const setSize = useCallback((size: number) => {
    setPagination({ page: 1, size })
  }, [])

  return { pagination, goToPage, setSize };
}