import React, { useState } from 'react';
import { Copy, Check, Bookmark, BookmarkCheck, Globe, Filter, MoreVertical, Sparkles, Bot, RefreshCw } from 'lucide-react';
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
  onPageChange?: (page: number) => void;
  onAiTriggerSearXNGSearch?: () => void;
  isAiSyncing?: boolean;
}

export const SearchResultsList: React.FC<SearchResultsListProps> = ({
  results,
  isLoading,
  query,
  onSaveToOffline,
  savedIds,
  currentPage = 1,
  totalPages = 10,
  onPageChange,
  onAiTriggerSearXNGSearch,
  isAiSyncing = false,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterEngine, setFilterEngine] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'latency' | 'consensus'>('score');

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const presentEngines = Array.from(new Set(results.map((r) => r.engine)));
  const allKnownEngines = ['Google', 'Bing', 'DuckDuckGo', 'Baidu'];
  const engines = Array.from(new Set([...presentEngines, ...allKnownEngines.filter(e => presentEngines.includes(e))]));
  const filterableEngines = engines.length > 0 ? engines : allKnownEngines;

  const filteredResults = results
    .filter((r) => filterEngine === 'all' || r.engine === filterEngine)
    .sort((a, b) => {
      if (sortBy === 'latency') return a.latencyMs - b.latencyMs;
      if (sortBy === 'consensus') return (b.sourcesCount || 1) - (a.sourcesCount || 1);
      return (b.score || 0) - (a.score || 0);
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
              <div className="h-5 w-5 rounded-full bg-slate-800" />
              <div className="h-3 w-32 rounded bg-slate-800" />
            </div>
            <div className="h-5 w-2/3 rounded bg-slate-800" />
            <div className="h-4 w-full rounded bg-slate-900" />
            <div className="h-4 w-5/6 rounded bg-slate-900" />
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-[#1b1e26] p-10 text-center my-6 max-w-2xl mx-auto shadow-sm">
        <Globe className="h-10 w-10 text-slate-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">未找到相关结果</h3>
        <p className="text-xs text-slate-400 mt-1">
          您可以尝试更改搜索词，或在顶部分类中切换至全部、IT编程或学术分类。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 my-2 w-full text-slate-200 font-sans">
      
      {/* Page 1 AI Precision SearXNG Sync Banner (Hidden as requested) */}
      {false && currentPage === 1 && (
        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/25 via-indigo-900/20 to-[#18181b] p-3.5 sm:p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 mt-0.5">
              <Sparkles className="h-4 w-4 text-purple-300 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <span>✨ 第 1 页：AI 智搜精选 & 已同步 SearXNG 全局接口</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-200 border border-purple-500/30">
                  AI 算法加权重排
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                本页内容经过 AI 调取 SearXNG API 深度过滤与多维加权，权威内容优先展示，确保检索精准度。
              </p>
            </div>
          </div>

          {onAiTriggerSearXNGSearch && (
            <button
              onClick={onAiTriggerSearXNGSearch}
              disabled={isAiSyncing}
              className="shrink-0 flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-semibold shadow-md border border-purple-400/30 transition-all disabled:opacity-50"
              title="调起 AI 重新调用 SearXNG 接口并同步列表"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isAiSyncing ? 'animate-spin' : ''}`} />
              <span>{isAiSyncing ? 'AI 检索同步中...' : 'AI 调取 SearXNG 重新同步'}</span>
            </button>
          )}
        </div>
      )}

      {/* Top Search Result Meta Bar & Optional Site-specific Link */}
      <div className="hidden flex-wrap items-center justify-between gap-2 text-xs text-slate-400 border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2">
          {query && (
            <a
              href={`https://www.bing.com/search?q=${encodeURIComponent(query)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8ab4f8] hover:underline flex items-center space-x-1 font-medium"
            >
              <span>{query.length > 20 ? query.slice(0, 20) + '...' : query} 站内的其它相关信息 »</span>
            </a>
          )}
          <span className="text-slate-500">·</span>
          <span>找到约 <span className="font-bold text-slate-200">{filteredResults.length}</span> 条聚合网页结果</span>
          <span className="text-slate-500">·</span>
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" title="搜索数据由 SearXNG 隐私元搜索 API 实时请求并发获取">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>SearXNG 元搜索 API 驱动</span>
          </span>
          <span className="text-slate-500">·</span>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20" title="接口响应已通过 jsDelivr 边缘 CDN 加速分发">
            <span>⚡ jsDelivr CDN 极速加速</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Engine Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
            <button
              type="button"
              onClick={() => setFilterEngine('all')}
              className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                filterEngine === 'all'
                  ? 'bg-slate-200 text-slate-900 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              所有 ({results.length})
            </button>
            {['Bing', 'Google', 'DuckDuckGo', 'Baidu'].map((eng) => {
              const count = results.filter((r) => r.engine === eng).length;
              const isActive = filterEngine === eng;
              return (
                <button
                  key={eng}
                  type="button"
                  onClick={() => setFilterEngine(eng)}
                  className={`rounded-full px-2.5 py-0.5 text-xs transition-colors flex items-center space-x-1 ${
                    isActive
                      ? 'bg-[#8ab4f8] text-slate-950 font-bold'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span>{eng}</span>
                  <span className={`text-[10px] ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filter Dropdown */}
          <div className="flex items-center space-x-1">
            <Filter className="h-3 w-3 text-slate-400" />
            <select
              value={filterEngine}
              onChange={(e) => setFilterEngine(e.target.value)}
              className="rounded-md border border-slate-700 bg-[#242832] px-2 py-0.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">所有检索源 ({filterableEngines.length})</option>
              {filterableEngines.map((eng) => (
                <option key={eng} value={eng}>{eng}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-1 border-l border-slate-700/60 pl-2">
            <button
              onClick={() => setSortBy('score')}
              className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                sortBy === 'score' ? 'bg-[#8ab4f8] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              🎯 精准相关度
            </button>
            <button
              onClick={() => setSortBy('consensus')}
              className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                sortBy === 'consensus' ? 'bg-[#8ab4f8] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              ✨ 多源共识
            </button>
            <button
              onClick={() => setSortBy('latency')}
              className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                sortBy === 'latency' ? 'bg-[#8ab4f8] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚡ 低延迟
            </button>
          </div>
        </div>
      </div>

      {/* Modern Bing/Google Dark Theme Results List */}
      <div className="space-y-7">
        {filteredResults.map((item) => {
          const isSaved = savedIds.has(item.id);
          const siteName = getSiteName(item);
          const breadcrumb = formatBreadcrumb(item.url);

          return (
            <div key={item.id} className="group space-y-1">
              
              {/* Line 1: Favicon + Site Name + URL Breadcrumb + Options Menu */}
              <div className="flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center space-x-2.5 min-w-0">
                  {/* Circular Favicon Badge */}
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2b303d] border border-slate-700/60 overflow-hidden">
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
                      <span className="text-sm font-normal text-slate-100 truncate">{siteName}</span>
                    </div>
                    <span className="text-[11px] text-[#9aa0a6] truncate max-w-[340px] sm:max-w-[560px] font-sans">
                      {breadcrumb}
                    </span>
                  </div>
                </div>

                {/* Right Side Badges & Three Dots */}
                <div className="flex items-center space-x-2 text-[11px] shrink-0 ml-2">
                  {item.isConsensus && (
                    <span className="hidden sm:inline-block rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold" title="多搜索引擎结果一致验证">
                      ✨ {item.sourcesCount} 源共识
                    </span>
                  )}
                  <span className="hidden sm:inline-block rounded bg-[#272b36] px-2 py-0.5 text-cyan-300 border border-cyan-500/30 font-mono text-[10px]" title="SearXNG 引擎来源">
                    SearXNG · {item.engine}
                  </span>
                  <button className="text-[#9aa0a6] hover:text-slate-100 p-1 rounded transition-colors" title="更多选项">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Line 2: Large Title Link in Google/Bing Blue */}
              <h3 className="text-lg sm:text-xl font-normal text-[#8ab4f8] hover:underline cursor-pointer pt-0.5 leading-snug">
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
              <p className="text-sm text-[#bdc1c6] leading-relaxed line-clamp-3 font-normal">
                {item.publishedDate && (
                  <span className="text-slate-400 mr-1.5 font-medium">{item.publishedDate} —</span>
                )}
                {highlightSnippet(item.snippet, query)}
              </p>

              {/* Line 3.5: Matched Keywords Pills Tag Bar */}
              {item.matchedKeywords && item.matchedKeywords.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-medium flex items-center space-x-1">
                    <span className="text-emerald-400">🎯</span>
                    <span>匹配词:</span>
                  </span>
                  {item.matchedKeywords.slice(0, 5).map((kw, kwIdx) => (
                    <span
                      key={kwIdx}
                      className="inline-flex items-center rounded-md bg-[#252a38] px-2 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/25 shadow-xs"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Line 4: Action Bar */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#9aa0a6] pt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleCopyLink(item.url, item.id)}
                  className="hover:text-slate-200 transition-colors flex items-center space-x-1"
                >
                  {copiedId === item.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedId === item.id ? '已复制链接' : '复制链接'}</span>
                </button>

                <button
                  onClick={() => onSaveToOffline(item)}
                  className={`hover:text-slate-200 transition-colors flex items-center space-x-1 ${
                    isSaved ? 'text-[#8ab4f8] font-medium' : ''
                  }`}
                >
                  {isSaved ? <BookmarkCheck className="h-3 w-3 text-[#8ab4f8]" /> : <Bookmark className="h-3 w-3" />}
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
          totalPages={totalPages}
          onPageChange={onPageChange}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

