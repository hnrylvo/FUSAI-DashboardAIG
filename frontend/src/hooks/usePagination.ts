import { useMemo, useState } from 'react';

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  total?: number;
}

export function usePagination({
  initialPage = 1,
  initialPageSize = 10,
  total = 0,
}: UsePaginationOptions = {}) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  const canNextPage = page < totalPages;
  const canPrevPage = page > 1;

  const nextPage = () => {
    if (canNextPage) setPage((p) => p + 1);
  };

  const prevPage = () => {
    if (canPrevPage) setPage((p) => p - 1);
  };

  const goToPage = (p: number) => {
    const target = Math.max(1, Math.min(p, totalPages));
    setPage(target);
  };

  const resetPage = () => setPage(1);

  return {
    page,
    pageSize,
    totalPages,
    total,
    canNextPage,
    canPrevPage,
    nextPage,
    prevPage,
    goToPage,
    setPageSize,
    resetPage,
  };
}
