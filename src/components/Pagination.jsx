import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  isLoading = false
}) => {
  const handlePrevious = () => {
    if (currentPage > 0 && !isLoading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1 && !isLoading) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    if (page !== currentPage && !isLoading) {
      onPageChange(page);
    }
  };

  // 표시할 페이지 번호들 계산 (현재 페이지 주변 5개)
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(0, currentPage - delta);
         i <= Math.min(totalPages - 1, currentPage + delta);
         i++) {
      range.push(i);
    }

    if (range[0] > 0) {
      if (range[0] > 1) {
        rangeWithDots.push(0, '...');
      } else {
        rangeWithDots.push(0);
      }
    }

    rangeWithDots.push(...range);

    if (range[range.length - 1] < totalPages - 1) {
      if (range[range.length - 1] < totalPages - 2) {
        rangeWithDots.push('...', totalPages - 1);
      } else {
        rangeWithDots.push(totalPages - 1);
      }
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalElements);

  return (
    <nav aria-label="검색 결과 페이지 이동" className="flex flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-5">
      <p className="text-xs tabular-nums text-slate-500">
        총 <span className="font-semibold text-slate-700">{totalElements.toLocaleString()}</span>개 중{' '}
        {startItem}-{endItem}
      </p>

      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start sm:gap-1">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 0 || isLoading}
          aria-label="이전 페이지"
          className="btn-secondary h-10 flex-1 px-3 text-[13px] sm:h-8 sm:flex-none sm:px-2.5"
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">이전</span>
        </button>

        <span className="min-w-[72px] rounded-lg bg-slate-50 px-3 py-2 text-center text-xs font-semibold tabular-nums text-slate-600 ring-1 ring-inset ring-slate-200 sm:hidden">
          {currentPage + 1} / {totalPages}
        </span>

        <div className="hidden items-center gap-0.5 px-1 sm:flex">
          {getVisiblePages().map((page, index) => (
            page === '...' ? (
              <span key={`dots-${index}`} className="px-1.5 text-xs text-slate-400">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => handlePageClick(page)}
                disabled={isLoading}
                aria-label={`${page + 1}페이지`}
                aria-current={page === currentPage ? 'page' : undefined}
                className={`grid h-10 w-10 place-items-center rounded-lg text-[13px] font-medium tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:w-8 ${
                  page === currentPage
                    ? 'bg-blue-600 font-semibold text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {page + 1}
              </button>
            )
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages - 1 || isLoading}
          aria-label="다음 페이지"
          className="btn-secondary h-10 flex-1 px-3 text-[13px] sm:h-8 sm:flex-none sm:px-2.5"
        >
          <span className="hidden sm:inline">다음</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </nav>
  );
};

export default Pagination;
