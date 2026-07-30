import React, { useState } from 'react';
import { Copy, Check, Bookmark, BookmarkCheck, Globe, Filter, MoreVertical } from 'lucide-react';
import type { SearchResult } from '../types';

interface SearchResultsListProps {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onSaveToOffline: (result: SearchResult) => void;
  savedIds: Set<string>;
}

export const SearchResultsList: React.FC<SearchResultsListProps> = ({
  results,
  isLoading,
  query,
  onSaveToOffline,
  savedIds,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterEngine, setFilterEngine] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'latency'>('score');

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const engines = Array.from(new Set(results.map((r) => r.engine)));

  const filteredResults = results
    .filter((r) => filterEngine === 'all' || r.engine === filterEngine)
    .sort((a, b) => {
      if (sortBy === 'latency') return a.latencyMs - b.latencyMs;
      return b.score - a.score;
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
      <div className="space-y-6 my-4 w-full max-w-4xl">
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
    <div className="space-y-6 my-2 w-full max-w-4xl text-slate-200 font-sans">
      
      {/* Top Search Result Meta Bar & Optional Site-specific Link */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 border-b border-slate-800/80 pb-3">
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
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20" title="接口响应已通过 jsDelivr 边缘 CDN 加速分发">
            <span>⚡ jsDelivr CDN 极速加速</span>
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Filter by engine */}
          <div className="flex items-center space-x-1">
            <Filter className="h-3 w-3 text-slate-400" />
            <select
              value={filterEngine}
              onChange={(e) => setFilterEngine(e.target.value)}
              className="rounded-md border border-slate-700 bg-[#242832] px-2 py-0.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">所有检索源 ({engines.length})</option>
              {engines.map((eng) => (
                <option key={eng} value={eng}>{eng}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setSortBy('score')}
              className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                sortBy === 'score' ? 'bg-[#8ab4f8] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              相关度
            </button>
            <button
              onClick={() => setSortBy('latency')}
              className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                sortBy === 'latency' ? 'bg-[#8ab4f8] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              低延迟
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
                  <span className="hidden sm:inline-block rounded bg-[#272b36] px-1.5 py-0.5 text-slate-400 border border-slate-700/60 font-mono">
                    {item.engine} ({item.latencyMs}ms)
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

              {/* Line 4: Action Bar */}
              <div className="flex items-center space-x-4 text-xs text-[#9aa0a6] pt-1 opacity-80 group-hover:opacity-100 transition-opacity">
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
    </div>
  );
};

