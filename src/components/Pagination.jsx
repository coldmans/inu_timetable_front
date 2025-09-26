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
    <div className="mt-6 flex flex-col items-center justify-between gap-4 px-4 sm:flex-row">
      {/* 결과 정보 */}
      <div className="text-sm text-slate-500">
        총 <span className="font-semibold text-slate-900">{totalElements.toLocaleString()}</span>개 중 {' '}
        <span className="font-semibold text-slate-900">{startItem}</span>-
        <span className="font-semibold text-slate-900">{endItem}</span>개 표시
      </div>

      {/* 페이징 네비게이션 */}
      <div className="flex items-center gap-2">
        {/* 이전 버튼 */}
        <button
          onClick={handlePrevious}
          disabled={currentPage === 0 || isLoading}
          className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          이전
        </button>

        {/* 페이지 번호들 */}
        <div className="flex items-center gap-1">
          {getVisiblePages().map((page, index) => (
            page === '...' ? (
              <span key={`dots-${index}`} className="px-3 py-2 text-slate-400">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => handlePageClick(page)}
                disabled={isLoading}
                className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                  page === currentPage
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {page + 1}
              </button>
            )
          ))}
        </div>

        {/* 다음 버튼 */}
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages - 1 || isLoading}
          className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          다음
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
