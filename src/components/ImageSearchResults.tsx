import React, { useState, useEffect } from 'react';
import { 
  Maximize2, 
  ExternalLink, 
  Copy, 
  Check, 
  Bookmark, 
  BookmarkCheck, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Filter, 
  Globe, 
  Image as ImageIcon,
  Loader2,
  Columns,
  LayoutGrid,
  Square
} from 'lucide-react';
import type { SearchResult } from '../types';
import { GooglePagination } from './GooglePagination';

interface ImageSearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onSaveToOffline: (result: SearchResult) => void;
  savedIds: Set<string>;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

type LayoutMode = 'adaptive' | 'grid' | 'large';

// Subcomponent for individual image card with skeleton loading, dynamic aspect ratio & error recovery
const ImageCard: React.FC<{
  item: SearchResult;
  index: number;
  query: string;
  isSaved: boolean;
  copiedId: string | null;
  layoutMode: LayoutMode;
  onSelect: () => void;
  onCopyLink: (url: string, id: string) => void;
  onSaveToOffline: (item: SearchResult) => void;
}> = ({
  item,
  query,
  isSaved,
  copiedId,
  layoutMode,
  onSelect,
  onCopyLink,
  onSaveToOffline,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(() => {
    if (item.resolution && item.resolution.includes('x')) {
      const [w, h] = item.resolution.split('x').map(Number);
      if (w && h && h > 0) return w / h;
    }
    return null;
  });

  // Compute thumbnail URL cascade
  const getDisplaySrc = () => {
    if (isError) {
      return `https://loremflickr.com/500/375/${encodeURIComponent(query)}?lock=${item.id}`;
    }
    return item.thumbnail_src || item.thumbnail || item.img_src || item.url;
  };

  const displaySrc = getDisplaySrc();

  // Container aspect ratio class / inline style depending on layoutMode
  const getContainerStyle = () => {
    if (layoutMode === 'adaptive') {
      if (aspectRatio) {
        // Clamp aspect ratio between 0.6 (very tall) and 2.2 (ultra wide) for aesthetic stability
        const clampedRatio = Math.max(0.6, Math.min(2.2, aspectRatio));
        return { aspectRatio: `${clampedRatio}` };
      }
      return undefined; // Natural height if aspect ratio is not yet known
    }
    return undefined;
  };

  const getContainerAspectClass = () => {
    if (layoutMode === 'grid') return 'aspect-[4/3]';
    if (layoutMode === 'large') return 'aspect-[16/9] sm:aspect-[21/9]';
    if (layoutMode === 'adaptive' && !aspectRatio) return 'min-h-[160px]';
    return '';
  };

  return (
    <div
      className={`group relative bg-[#141417] rounded-2xl border border-[#27272a] hover:border-neutral-500 overflow-hidden transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl flex flex-col justify-between ${
        layoutMode === 'adaptive' ? 'break-inside-avoid mb-3 sm:mb-4' : ''
      }`}
      onClick={onSelect}
    >
      {/* Image Container */}
      <div 
        className={`relative w-full bg-neutral-900 overflow-hidden flex items-center justify-center ${getContainerAspectClass()}`}
        style={getContainerStyle()}
      >
        {/* Shimmer Placeholder while loading */}
        {!isLoaded && !isError && (
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 bg-[length:200%_100%] animate-pulse" />
        )}

        <img
          src={displaySrc}
          alt={item.title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={(e) => {
            setIsLoaded(true);
            if (!aspectRatio && e.currentTarget.naturalWidth && e.currentTarget.naturalHeight) {
              setAspectRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight);
            }
          }}
          onError={() => {
            if (!isError) {
              setIsError(true);
              setIsLoaded(true);
            }
          }}
          className={`w-full h-full group-hover:scale-105 transition-all duration-300 ${
            layoutMode === 'adaptive' && aspectRatio ? 'object-cover' : layoutMode === 'adaptive' ? 'object-contain h-auto max-h-[450px]' : 'object-cover'
          } ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        />

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2.5 flex flex-col justify-between z-10">
          
          {/* Top Bar: Resolution + Source Tag */}
          <div className="flex items-center justify-between text-[10px] font-mono font-medium text-white">
            <span className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
              {item.resolution || 'HD 4K'}
            </span>
            <span className="bg-purple-900/80 backdrop-blur-md px-2 py-0.5 rounded-md text-purple-200 border border-purple-500/30">
              {item.engine}
            </span>
          </div>

          {/* Bottom Bar: Action Buttons */}
          <div className="flex items-center justify-between gap-1 pt-2">
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const rawUrl = item.img_src || item.thumbnail_src || item.thumbnail || item.url;
                  onCopyLink(rawUrl, item.id);
                }}
                className="p-1.5 bg-black/70 hover:bg-white hover:text-black rounded-lg text-white transition-colors border border-white/10"
                title="复制图片直链"
              >
                {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveToOffline(item);
                }}
                className="p-1.5 bg-black/70 hover:bg-white hover:text-black rounded-lg text-white transition-colors border border-white/10"
                title={isSaved ? '已存离线' : '存至离线'}
              >
                {isSaved ? <BookmarkCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Bookmark className="h-3.5 w-3.5" />}
              </button>
            </div>

            <span className="flex items-center space-x-1 text-[11px] font-medium text-white bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg backdrop-blur-md border border-white/20">
              <Maximize2 className="h-3 w-3" />
              <span>查看原图</span>
            </span>
          </div>

        </div>
      </div>

      {/* Title & Author Info */}
      <div className="p-2.5 bg-[#121215]">
        <h4 className="text-xs text-neutral-200 font-medium line-clamp-1 group-hover:text-white transition-colors">
          {item.title}
        </h4>
        <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-1 font-mono">
          <span className="truncate max-w-[140px]">{item.author || item.engine}</span>
          <span>{item.resolution || 'HD'}</span>
        </div>
      </div>
    </div>
  );
};

export const ImageSearchResults: React.FC<ImageSearchResultsProps> = ({
  results,
  isLoading,
  query,
  onSaveToOffline,
  savedIds,
  currentPage = 1,
  totalPages = 10,
  onPageChange,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [orientationFilter, setOrientationFilter] = useState<'all' | 'landscape' | 'portrait' | 'square'>('all');
  const [engineFilter, setEngineFilter] = useState<string>('all');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('adaptive');
  const [lightboxLoaded, setLightboxLoaded] = useState<boolean>(false);

  // Available image engines from results
  const presentEngines = Array.from(new Set(results.map((r) => r.engine)));

  // Filter image results
  const filteredResults = results.filter((r) => {
    if (engineFilter !== 'all' && r.engine !== engineFilter) return false;
    
    if (orientationFilter !== 'all') {
      const res = r.resolution || '';
      if (res.includes('x')) {
        const [w, h] = res.split('x').map(Number);
        if (w && h) {
          if (orientationFilter === 'landscape' && w <= h) return false;
          if (orientationFilter === 'portrait' && h <= w) return false;
          if (orientationFilter === 'square' && Math.abs(w - h) > 100) return false;
        }
      }
    }
    return true;
  });

  const activeImage = selectedImageIndex !== null ? filteredResults[selectedImageIndex] : null;

  // Reset lightbox loaded state when active image changes & Preload nearby images
  useEffect(() => {
    if (selectedImageIndex === null) {
      setLightboxLoaded(false);
      return;
    }
    setLightboxLoaded(false);

    // Preload next and previous image for instant modal switching
    const preloadIndexes = [
      (selectedImageIndex + 1) % filteredResults.length,
      (selectedImageIndex - 1 + filteredResults.length) % filteredResults.length
    ];

    preloadIndexes.forEach((idx) => {
      const item = filteredResults[idx];
      if (item) {
        const src = item.img_src || item.thumbnail_src || item.thumbnail || item.url;
        if (src) {
          const img = new Image();
          img.src = src;
        }
      }
    });
  }, [selectedImageIndex, filteredResults]);

  // Handle keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex === null) return;
      if (e.key === 'Escape') {
        setSelectedImageIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setSelectedImageIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredResults.length - 1));
      } else if (e.key === 'ArrowRight') {
        setSelectedImageIndex((prev) => (prev !== null && prev < filteredResults.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, filteredResults.length]);

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFullImageSrc = (item: SearchResult) => {
    return item.img_src || item.thumbnail_src || item.thumbnail || item.url;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 my-4 w-full">
        <div className="flex items-center justify-between text-xs text-neutral-400 pb-2 border-b border-[#27272a]">
          <div className="h-4 w-40 bg-neutral-800 rounded animate-pulse" />
          <div className="h-4 w-28 bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 20 }).map((_, idx) => (
            <div key={idx} className="aspect-[4/3] rounded-2xl bg-[#18181b] border border-[#27272a] animate-pulse overflow-hidden p-2 flex flex-col justify-between">
              <div className="w-full h-full bg-neutral-800/60 rounded-xl" />
              <div className="mt-2 h-3 w-3/4 bg-neutral-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-3xl border border-[#27272a] bg-[#121215] p-10 text-center my-6 max-w-xl mx-auto shadow-lg">
        <ImageIcon className="h-12 w-12 text-neutral-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">未找到相关图片结果</h3>
        <p className="text-xs text-neutral-400 mt-1">
          您可以尝试更改关键词，如“自然风光”、“科技背景”、“城市夜景”，重新探索更多高清视觉素材。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 my-2 w-full text-neutral-200 font-sans">
      
      {/* Image Filters & Layout Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#27272a] text-xs">
        
        {/* Left: Quick Orientation Chips & Layout Switcher */}
        <div className="flex items-center space-x-3 overflow-x-auto scrollbar-none py-0.5">
          {/* Layout Mode Toggle */}
          <div className="flex items-center bg-[#18181b] p-1 rounded-xl border border-[#27272a] shrink-0">
            <button
              onClick={() => setLayoutMode('adaptive')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                layoutMode === 'adaptive'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="瀑布流自适应布局 (自然比例)"
            >
              <Columns className="h-3.5 w-3.5" />
              <span>自适应瀑布流</span>
            </button>
            <button
              onClick={() => setLayoutMode('grid')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                layoutMode === 'grid'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="均分网格布局 (4:3 标准比例)"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>等高网格</span>
            </button>
            <button
              onClick={() => setLayoutMode('large')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                layoutMode === 'large'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="大图全景视角"
            >
              <Square className="h-3.5 w-3.5" />
              <span>大图视角</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-[#27272a] shrink-0" />

          {/* Orientation Filter */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <span className="text-neutral-400 font-medium mr-0.5 flex items-center space-x-1">
              <Filter className="h-3.5 w-3.5 text-neutral-400" />
              <span>比例:</span>
            </span>
            {[
              { id: 'all', name: '全部图片' },
              { id: 'landscape', name: '横屏/壁纸' },
              { id: 'portrait', name: '竖屏/海报' },
              { id: 'square', name: '正方形' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setOrientationFilter(chip.id as any)}
                className={`px-3 py-1 rounded-full text-xs transition-all ${
                  orientationFilter === chip.id
                    ? 'bg-white text-black font-semibold shadow-xs'
                    : 'bg-[#18181b] text-neutral-400 hover:text-white border border-[#27272a]'
                }`}
              >
                {chip.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Engine Filter & Results Count */}
        <div className="flex items-center space-x-3 text-neutral-400 text-xs shrink-0 ml-auto">
          {presentEngines.length > 1 && (
            <div className="flex items-center space-x-1 bg-[#18181b] px-2 py-1 rounded-lg border border-[#27272a]">
              <Globe className="h-3 w-3 text-neutral-500" />
              <select
                value={engineFilter}
                onChange={(e) => setEngineFilter(e.target.value)}
                className="bg-transparent text-white text-xs outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#18181b]">全部图片引擎 ({results.length})</option>
                {presentEngines.map((eng) => (
                  <option key={eng} value={eng} className="bg-[#18181b]">{eng}</option>
                ))}
              </select>
            </div>
          )}
          <span className="text-neutral-500 font-mono text-[11px]">
            显示 {filteredResults.length} 张高清图片
          </span>
        </div>

      </div>

      {/* Responsive Image Display according to layoutMode */}
      {layoutMode === 'adaptive' ? (
        /* CSS Columns Masonry Layout */
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3 sm:gap-4 space-y-3 sm:space-y-4">
          {filteredResults.map((item, index) => (
            <ImageCard
              key={item.id}
              item={item}
              index={index}
              query={query}
              isSaved={savedIds.has(item.id)}
              copiedId={copiedId}
              layoutMode="adaptive"
              onSelect={() => setSelectedImageIndex(index)}
              onCopyLink={handleCopyLink}
              onSaveToOffline={onSaveToOffline}
            />
          ))}
        </div>
      ) : layoutMode === 'grid' ? (
        /* Fixed Aspect Grid Layout */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {filteredResults.map((item, index) => (
            <ImageCard
              key={item.id}
              item={item}
              index={index}
              query={query}
              isSaved={savedIds.has(item.id)}
              copiedId={copiedId}
              layoutMode="grid"
              onSelect={() => setSelectedImageIndex(index)}
              onCopyLink={handleCopyLink}
              onSaveToOffline={onSaveToOffline}
            />
          ))}
        </div>
      ) : (
        /* Large Preview Card Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredResults.map((item, index) => (
            <ImageCard
              key={item.id}
              item={item}
              index={index}
              query={query}
              isSaved={savedIds.has(item.id)}
              copiedId={copiedId}
              layoutMode="large"
              onSelect={() => setSelectedImageIndex(index)}
              onCopyLink={handleCopyLink}
              onSaveToOffline={onSaveToOffline}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="pt-6 pb-2">
          <GooglePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}

      {/* Interactive Lightbox Modal */}
      {activeImage && selectedImageIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedImageIndex(null)}
        >
          {/* Lightbox Header */}
          <div
            className="flex items-center justify-between gap-4 text-white z-10 max-w-7xl w-full mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 truncate">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-purple-400 border border-neutral-700">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div className="truncate">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">{activeImage.title}</h3>
                <p className="text-xs text-neutral-400 font-mono flex items-center space-x-2">
                  <span>{activeImage.author || activeImage.engine}</span>
                  <span>•</span>
                  <span>{activeImage.resolution || '高清原图'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <a
                href={activeImage.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-xs font-semibold rounded-xl text-white transition-colors border border-neutral-600"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">访问原网页</span>
              </a>
              <button
                onClick={() => setSelectedImageIndex(null)}
                className="p-2 bg-[#27272a] hover:bg-[#3f3f46] rounded-full text-neutral-300 hover:text-white transition-colors border border-neutral-600"
                title="关闭 (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Main Preview */}
          <div
            className="relative flex-1 flex items-center justify-center py-4 my-2 overflow-hidden max-w-7xl w-full mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev Image Button */}
            <button
              onClick={() => setSelectedImageIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredResults.length - 1))}
              className="absolute left-2 sm:left-4 z-20 p-3 rounded-full bg-black/60 hover:bg-white hover:text-black text-white backdrop-blur-md transition-all border border-white/20 shadow-2xl"
              title="上一张 (←)"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            {/* Main High Res Image */}
            <div className="relative max-h-full max-w-full flex items-center justify-center p-2 min-h-[300px]">
              {!lightboxLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 text-neutral-400">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                  <span className="text-xs font-mono">高清大图载入中...</span>
                </div>
              )}
              <img
                src={getFullImageSrc(activeImage)}
                alt={activeImage.title}
                decoding="async"
                referrerPolicy="no-referrer"
                onLoad={() => setLightboxLoaded(true)}
                onError={() => setLightboxLoaded(true)}
                className={`max-h-[75vh] max-w-[88vw] object-contain rounded-2xl shadow-2xl border border-neutral-800 transition-opacity duration-300 ${
                  lightboxLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </div>

            {/* Next Image Button */}
            <button
              onClick={() => setSelectedImageIndex((prev) => (prev !== null && prev < filteredResults.length - 1 ? prev + 1 : 0))}
              className="absolute right-2 sm:right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-white hover:text-black text-white backdrop-blur-md transition-all border border-white/20 shadow-2xl"
              title="下一张 (→)"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Lightbox Footer Bar */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-300 max-w-7xl w-full mx-auto bg-[#18181b]/80 backdrop-blur-md p-3.5 rounded-2xl border border-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-2 text-neutral-400">
              <span className="font-mono text-white">
                {selectedImageIndex + 1} / {filteredResults.length}
              </span>
              <span>•</span>
              <span className="line-clamp-1">{activeImage.snippet}</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleCopyLink(getFullImageSrc(activeImage), activeImage.id)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors border border-neutral-700"
              >
                {copiedId === activeImage.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedId === activeImage.id ? '已复制' : '复制直链'}</span>
              </button>
              
              <a
                href={getFullImageSrc(activeImage)}
                download={`${query}_image.jpg`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-white text-black font-semibold hover:bg-neutral-200 rounded-xl transition-colors shadow-md"
              >
                <Download className="h-3.5 w-3.5" />
                <span>下载原图</span>
              </a>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
