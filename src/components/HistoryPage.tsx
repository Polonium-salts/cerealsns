import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  History,
  Star,
  Trash2,
  Download,
  Upload,
  Clock,
  Sparkles,
  Database,
  Globe,
  Code,
  BookOpen,
  Newspaper,
  Video,
  Image as ImageIcon,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Zap,
  SlidersHorizontal,
  LayoutList,
  LayoutGrid,
  CheckSquare,
  Square,
  ExternalLink,
  RotateCcw,
  Tag
} from 'lucide-react';
import type { SearchHistoryItem } from '../types';
import {
  getOfflineSearchHistory,
  toggleFavoriteSearch,
  deleteSearchHistoryItem,
  clearAllSearchHistory,
  exportHistoryJSON,
  importHistoryJSON
} from '../lib/indexedDB';

interface HistoryPageProps {
  onBack: () => void;
  onSelectHistoryItem: (item: SearchHistoryItem) => void;
}

const CATEGORY_MAP: Record<
  string,
  { label: string; icon: React.FC<{ className?: string }>; color: string; badgeBg: string }
> = {
  general: {
    label: '网页',
    icon: Globe,
    color: 'text-cyan-600 dark:text-cyan-400',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/50'
  },
  it: {
    label: 'IT代码',
    icon: Code,
    color: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50'
  },
  science: {
    label: '学术',
    icon: BookOpen,
    color: 'text-indigo-600 dark:text-indigo-400',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/50'
  },
  news: {
    label: '新闻',
    icon: Newspaper,
    color: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/50'
  },
  images: {
    label: '图片',
    icon: ImageIcon,
    color: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/50'
  },
  media: {
    label: '媒体',
    icon: ImageIcon,
    color: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/50'
  },
  videos: {
    label: '视频',
    icon: Video,
    color: 'text-fuchsia-600 dark:text-fuchsia-400',
    badgeBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40 border-fuchsia-200 dark:border-fuchsia-800/50'
  }
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} 分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`;
  const date = new Date(timestamp);
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

interface TimeGroup {
  id: string;
  title: string;
  items: SearchHistoryItem[];
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onBack, onSelectHistoryItem }) => {
  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_results'>('newest');
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [keyboardIndex, setKeyboardIndex] = useState<number>(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const reloadHistory = async () => {
    const items = await getOfflineSearchHistory(searchKeyword, categoryFilter);
    setHistoryItems(items);
  };

  useEffect(() => {
    reloadHistory();
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [searchKeyword, categoryFilter]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBack();
        return;
      }
      const flatItems = filteredAndSortedItems;
      if (flatItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setKeyboardIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setKeyboardIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
      } else if (e.key === 'Enter' && keyboardIndex >= 0 && keyboardIndex < flatItems.length) {
        e.preventDefault();
        onSelectHistoryItem(flatItems[keyboardIndex]);
      } else if (e.key === 'Delete' && keyboardIndex >= 0 && keyboardIndex < flatItems.length) {
        e.preventDefault();
        handleDelete(flatItems[keyboardIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardIndex, historyItems, searchKeyword, categoryFilter, sortBy]);

  const filteredAndSortedItems = useMemo(() => {
    let list = [...historyItems];

    if (categoryFilter === 'favorites') {
      list = list.filter((i) => i.isFavorite);
    } else if (categoryFilter === 'ai') {
      list = list.filter((i) => Boolean(i.aiSummaryPreview || i.aiSummaryFull));
    } else if (categoryFilter !== 'all') {
      list = list.filter((i) => i.category === categoryFilter);
    }

    if (sortBy === 'newest') {
      list.sort((a, b) => b.timestamp - a.timestamp);
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => a.timestamp - b.timestamp);
    } else if (sortBy === 'most_results') {
      list.sort((a, b) => b.resultCount - a.resultCount);
    }

    return list;
  }, [historyItems, categoryFilter, sortBy]);

  // Group items by time
  const timeGroups = useMemo<TimeGroup[]>(() => {
    const now = Date.now();
    const fiveMinsAgo = now - 5 * 60 * 1000;
    const todayDate = new Date();
    const startOfToday = new Date(
      todayDate.getFullYear(),
      todayDate.getMonth(),
      todayDate.getDate()
    ).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfThisWeek = startOfToday - 6 * 24 * 60 * 1000;

    const justNowItems: SearchHistoryItem[] = [];
    const todayItems: SearchHistoryItem[] = [];
    const yesterdayItems: SearchHistoryItem[] = [];
    const thisWeekItems: SearchHistoryItem[] = [];
    const earlierItems: SearchHistoryItem[] = [];

    filteredAndSortedItems.forEach((item) => {
      if (item.timestamp >= fiveMinsAgo) {
        justNowItems.push(item);
      } else if (item.timestamp >= startOfToday) {
        todayItems.push(item);
      } else if (item.timestamp >= startOfYesterday) {
        yesterdayItems.push(item);
      } else if (item.timestamp >= startOfThisWeek) {
        thisWeekItems.push(item);
      } else {
        earlierItems.push(item);
      }
    });

    return [
      { id: 'justNow', title: '刚刚', items: justNowItems },
      { id: 'today', title: '今天', items: todayItems },
      { id: 'yesterday', title: '昨天', items: yesterdayItems },
      { id: 'thisWeek', title: '本周', items: thisWeekItems },
      { id: 'earlier', title: '更早之前', items: earlierItems }
    ].filter((g) => g.items.length > 0);
  }, [filteredAndSortedItems]);

  const handleToggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newFav = await toggleFavoriteSearch(id);
    showToast(newFav ? '已加入收藏' : '已取消收藏');
    reloadHistory();
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await deleteSearchHistoryItem(id);
    showToast('已删除记录');
    reloadHistory();
  };

  const handleCopyQuery = (e: React.MouseEvent, query: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(query);
    setCopiedId(id);
    showToast('已复制查询词');
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleClearAll = async () => {
    if (confirm('确定要清空所有离线搜索历史记录吗？')) {
      await clearAllSearchHistory();
      showToast('历史记录已完全清空');
      reloadHistory();
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`确定删除选中的 ${selectedIds.size} 条历史记录？`)) {
      for (const id of Array.from(selectedIds)) {
        await deleteSearchHistoryItem(id);
      }
      setSelectedIds(new Set());
      showToast('批量删除完成');
      reloadHistory();
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedItems.map((i) => i.id)));
    }
  };

  const handleExport = async () => {
    const jsonStr = await exportHistoryJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search_history_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已导出 JSON 文件');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const content = evt.target?.result as string;
          const count = await importHistoryJSON(content);
          showToast(`成功导入 ${count} 条历史`);
          reloadHistory();
        } catch (err: any) {
          alert(`导入失败: ${err.message}`);
        }
      };
      reader.readAsText(file);
    }
  };

  const favoriteCount = historyItems.filter((i) => i.isFavorite).length;
  const aiCount = historyItems.filter((i) => i.aiSummaryPreview || i.aiSummaryFull).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-neutral-100 transition-colors duration-200">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 rounded-full bg-slate-900 dark:bg-neutral-100 text-white dark:text-slate-900 px-5 py-2 text-xs font-bold shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Sparkles className="h-4 w-4 text-cyan-400 dark:text-cyan-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Page Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#0c0c0e]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-[#1e1e24]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Back & Title */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#18181c] hover:bg-slate-200 dark:hover:bg-[#27272a] text-xs font-semibold text-slate-700 dark:text-neutral-200 transition-all active:scale-95"
              title="返回搜索 (Esc)"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回搜索</span>
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-[#27272a]" />
            <div className="flex items-center space-x-2">
              <History className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h1 className="text-base font-bold text-slate-900 dark:text-white">搜索历史</h1>
              <span className="rounded-full bg-slate-100 dark:bg-[#1c1c22] px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-[#2a2a32]">
                {historyItems.length} 条
              </span>
            </div>
          </div>

          {/* View Toggle & Actions */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-[#18181c] border border-slate-200 dark:border-[#27272a]">
              <button
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded-lg text-xs transition-all flex items-center space-x-1 ${
                  viewMode === 'compact'
                    ? 'bg-white dark:bg-[#27272a] text-slate-900 dark:text-white font-bold shadow-xs'
                    : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="精简列表视图"
              >
                <LayoutList className="h-4 w-4" />
                <span className="hidden sm:inline">精简</span>
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`p-1.5 rounded-lg text-xs transition-all flex items-center space-x-1 ${
                  viewMode === 'detailed'
                    ? 'bg-white dark:bg-[#27272a] text-slate-900 dark:text-white font-bold shadow-xs'
                    : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="详细预览视图"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">卡片</span>
              </button>
            </div>

            <button
              onClick={handleExport}
              className="p-2 rounded-xl bg-slate-100 dark:bg-[#18181c] hover:bg-slate-200 dark:hover:bg-[#27272a] text-slate-600 dark:text-neutral-300 transition-all"
              title="导出历史数据"
            >
              <Download className="h-4 w-4" />
            </button>

            <label
              className="p-2 rounded-xl bg-slate-100 dark:bg-[#18181c] hover:bg-slate-200 dark:hover:bg-[#27272a] text-slate-600 dark:text-neutral-300 cursor-pointer transition-all"
              title="导入历史数据"
            >
              <Upload className="h-4 w-4" />
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>

            <button
              onClick={handleClearAll}
              className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 dark:bg-[#18181c] dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all"
              title="清空全部记录"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        
        {/* Search & Filter Bar */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-neutral-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索历史记录关键词..."
                className="w-full rounded-2xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#141417] pl-10 pr-8 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 focus:outline-none transition-all shadow-2xs"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-800 dark:text-neutral-500 dark:hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-2xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#141417] px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-neutral-300 focus:outline-none shadow-2xs"
            >
              <option value="newest">⌛ 最新时间</option>
              <option value="oldest">🕰️ 最早时间</option>
              <option value="most_results">📊 最多结果</option>
            </select>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none pb-1 text-xs">
            <div className="flex items-center space-x-1.5 shrink-0">
              {[
                { id: 'all', label: '全部' },
                { id: 'favorites', label: `⭐ 收藏 (${favoriteCount})` },
                { id: 'ai', label: `✨ AI 总结 (${aiCount})` },
                { id: 'general', label: '网页' },
                { id: 'it', label: '代码' },
                { id: 'science', label: '学术' },
                { id: 'news', label: '新闻' },
                { id: 'images', label: '图片' },
                { id: 'videos', label: '视频' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-slate-900 text-white font-bold dark:bg-white dark:text-black shadow-xs'
                      : 'bg-white text-slate-600 dark:bg-[#141417] dark:text-neutral-400 border border-slate-200 dark:border-[#27272a] hover:bg-slate-100 dark:hover:bg-[#1c1c20]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Batch Select Controls */}
            {filteredAndSortedItems.length > 0 && (
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-all text-xs"
                >
                  {selectedIds.size === filteredAndSortedItems.length ? (
                    <CheckSquare className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                  <span>全选</span>
                </button>

                {selectedIds.size > 0 && (
                  <button
                    onClick={handleBatchDelete}
                    className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 font-bold transition-all text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>删除已选 ({selectedIds.size})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* List Content */}
        {filteredAndSortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#101013] rounded-3xl border border-slate-200 dark:border-[#27272a] text-center space-y-3">
            <Clock className="h-12 w-12 text-slate-300 dark:text-neutral-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-neutral-300">暂无符合条件的历史记录</h3>
              <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1">
                开始搜索后，历史记录将自动保存在当前浏览器的离线缓存中
              </p>
            </div>
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-black font-semibold text-xs transition-all active:scale-95"
            >
              前往发起搜索
            </button>
          </div>
        ) : (
          timeGroups.map((group) => (
            <div key={group.id} className="space-y-2">
              
              {/* Group Header */}
              <div className="flex items-center space-x-2 px-1 text-xs font-bold text-slate-500 dark:text-neutral-400">
                <span>{group.title}</span>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-neutral-600" />
                <span className="text-[11px] font-normal">{group.items.length} 项</span>
              </div>

              {/* Items List */}
              <div className={viewMode === 'compact' ? 'space-y-1.5' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
                {group.items.map((item) => {
                  const globalIdx = filteredAndSortedItems.findIndex((i) => i.id === item.id);
                  const isKeyboardActive = keyboardIndex === globalIdx;
                  const isSelected = selectedIds.has(item.id);
                  const catConfig = CATEGORY_MAP[item.category] || CATEGORY_MAP.general;
                  const CatIcon = catConfig.icon;
                  const topResult = item.results?.[0];

                  if (viewMode === 'compact') {
                    // Ultra-Clean Single Line Row Mode
                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectHistoryItem(item)}
                        className={`group flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                          isKeyboardActive
                            ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 ring-2 ring-cyan-500/30'
                            : isSelected
                            ? 'border-slate-400 bg-slate-100 dark:bg-[#1a1a1e] dark:border-neutral-700'
                            : 'border-slate-200/80 dark:border-[#202024] bg-white dark:bg-[#121215] hover:border-slate-300 dark:hover:border-[#33333b] hover:bg-slate-50 dark:hover:bg-[#17171b]'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1 mr-3">
                          
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleSelect(item.id, e)}
                            className="text-slate-300 dark:text-neutral-600 hover:text-slate-600 dark:hover:text-neutral-300 transition-colors shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>

                          {/* Category Badge */}
                          <span
                            className={`inline-flex items-center space-x-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border shrink-0 ${catConfig.badgeBg} ${catConfig.color}`}
                          >
                            <CatIcon className="h-3 w-3" />
                            <span>{catConfig.label}</span>
                          </span>

                          {/* Search Query */}
                          <span className="text-xs font-bold text-slate-800 dark:text-neutral-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">
                            {item.query}
                          </span>

                          {/* AI indicator */}
                          {(item.aiSummaryPreview || item.aiSummaryFull) && (
                            <span className="hidden sm:inline-flex items-center space-x-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded-md border border-purple-200 dark:border-purple-800/40 shrink-0">
                              <Sparkles className="h-2.5 w-2.5" />
                              <span>AI</span>
                            </span>
                          )}
                        </div>

                        {/* Right Stats & Actions */}
                        <div className="flex items-center space-x-3 shrink-0 text-xs">
                          <span className="text-[11px] text-slate-400 dark:text-neutral-500">
                            {formatRelativeTime(item.timestamp)}
                          </span>

                          <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleCopyQuery(e, item.query, item.id)}
                              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-[#27272a] text-slate-400 dark:text-neutral-500 hover:text-slate-800 dark:hover:text-white transition-all"
                              title="复制查询词"
                            >
                              {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>

                            <button
                              onClick={(e) => handleToggleFavorite(e, item.id)}
                              className={`p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-[#27272a] transition-all ${
                                item.isFavorite ? 'text-amber-500' : 'text-slate-400 dark:text-neutral-500 hover:text-amber-500'
                              }`}
                              title={item.isFavorite ? '取消收藏' : '收藏'}
                            >
                              <Star className={`h-3.5 w-3.5 ${item.isFavorite ? 'fill-amber-400' : ''}`} />
                            </button>

                            <button
                              onClick={(e) => handleDelete(item.id, e)}
                              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-[#27272a] text-slate-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all"
                              title="删除"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  }

                  // Detailed Card View Mode
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectHistoryItem(item)}
                      className={`group p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                        isKeyboardActive
                          ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 ring-2 ring-cyan-500/30'
                          : 'border-slate-200/80 dark:border-[#202024] bg-white dark:bg-[#121215] hover:border-cyan-500/50 dark:hover:border-cyan-500/40 hover:bg-slate-50 dark:hover:bg-[#16161a]'
                      }`}
                    >
                      {/* Top Header Bar */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={(e) => handleToggleSelect(item.id, e)}
                            className="text-slate-300 dark:text-neutral-600 hover:text-slate-600 dark:hover:text-neutral-300 transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                          <span
                            className={`inline-flex items-center space-x-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${catConfig.badgeBg} ${catConfig.color}`}
                          >
                            <CatIcon className="h-3 w-3" />
                            <span>{catConfig.label}</span>
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-400 dark:text-neutral-500">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>

                      {/* Query Title */}
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors line-clamp-2">
                        {item.query}
                      </h4>

                      {/* Top Result Preview */}
                      {topResult && (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#18181c] border border-slate-200/60 dark:border-neutral-800/80 text-xs">
                          <div className="flex items-center space-x-1 text-[10px] font-medium text-slate-400 dark:text-neutral-500 mb-0.5">
                            <Globe className="h-3 w-3" />
                            <span className="truncate">{topResult.url ? new URL(topResult.url).hostname : '结果源'}</span>
                          </div>
                          <p className="font-medium text-slate-700 dark:text-neutral-300 line-clamp-1">
                            {topResult.title}
                          </p>
                        </div>
                      )}

                      {/* AI Summary Preview */}
                      {(item.aiSummaryPreview || item.aiSummaryFull) && (
                        <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-200 line-clamp-2 flex items-start space-x-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                          <span className="text-[11px]">
                            {item.aiSummaryPreview || item.aiSummaryFull}
                          </span>
                        </div>
                      )}

                      {/* Card Bottom Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#1e1e22] text-xs text-slate-400 dark:text-neutral-500">
                        <span className="text-[11px]">{item.resultCount} 个结果</span>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => handleCopyQuery(e, item.query, item.id)}
                            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-[#27272a] hover:text-slate-800 dark:hover:text-white transition-all"
                            title="复制查询词"
                          >
                            {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={(e) => handleToggleFavorite(e, item.id)}
                            className={`p-1 rounded-md hover:bg-slate-200 dark:hover:bg-[#27272a] transition-all ${
                              item.isFavorite ? 'text-amber-500' : 'hover:text-amber-500'
                            }`}
                            title={item.isFavorite ? '取消收藏' : '收藏'}
                          >
                            <Star className={`h-3.5 w-3.5 ${item.isFavorite ? 'fill-amber-400' : ''}`} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-[#27272a] hover:text-rose-600 dark:hover:text-rose-400 transition-all"
                            title="删除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          ))
        )}

      </main>
    </div>
  );
};
