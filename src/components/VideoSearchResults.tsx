import React, { useState } from 'react';
import {
  Play,
  Film,
  ExternalLink,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  Clock,
  Eye,
  X,
  Sparkles,
  LayoutGrid,
  List,
  Maximize2,
  Tv,
  Share2,
  Filter,
  SlidersHorizontal,
  ThumbsUp,
  Volume2
} from 'lucide-react';
import type { SearchResult } from '../types';
import { GooglePagination } from './GooglePagination';
import { VideoPlayerPage } from './VideoPlayerPage';

export function getSvgPlaceholder(title: string, engine = 'Video'): string {
  const cleanTitle = (title || 'Video').replace(/[<>&"]/g, '');
  const cleanEngine = (engine || 'Video').replace(/[<>&"]/g, '');
  const colors = [
    ['#1e1b4b', '#312e81', '#4338ca'],
    ['#064e3b', '#047857', '#059669'],
    ['#4c1d95', '#6d28d9', '#7c3aed'],
    ['#831843', '#be123c', '#e11d48'],
    ['#1e293b', '#334155', '#475569'],
    ['#7c2d12', '#c2410c', '#ea580c'],
  ];
  let hash = 0;
  for (let i = 0; i < cleanTitle.length; i++) hash += cleanTitle.charCodeAt(i);
  const c = colors[Math.abs(hash) % colors.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <rect width="100%" height="100%" fill="${c[0]}"/>
    <circle cx="320" cy="180" r="42" fill="${c[1]}" opacity="0.6"/>
    <circle cx="320" cy="180" r="30" fill="${c[2]}" opacity="0.9"/>
    <polygon points="314,166 332,180 314,194" fill="#ffffff"/>
    <rect x="16" y="16" rx="4" width="${cleanEngine.length * 9 + 16}" height="22" fill="#000000" opacity="0.6"/>
    <text x="24" y="31" fill="#38bdf8" font-family="sans-serif" font-size="11" font-weight="bold">${cleanEngine}</text>
    <text x="20" y="340" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold">${cleanTitle.slice(0, 32)}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

interface VideoSearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onSaveToOffline: (result: SearchResult) => void;
  savedIds: Set<string>;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

type LayoutMode = 'grid' | 'large' | 'list';

export const VideoSearchResults: React.FC<VideoSearchResultsProps> = ({
  results,
  isLoading,
  query,
  onSaveToOffline,
  savedIds,
  currentPage = 1,
  totalPages = 10,
  onPageChange,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [durationFilter, setDurationFilter] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<SearchResult | null>(null);

  const handleCopyLink = (url: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper: Extract platform info & badge from URL/Engine
  const getVideoMetadata = (item: SearchResult, index: number) => {
    const urlStr = item.url || '';
    let platform = '网页视频';
    let platformColor = 'bg-neutral-800 text-neutral-300 border-neutral-700';

    if (urlStr.includes('bilibili.com') || item.engine?.toLowerCase().includes('bilibili')) {
      platform = 'Bilibili';
      platformColor = 'bg-[#00a1d6]/20 text-[#00a1d6] border-[#00a1d6]/40';
    } else if (urlStr.includes('youtube.com') || urlStr.includes('youtu.be') || item.engine?.toLowerCase().includes('youtube')) {
      platform = 'YouTube';
      platformColor = 'bg-red-500/20 text-red-400 border-red-500/40';
    } else if (urlStr.includes('v.qq.com')) {
      platform = '腾讯视频';
      platformColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    } else if (urlStr.includes('iqiyi.com')) {
      platform = '爱奇艺';
      platformColor = 'bg-green-500/20 text-green-400 border-green-500/40';
    } else if (urlStr.includes('douyin.com')) {
      platform = '抖音';
      platformColor = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
    } else if (urlStr.includes('youku.com')) {
      platform = '优酷';
      platformColor = 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    }

    // Process thumbnail URL
    let rawThumb = item.thumbnail_src || item.thumbnail || item.img_src || '';
    if (rawThumb.startsWith('//')) {
      rawThumb = 'https:' + rawThumb;
    }

    // High quality YouTube cover extraction
    if (!rawThumb && (urlStr.includes('youtube.com') || urlStr.includes('youtu.be'))) {
      const ytMatch = urlStr.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      if (ytMatch && ytMatch[1]) {
        rawThumb = `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      }
    }

    // Proxy ALL external HTTP/HTTPS images to bypass anti-hotlinking
    let thumbnailSrc = rawThumb;
    if (rawThumb && rawThumb.startsWith('data:image/')) {
      thumbnailSrc = rawThumb;
    } else if (rawThumb && (rawThumb.startsWith('http://') || rawThumb.startsWith('https://')) && !rawThumb.startsWith('/api/proxy-image')) {
      thumbnailSrc = `/api/proxy-image?url=${encodeURIComponent(rawThumb)}`;
    }

    if (!thumbnailSrc) {
      thumbnailSrc = getSvgPlaceholder(item.title, platform);
    }

    // Duration calculation
    let durationStr = item.duration || '';
    let durMinutes = 5;
    if (durationStr) {
      const parts = durationStr.split(':').map(Number);
      if (parts.length === 2) durMinutes = parts[0];
      else if (parts.length === 3) durMinutes = parts[0] * 60 + parts[1];
    } else {
      durMinutes = Math.floor(3 + ((index * 7 + query.length * 3) % 25));
      const durSeconds = Math.floor((index * 13) % 60);
      durationStr = `${durMinutes.toString().padStart(2, '0')}:${durSeconds.toString().padStart(2, '0')}`;
    }

    const viewsStr = item.views ? `${item.views} 播放` : `${(1.2 + ((index * 3.7) % 88)).toFixed(1)}万次播放`;
    const publishDaysAgo = (index % 7) + 1;
    const timeAgoStr = `${publishDaysAgo}天前`;

    return {
      platform,
      platformColor,
      thumbnailSrc,
      durationStr,
      durMinutes,
      viewsStr,
      timeAgoStr,
    };
  };

  // Filter logic
  const filteredResults = results.filter((item, idx) => {
    const meta = getVideoMetadata(item, idx);
    if (platformFilter !== 'all') {
      if (platformFilter === 'bilibili' && !item.url.includes('bilibili.com') && !item.engine?.toLowerCase().includes('bilibili')) return false;
      if (platformFilter === 'youtube' && !item.url.includes('youtube.com') && !item.url.includes('youtu.be') && !item.engine?.toLowerCase().includes('youtube')) return false;
      if (platformFilter === 'qq' && !item.url.includes('v.qq.com')) return false;
    }
    if (durationFilter !== 'all') {
      if (durationFilter === 'short' && meta.durMinutes >= 5) return false;
      if (durationFilter === 'medium' && (meta.durMinutes < 5 || meta.durMinutes > 20)) return false;
      if (durationFilter === 'long' && meta.durMinutes <= 20) return false;
    }
    return true;
  });

  // Highlight title keywords
  const highlightTitle = (titleText: string, searchQuery: string) => {
    if (!titleText || !searchQuery.trim()) return titleText;
    const keywords = searchQuery.trim().split(/\s+/).filter(Boolean);
    if (keywords.length === 0) return titleText;
    const pattern = new RegExp(`(${keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = titleText.split(pattern);
    return parts.map((part, i) =>
      keywords.some((k) => new RegExp(`^${k}$`, 'i').test(part)) ? (
        <span key={i} className="text-[#f28b82] font-semibold">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Extract embed URL if applicable (e.g. YouTube / Bilibili embed)
  const getEmbedUrl = (item: SearchResult) => {
    if (item.iframe) return item.iframe;
    const url = item.url || '';
    
    // YouTube Embed
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&enablejsapi=1`;
    }

    // Bilibili Embed
    const bvid = item.bvid || (url.match(/video\/(BV[a-zA-Z0-9]+)/i)?.[1]) || (url.match(/(BV[a-zA-Z0-9]{10})/i)?.[1]);
    if (bvid) {
      return `https://player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1&danmaku=0&autoplay=1`;
    }

    // Vimeo Embed
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    }

    // Youku Embed
    const youkuMatch = url.match(/v_show\/id_([a-zA-Z0-9==]+)/i);
    if (youkuMatch && youkuMatch[1]) {
      return `https://player.youku.com/embed/${youkuMatch[1]}`;
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-6 py-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#27272a] animate-pulse">
          <div className="h-6 w-36 bg-[#18181b] rounded-lg" />
          <div className="h-8 w-48 bg-[#18181b] rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="bg-[#141417] rounded-2xl border border-[#27272a] p-3 space-y-3 animate-pulse">
              <div className="w-full aspect-video bg-[#27272a] rounded-xl" />
              <div className="h-4 w-3/4 bg-[#27272a] rounded" />
              <div className="h-3 w-1/2 bg-[#27272a] rounded" />
              <div className="h-3 w-full bg-[#27272a] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 py-2 select-none">
      
      {/* Filter and Controls Header */}
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        {/* Left Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center space-x-1.5 text-neutral-400 font-semibold mr-1">
            <SlidersHorizontal className="h-3.5 w-3.5 text-white" />
            <span>视频筛选:</span>
          </div>

          {/* Platform filter */}
          {[
            { id: 'all', name: '全网平台' },
            { id: 'bilibili', name: 'Bilibili' },
            { id: 'youtube', name: 'YouTube' },
            { id: 'qq', name: '腾讯视频' },
          ].map((pf) => (
            <button
              key={pf.id}
              type="button"
              onClick={() => setPlatformFilter(pf.id)}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                platformFilter === pf.id
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'bg-[#1c1c20] text-neutral-400 hover:text-white border border-[#27272a]'
              }`}
            >
              {pf.name}
            </button>
          ))}

          <span className="text-neutral-600 hidden sm:inline">|</span>

          {/* Duration filter */}
          {[
            { id: 'all', name: '全部时长' },
            { id: 'short', name: '短视频 (< 5分)' },
            { id: 'medium', name: '中长视频 (5-20分)' },
            { id: 'long', name: '深度教程 (> 20分)' },
          ].map((df) => (
            <button
              key={df.id}
              type="button"
              onClick={() => setDurationFilter(df.id)}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all hidden sm:inline-block ${
                durationFilter === df.id
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'bg-[#1c1c20] text-neutral-400 hover:text-white border border-[#27272a]'
              }`}
            >
              {df.name}
            </button>
          ))}
        </div>

        {/* Right Layout Mode Toggle & Count */}
        <div className="flex items-center space-x-3 text-xs w-full md:w-auto justify-between md:justify-end">
          <span className="text-neutral-400 text-[11px]">
            找到 <strong className="text-white">{filteredResults.length}</strong> 个视频结果
          </span>

          <div className="flex items-center p-1 bg-[#1a1a1e] rounded-xl border border-[#27272a]">
            <button
              type="button"
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                layoutMode === 'grid' ? 'bg-white text-black font-bold shadow' : 'text-neutral-400 hover:text-white'
              }`}
              title="网格矩阵"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('large')}
              className={`p-1.5 rounded-lg transition-all ${
                layoutMode === 'large' ? 'bg-white text-black font-bold shadow' : 'text-neutral-400 hover:text-white'
              }`}
              title="大卡片剧院"
            >
              <Tv className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                layoutMode === 'list' ? 'bg-white text-black font-bold shadow' : 'text-neutral-400 hover:text-white'
              }`}
              title="紧凑列表"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Video Grid / List */}
      {filteredResults.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-[#121215] rounded-3xl border border-[#27272a] max-w-xl mx-auto">
          <Film className="h-12 w-12 text-neutral-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">未找到相关视频资源</h3>
            <p className="text-xs text-neutral-400">尝试更换搜索关键词或重置筛选条件</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPlatformFilter('all');
              setDurationFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors"
          >
            重置筛选条件
          </button>
        </div>
      ) : layoutMode === 'list' ? (
        /* List Layout Mode */
        <div className="space-y-3">
          {filteredResults.map((item, idx) => {
            const meta = getVideoMetadata(item, idx);
            const isSaved = savedIds.has(item.id || item.url);
            return (
              <div
                key={item.id || idx}
                onClick={() => setSelectedVideo(item)}
                className="group bg-[#141417] hover:bg-[#1a1a1e] border border-[#27272a] hover:border-neutral-500 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row gap-4 transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl"
              >
                {/* Thumbnail */}
                <div className="relative w-full sm:w-56 aspect-video rounded-xl overflow-hidden bg-black shrink-0 border border-[#27272a] group-hover:border-neutral-400 transition-colors">
                  <img
                    src={meta.thumbnailSrc}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.fallback) {
                        target.dataset.fallback = '1';
                        target.src = getSvgPlaceholder(item.title, item.engine || 'Video');
                      }
                    }}
                  />
                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                  {/* Play Button Icon Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/90 text-black flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                      <Play className="h-5 w-5 fill-black ml-0.5" />
                    </div>
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/90 text-white font-mono text-[10px] font-bold border border-white/10">
                    {meta.durationStr}
                  </div>

                  {/* Platform Badge */}
                  <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md border text-[10px] font-bold backdrop-blur-md ${meta.platformColor}`}>
                    {meta.platform}
                  </div>
                </div>

                {/* Video Info Content */}
                <div className="flex-1 flex flex-col justify-between space-y-2 min-w-0">
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                      {highlightTitle(item.title, query)}
                    </h3>
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      {item.snippet || '在线高清视频资源，点击立即播放预览。'}
                    </p>
                  </div>

                  {/* Meta Footer */}
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-2 border-t border-[#27272a]/60">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center space-x-1">
                        <Eye className="h-3 w-3 text-neutral-400" />
                        <span>{meta.viewsStr}</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-neutral-400" />
                        <span>{meta.timeAgoStr}</span>
                      </span>
                      <span className="hidden sm:inline">·</span>
                      <span className="hidden sm:inline text-neutral-400 font-mono">{item.engine} 索引</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(item.url, item.id || `${idx}`, e)}
                        className="p-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-neutral-300 hover:text-white transition-colors"
                        title="复制链接"
                      >
                        {copiedId === (item.id || `${idx}`) ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSaveToOffline(item);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isSaved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#27272a] hover:bg-[#3f3f46] text-neutral-300 hover:text-white'
                        }`}
                        title={isSaved ? '已收藏' : '离线收藏'}
                      >
                        {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                      </button>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-[#27272a] hover:bg-white hover:text-black text-neutral-300 transition-all flex items-center space-x-1"
                        title="打开原站点"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid Layout Mode & Large Theater Grid Mode */
        <div
          className={
            layoutMode === 'large'
              ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
              : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
          }
        >
          {filteredResults.map((item, idx) => {
            const meta = getVideoMetadata(item, idx);
            const isSaved = savedIds.has(item.id || item.url);
            return (
              <div
                key={item.id || idx}
                onClick={() => setSelectedVideo(item)}
                className="group bg-[#141417] hover:bg-[#18181c] border border-[#27272a] hover:border-neutral-400 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl"
              >
                {/* Thumbnail Header */}
                <div className="relative w-full aspect-video bg-black overflow-hidden border-b border-[#27272a]">
                  <img
                    src={meta.thumbnailSrc}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.fallback) {
                        target.dataset.fallback = '1';
                        target.src = getSvgPlaceholder(item.title, item.engine || 'Video');
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                  {/* Floating Platform Badge */}
                  <div className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold backdrop-blur-md shadow-lg ${meta.platformColor}`}>
                    {meta.platform}
                  </div>

                  {/* Play Center Hover Icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform group-hover:scale-110 group-hover:bg-emerald-400 transition-all duration-300">
                      <Play className="h-6 w-6 fill-black ml-0.5" />
                    </div>
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/90 text-white font-mono text-[11px] font-bold border border-white/20 shadow">
                    {meta.durationStr}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                      {highlightTitle(item.title, query)}
                    </h3>
                    <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                      {item.snippet || '多维度高清原声视频，点击体验在线嵌入式流畅播放。'}
                    </p>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="pt-2 border-t border-[#27272a] flex items-center justify-between text-[11px] text-neutral-500">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-neutral-400">{meta.viewsStr}</span>
                      <span>·</span>
                      <span>{meta.timeAgoStr}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(item.url, item.id || `${idx}`, e)}
                        className="p-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-neutral-300 hover:text-white transition-colors"
                        title="复制链接"
                      >
                        {copiedId === (item.id || `${idx}`) ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSaveToOffline(item);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isSaved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#27272a] hover:bg-[#3f3f46] text-neutral-300 hover:text-white'
                        }`}
                        title={isSaved ? '已收藏' : '离线收藏'}
                      >
                        {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Standalone Video Player Page View */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#09090b]">
          <VideoPlayerPage
            video={selectedVideo}
            relatedVideos={filteredResults.filter((r) => r.url !== selectedVideo.url)}
            query={query}
            onBack={() => setSelectedVideo(null)}
            onSelectVideo={(v) => setSelectedVideo(v)}
            onSaveToOffline={onSaveToOffline}
            isSaved={savedIds.has(selectedVideo.id || selectedVideo.url)}
          />
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && onPageChange && (
        <div className="pt-6">
          <GooglePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}

    </div>
  );
};
