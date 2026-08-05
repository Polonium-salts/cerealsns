import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface GooglePaginationProps {
  currentPage: number;
  totalPages?: number;
  totalResults?: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export const GooglePagination: React.FC<GooglePaginationProps> = ({
  currentPage,
  totalPages = 1,
  totalResults,
  onPageChange,
  isLoading = false,
}) => {
  const maxPages = Math.max(1, totalPages);

  // Generate dynamic page list around current page if maxPages is large
  let startPage = 1;
  let endPage = maxPages;

  if (maxPages > 10) {
    if (currentPage <= 6) {
      startPage = 1;
      endPage = 10;
    } else if (currentPage + 4 >= maxPages) {
      startPage = maxPages - 9;
      endPage = maxPages;
    } else {
      startPage = currentPage - 5;
      endPage = currentPage + 4;
    }
  }

  const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  return (
    <div className="flex flex-col items-center justify-center pt-6 pb-12 select-none border-t border-slate-800/60 mt-8">
      {/* Page Numbers Row */}
      <div className="flex items-center space-x-1 sm:space-x-2 text-sm font-medium">
        {/* Previous Button */}
        {currentPage > 1 && (
          <button
            onClick={() => !isLoading && onPageChange(currentPage - 1)}
            disabled={isLoading}
            className="flex items-center space-x-1 text-[#8ab4f8] hover:underline px-2.5 py-1 rounded-md transition-colors mr-1 sm:mr-3 text-xs sm:text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>上一页</span>
          </button>
        )}

        {/* Number Buttons */}
        <div className="flex items-center space-x-1">
          {pages.map((p) => {
            const isActive = p === currentPage;
            return (
              <button
                key={p}
                onClick={() => !isLoading && onPageChange(p)}
                disabled={isLoading}
                className={`min-w-[32px] h-8 flex items-center justify-center rounded-md transition-all text-xs sm:text-sm ${
                  isActive
                    ? 'font-bold text-slate-950 bg-[#8ab4f8] shadow-md scale-105'
                    : 'text-[#8ab4f8] hover:bg-slate-800/80 hover:underline'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        {currentPage < maxPages && (
          <button
            onClick={() => !isLoading && onPageChange(currentPage + 1)}
            disabled={isLoading}
            className="flex items-center space-x-1 text-[#8ab4f8] hover:underline px-2.5 py-1 rounded-md transition-colors ml-1 sm:ml-3 text-xs sm:text-sm"
          >
            <span>下一页</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Subtle engine & pagination badge */}
      <div className="mt-4 flex items-center space-x-2 text-[11px] text-slate-400 font-sans">
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/50">
          <span>SearXNG Google API</span>
        </span>
        <span>·</span>
        <span>
          第 <strong className="text-slate-200">{currentPage}</strong> / {maxPages} 页
          {typeof totalResults === 'number' && totalResults > 0 && (
            <span className="ml-1 text-slate-500">(共约 {totalResults} 条结果)</span>
          )}
        </span>
      </div>
    </div>
  );
};
