import React, { useState } from 'react';
import { Copy, Check, Bookmark, BookmarkCheck, Globe, Filter, MoreVertical, Sparkles, Bot, RefreshCw, AlertTriangle } from 'lucide-react';
import type { SearchResult } from '../types';
import { GooglePagination } from './GooglePagination';

interface SearchResultsListProps {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onSaveToOffline: (result: SearchResult) => void;
  savedIds: Set<string>;
  currentPage?: number;
  totalPages?: number;
  totalResults?: number;
  onPageChange?: (page: number) => void;
  onAiTriggerSearXNGSearch?: () => void;
  isAiSyncing?: boolean;
  customNodeWarning?: string | null;
}

export const SearchResultsList: React.FC<SearchResultsListProps> = ({
  results,
  isLoading,
  query,
  onSaveToOffline,
  savedIds,
  currentPage = 1,
  totalPages = 1,
  totalResults,
  onPageChange,
  onAiTriggerSearXNGSearch,
  isAiSyncing = false,
  customNodeWarning,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterEngine, setFilterEngine] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'latency' | 'consensus'>('default');

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const presentEngines = Array.from(new Set(results.map((r) => r.engine)));
  const allKnownEngines = ['Google', 'Bing', 'Baidu', 'DuckDuckGo', 'Yandex'];
  const engines = Array.from(new Set([...presentEngines, ...allKnownEngines.filter(e => presentEngines.includes(e))]));
  const filterableEngines = engines.length > 0 ? engines : allKnownEngines;

  const filteredResults = results
    .filter((r) => filterEngine === 'all' || r.engine === filterEngine)
    .sort((a, b) => {
      if (sortBy === 'latency') return a.latencyMs - b.latencyMs;
      if (sortBy === 'consensus') return (b.sourcesCount || 1) - (a.sourcesCount || 1);
      return 0;
    });

  // Helper to format URL into breadcrumb style (e.g. https://domain.com › path › item)
  const formatBreadcrumb = (urlStr: string) => {
    try {
      const url = new URL(urlStr);
      const paths = url.pathname.split('/').filter(Boolean);
      if (paths.length === 0) return url.origin;
      return `${url.origin} › ${paths.join(' › ')}`;
    } catch {
      return urlStr.replace(/\//g, ' › ');
    }
  };

  // Helper to extract clean site/brand name
  const getSiteName = (item: SearchResult) => {
    try {
      const url = new URL(item.url);
      const host = url.hostname.replace(/^www\./, '');
      if (host.includes('microsoft')) return 'Microsoft';
      if (host.includes('apple')) return 'Apple';
      if (host.includes('play.google')) return 'Google Play';
      if (host.includes('wikipedia')) return 'Wikipedia';
      if (host.includes('github')) return 'GitHub';
      if (host.includes('zhihu')) return '知乎';
      if (host.includes('bilibili')) return 'Bilibili';
      if (host.includes('baidu')) return '百度';
      const main = host.split('.')[0] || host;
      return main.charAt(0).toUpperCase() + main.slice(1);
    } catch {
      return '网页索引';
    }
  };

  // Highlight search keywords in reddish-coral color (#f28b82) matching the reference screenshot
  const highlightSnippet = (snippet: string, searchQuery: string) => {
    if (!snippet) return null;
    if (!searchQuery || !searchQuery.trim()) return snippet;

    // Split search query into keywords
    const keywords = searchQuery
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    if (keywords.length === 0) return snippet;

    const pattern = new RegExp(`(${keywords.join('|')})`, 'gi');
    const parts = snippet.split(pattern);

    return parts.map((part, index) => {
      const isMatch = keywords.some((k) => new RegExp(`^${k}$`, 'i').test(part));
      if (isMatch) {
        return (
          <span key={index} className="text-[#f28b82] font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 my-4 w-full">
        {[1, 2, 3, 4].map((idx) => (
          <div key={idx} className="space-y-2 animate-pulse">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-900" />
            <div className="h-4 w-5/6 rounded bg-slate-100 dark:bg-slate-900" />
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#1b1e26] p-10 text-center my-6 max-w-2xl mx-auto shadow-sm">
        <Globe className="h-10 w-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">未找到相关结果</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          您可以尝试更改搜索词，或在顶部分类中切换至全部、IT编程或学术分类。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 my-2 w-full text-slate-800 dark:text-slate-200 font-sans">
      {/* Modern Search Results List */}
      <div className="space-y-7">
        {filteredResults.map((item) => {
          const isSaved = savedIds.has(item.id);
          const siteName = getSiteName(item);
          const breadcrumb = formatBreadcrumb(item.url);

          return (
            <div
              key={item.id}
              className="group space-y-1 p-3.5 sm:p-4 rounded-2xl transition-all hover:bg-slate-100/80 dark:hover:bg-slate-800/30"
            >
              
              {/* Line 1: Favicon + Site Name + URL Breadcrumb + Options Menu */}
              <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center space-x-2.5 min-w-0">
                  {/* Circular Favicon Badge */}
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-200 dark:bg-[#2b303d] dark:border-slate-700/60 overflow-hidden">
                    <img
                      src={item.favicon || `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}`}
                      alt=""
                      className="h-4 w-4 object-contain"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  </div>

                  {/* Site Name and Breadcrumb */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{siteName}</span>
                    </div>
                    <span className="text-[11px] text-slate-600 dark:text-[#9aa0a6] truncate max-w-[340px] sm:max-w-[560px] font-sans">
                      {breadcrumb}
                    </span>
                  </div>
                </div>

                {/* Right Side Badges & Three Dots */}
                <div className="flex items-center space-x-2 text-[11px] shrink-0 ml-2">
                  {item.isConsensus && (
                    <span className="hidden sm:inline-block rounded bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold" title="多搜索引擎结果一致验证">
                      ✨ {item.sourcesCount} 源共识
                    </span>
                  )}
                  <span className="hidden sm:inline-block rounded bg-slate-100 px-2 py-0.5 text-cyan-800 border border-cyan-200 dark:bg-[#272b36] dark:text-cyan-300 dark:border-cyan-500/30 font-mono text-[10px]" title="SearXNG 引擎来源">
                    SearXNG · {item.engine}
                  </span>
                  <button className="text-slate-400 hover:text-slate-800 dark:text-[#9aa0a6] dark:hover:text-slate-100 p-1 rounded transition-colors" title="更多选项">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Line 2: Large Title Link */}
              <h3 className="text-lg sm:text-xl font-medium text-blue-700 hover:text-blue-900 dark:text-[#8ab4f8] dark:hover:text-blue-300 hover:underline cursor-pointer pt-0.5 leading-snug">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  {item.title}
                </a>
              </h3>

              {/* Line 3: Snippet Description with Highlighted Keywords */}
              <p className="text-sm text-slate-700 dark:text-[#bdc1c6] leading-relaxed line-clamp-3 font-normal">
                {item.publishedDate && (
                  <span className="text-slate-500 dark:text-slate-400 mr-1.5 font-medium">{item.publishedDate} —</span>
                )}
                {highlightSnippet(item.snippet, query)}
              </p>

              {/* Line 3.5: Matched Keywords Pills Tag Bar */}
              {item.matchedKeywords && item.matchedKeywords.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center space-x-1">
                    <span className="text-emerald-600 dark:text-emerald-400">🎯</span>
                    <span>匹配词:</span>
                  </span>
                  {item.matchedKeywords.slice(0, 5).map((kw, kwIdx) => (
                    <span
                      key={kwIdx}
                      className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800 border border-emerald-200 dark:bg-[#252a38] dark:text-emerald-300 dark:border-emerald-500/25 shadow-xs"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Line 4: Action Bar */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-[#9aa0a6] pt-1 opacity-90 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleCopyLink(item.url, item.id)}
                  className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors flex items-center space-x-1"
                >
                  {copiedId === item.id ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedId === item.id ? '已复制链接' : '复制链接'}</span>
                </button>

                <button
                  onClick={() => onSaveToOffline(item)}
                  className={`transition-all flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs ${
                    isSaved
                      ? 'bg-cyan-50 text-cyan-800 border border-cyan-200 font-medium dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-[#27272a]'
                  }`}
                  title={isSaved ? '已在离线数据库中缓存' : '保存该网页条目至本地离线缓存'}
                >
                  {isSaved ? <BookmarkCheck className="h-3 w-3 text-cyan-600 dark:text-cyan-400" /> : <Bookmark className="h-3 w-3" />}
                  <span>{isSaved ? '已存离线' : '离线保存'}</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Google Style Pagination Bar */}
      {onPageChange && (
        <GooglePagination
          currentPage={currentPage}
          totalPages={filterEngine !== 'all' ? Math.max(1, Math.ceil(filteredResults.length / 10)) : Math.max(1, totalPages)}
          totalResults={filterEngine !== 'all' ? filteredResults.length : (totalResults || results.length)}
          onPageChange={onPageChange}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

