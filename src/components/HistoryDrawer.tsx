import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  History,
  Search,
  Star,
  Trash2,
  Download,
  Upload,
  Clock,
  ArrowUpRight,
  HardDrive,
  Sparkles,
  Database,
  Layers,
  Calendar,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Globe,
  Code,
  BookOpen,
  Newspaper,
  Video,
  Image as ImageIcon,
  Zap,
  Filter,
  SlidersHorizontal,
  Bookmark,
  ExternalLink
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

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHistoryItem: (item: SearchHistoryItem) => void;
}

// Category Configuration Map
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

// Relative Time Formatter
function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} 分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`;
  const date = new Date(timestamp);
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// Group Interface
interface TimeGroup {
  id: 'justNow' | 'today' | 'yesterday' | 'thisWeek' | 'earlier';
  title: string;
  icon: React.FC<{ className?: string }>;
  items: SearchHistoryItem[];
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  onSelectHistoryItem
}) => {
  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_results'>('newest');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [keyboardIndex, setKeyboardIndex] = useState<number>(-1);

  // Group accordion toggle states
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    justNow: true,
    today: true,
    yesterday: true,
    thisWeek: true,
    earlier: false
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Show Toast Message helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const reloadHistory = async () => {
    const items = await getOfflineSearchHistory(searchKeyword, categoryFilter);
    setHistoryItems(items);
  };

  useEffect(() => {
    if (isOpen) {
      reloadHistory();
      setKeyboardIndex(-1);
      // Auto focus search input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, searchKeyword, categoryFilter]);

  // Handle Keyboard Navigation (Esc, Up/Down arrows, Enter, Delete)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
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
        const target = flatItems[keyboardIndex];
        handleDelete(target.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, keyboardIndex, historyItems, searchKeyword, categoryFilter, sortBy]);

  // Filter & Sort
  const filteredAndSortedItems = useMemo(() => {
    let list = [...historyItems];

    // Filter by special category
    if (categoryFilter === 'favorites') {
      list = list.filter((i) => i.isFavorite);
    } else if (categoryFilter === 'ai') {
      list = list.filter((i) => Boolean(i.aiSummaryPreview || i.aiSummaryFull));
    } else if (categoryFilter !== 'all') {
      list = list.filter((i) => i.category === categoryFilter);
    }

    // Sort
    if (sortBy === 'newest') {
      list.sort((a, b) => b.timestamp - a.timestamp);
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => a.timestamp - b.timestamp);
    } else if (sortBy === 'most_results') {
      list.sort((a, b) => b.resultCount - a.resultCount);
    }

    return list;
  }, [historyItems, categoryFilter, sortBy]);

  // Group items by smart time buckets
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

    const groups: TimeGroup[] = [
      { id: 'justNow', title: '刚刚 (5分钟内)', icon: Zap, items: justNowItems },
      { id: 'today', title: '今天', icon: Calendar, items: todayItems },
      { id: 'yesterday', title: '昨天', icon: Clock, items: yesterdayItems },
      { id: 'thisWeek', title: '本周', icon: Calendar, items: thisWeekItems },
      { id: 'earlier', title: '更早之前', icon: HardDrive, items: earlierItems }
    ];

    return groups.filter((g) => g.items.length > 0);
  }, [filteredAndSortedItems]);

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleExpandAll = () => {
    const allExpanded = Object.values(expandedGroups).every(Boolean);
    const nextState: Record<string, boolean> = {};
    ['justNow', 'today', 'yesterday', 'thisWeek', 'earlier'].forEach((k) => {
      nextState[k] = !allExpanded;
    });
    setExpandedGroups(nextState);
  };

  const handleToggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newFav = await toggleFavoriteSearch(id);
    showToast(newFav ? '已标记为收藏精选 ⭐' : '已取消收藏');
    reloadHistory();
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await deleteSearchHistoryItem(id);
    showToast('已从离线缓存中移除 🗑️');
    reloadHistory();
  };

  const handleCopyQuery = (e: React.MouseEvent, query: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(query);
    setCopiedId(id);
    showToast('已复制查询词到剪贴板 📋');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearAll = async () => {
    if (confirm('确定要清空所有离线搜索历史与缓存吗？此操作不可撤销。')) {
      await clearAllSearchHistory();
      showToast('全部历史记录已清空');
      reloadHistory();
    }
  };

  const handleExport = async () => {
    const jsonStr = await exportHistoryJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cerealsns_search_history_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('搜索历史 JSON 已导出 📦');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const content = evt.target?.result as string;
          const importedCount = await importHistoryJSON(content);
          showToast(`成功导入 ${importedCount} 条历史缓存`);
          reloadHistory();
        } catch (err: any) {
          alert(`导入失败: ${err.message}`);
        }
      };
      reader.readAsText(file);
    }
  };

  // Helper to highlight matching text in search results
  const renderHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark
              key={i}
              className="bg-cyan-200 dark:bg-cyan-900/80 text-cyan-900 dark:text-cyan-100 rounded-xs px-0.5 font-bold"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  if (!isOpen) return null;

  const favoriteCount = historyItems.filter((i) => i.isFavorite).length;
  const aiCount = historyItems.filter((i) => i.aiSummaryPreview || i.aiSummaryFull).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end items-end sm:items-stretch bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-60 rounded-xl bg-slate-900 dark:bg-neutral-100 text-white dark:text-slate-900 px-4 py-2 text-xs font-bold shadow-2xl border border-slate-700 dark:border-neutral-300 flex items-center space-x-2 animate-in slide-in-from-top duration-200">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400 dark:text-cyan-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="relative h-[90vh] sm:h-full w-full max-w-xl border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-[#27272a] bg-white text-slate-800 dark:bg-[#0c0c0e] dark:text-neutral-100 p-4 sm:p-6 rounded-t-3xl sm:rounded-none shadow-2xl flex flex-col space-y-3.5 overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
        
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden w-12 h-1.5 rounded-full bg-slate-300 dark:bg-[#27272a] mx-auto mb-1" />

        {/* Drawer Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-[#27272a] pb-3.5">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-[#18181c] text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 shadow-2xs">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>搜索历史与离线快照</span>
                <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  <span>IndexedDB 持久化</span>
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                实时搜/智能过滤/支持键盘 `↑` `↓` `Enter` 导航
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-100 dark:bg-[#18181c] p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-[#27272a] dark:hover:text-white transition-all active:scale-95"
            title="关闭 (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-4 gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-[#141417] border border-slate-200 dark:border-[#27272a] text-xs">
          <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white dark:bg-[#1a1a1e] border border-slate-200 dark:border-neutral-800/80 shadow-2xs">
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 flex items-center space-x-1">
              <Database className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
              <span>总记录</span>
            </span>
            <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300 mt-0.5">
              {historyItems.length} 条
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white dark:bg-[#1a1a1e] border border-slate-200 dark:border-neutral-800/80 shadow-2xs">
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 flex items-center space-x-1">
              <Star className="h-3 w-3 text-amber-500 dark:text-amber-400" />
              <span>已收藏</span>
            </span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-300 mt-0.5">
              {favoriteCount} 条
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white dark:bg-[#1a1a1e] border border-slate-200 dark:border-neutral-800/80 shadow-2xs">
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 flex items-center space-x-1">
              <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
              <span>含 AI 总结</span>
            </span>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-300 mt-0.5">
              {aiCount} 条
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white dark:bg-[#1a1a1e] border border-slate-200 dark:border-neutral-800/80 shadow-2xs">
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 flex items-center space-x-1">
              <SlidersHorizontal className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span>快捷键</span>
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">
              Ctrl+H
            </span>
          </div>
        </div>

        {/* Search Input & Sort Controls */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 dark:text-neutral-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="在历史中搜索关键词、结果标题或 AI 总结..."
                className="w-full rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#141417] pl-10 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 focus:outline-none transition-all"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-3 top-2.5 text-slate-400 dark:text-neutral-500 hover:text-slate-800 dark:hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#141417] px-2.5 py-2 text-[11px] font-medium text-slate-700 dark:text-neutral-300 focus:outline-none"
            >
              <option value="newest">⌛ 最新优先</option>
              <option value="oldest">🕰️ 最早优先</option>
              <option value="most_results">📊 结果数最多</option>
            </select>
          </div>

          {/* Category Pills & Batch Actions */}
          <div className="flex items-center justify-between gap-2 text-xs overflow-x-auto scrollbar-none pb-1">
            <div className="flex items-center space-x-1.5 shrink-0">
              {[
                { id: 'all', label: '全部' },
                { id: 'favorites', label: '⭐ 收藏' },
                { id: 'ai', label: '✨ AI 总结' },
                { id: 'general', label: '网页' },
                { id: 'it', label: 'IT代码' },
                { id: 'science', label: '学术' },
                { id: 'news', label: '新闻' },
                { id: 'images', label: '图片' },
                { id: 'videos', label: '视频' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all shrink-0 ${
                    categoryFilter === cat.id
                      ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 shadow-2xs font-semibold'
                      : 'bg-slate-100 text-slate-600 dark:bg-[#18181c] dark:text-neutral-400 border border-slate-200 dark:border-[#27272a] hover:bg-slate-200 dark:hover:bg-[#27272a] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Expand / Import / Export / Clear Controls */}
            <div className="flex items-center space-x-1 shrink-0">
              <button
                onClick={toggleExpandAll}
                className="px-2 py-1 text-[11px] text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#18181c] border border-slate-200 dark:border-[#27272a] rounded-lg transition-all"
                title="展开或折叠全部时间组"
              >
                折叠/展开
              </button>

              <label
                className="cursor-pointer p-1.5 text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#18181c] hover:bg-slate-200 dark:hover:bg-[#27272a] border border-slate-200 dark:border-[#27272a] rounded-lg transition-all"
                title="导入 JSON 历史"
              >
                <Upload className="h-3.5 w-3.5" />
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>

              <button
                onClick={handleExport}
                className="p-1.5 text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#18181c] hover:bg-slate-200 dark:hover:bg-[#27272a] border border-slate-200 dark:border-[#27272a] rounded-lg transition-all"
                title="导出离线 JSON 备份"
              >
                <Download className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={handleClearAll}
                className="p-1.5 text-slate-500 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-[#18181c] hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-[#27272a] hover:border-rose-300 dark:hover:border-rose-800/50 rounded-lg transition-all"
                title="清空全部历史"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* History Grouped List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-neutral-800">
          {filteredAndSortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-neutral-500 text-center rounded-2xl border border-dashed border-slate-300 dark:border-[#27272a] bg-slate-50 dark:bg-[#101013] my-4">
              <Clock className="h-10 w-10 mb-2 opacity-40 text-slate-400 dark:text-neutral-400" />
              <p className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                未找到匹配的搜索历史记录
              </p>
              <p className="text-[11px] text-slate-500 dark:text-neutral-500 mt-1 max-w-xs">
                尝试更改搜索关键词或顶部分类筛选条件，执行新的搜索后将自动同步至离线缓存 DB
              </p>
            </div>
          ) : (
            timeGroups.map((group) => {
              const isGroupExpanded = expandedGroups[group.id] !== false;
              const GroupIcon = group.icon;

              return (
                <div key={group.id} className="space-y-2">
                  {/* Time Group Header */}
                  <button
                    onClick={() => toggleGroupExpand(group.id)}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-100/80 dark:bg-[#141417] hover:bg-slate-200/80 dark:hover:bg-[#1a1a1e] border border-slate-200 dark:border-[#27272a] text-xs font-bold text-slate-800 dark:text-neutral-200 transition-all group"
                  >
                    <div className="flex items-center space-x-2">
                      <GroupIcon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                      <span>{group.title}</span>
                      <span className="rounded-full bg-slate-200 dark:bg-[#222228] px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-neutral-400">
                        {group.items.length} 条
                      </span>
                    </div>
                    <div className="flex items-center text-slate-400 dark:text-neutral-500 group-hover:text-slate-800 dark:group-hover:text-white">
                      {isGroupExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {/* Group Item Cards */}
                  {isGroupExpanded && (
                    <div className="space-y-2 pl-1">
                      {group.items.map((item) => {
                        const globalIdx = filteredAndSortedItems.findIndex(
                          (fi) => fi.id === item.id
                        );
                        const isKeyboardActive = keyboardIndex === globalIdx;
                        const catConfig = CATEGORY_MAP[item.category] || CATEGORY_MAP.general;
                        const CatIcon = catConfig.icon;
                        const topResult = item.results?.[0];

                        return (
                          <div
                            key={item.id}
                            onClick={() => onSelectHistoryItem(item)}
                            className={`group relative rounded-2xl border p-3.5 cursor-pointer transition-all shadow-2xs ${
                              isKeyboardActive
                                ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 ring-2 ring-cyan-500/30'
                                : 'border-slate-200 dark:border-[#27272a]/90 bg-slate-50 dark:bg-[#141417] hover:border-cyan-500/50 dark:hover:border-cyan-500/40 hover:bg-white dark:hover:bg-[#18181d]'
                            }`}
                          >
                            {/* Card Top Meta Bar */}
                            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400 mb-1.5">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`inline-flex items-center space-x-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${catConfig.badgeBg} ${catConfig.color}`}
                                >
                                  <CatIcon className="h-3 w-3" />
                                  <span>{catConfig.label}</span>
                                </span>
                                <span
                                  className="text-slate-400 dark:text-neutral-500 hover:text-slate-700 dark:hover:text-neutral-300 transition-colors"
                                  title={new Date(item.timestamp).toLocaleString()}
                                >
                                  {formatRelativeTime(item.timestamp)}
                                </span>
                              </div>

                              {/* Quick Action Buttons */}
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={(e) => handleCopyQuery(e, item.query, item.id)}
                                  className="p-1 rounded-md text-slate-400 hover:text-slate-800 dark:text-neutral-500 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#27272a] transition-all"
                                  title="复制查询词"
                                >
                                  {copiedId === item.id ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>

                                <button
                                  onClick={(e) => handleToggleFavorite(e, item.id)}
                                  className={`p-1 rounded-md hover:bg-slate-200 dark:hover:bg-[#27272a] transition-all ${
                                    item.isFavorite
                                      ? 'text-amber-500 dark:text-amber-400'
                                      : 'text-slate-400 dark:text-neutral-500 hover:text-amber-500'
                                  }`}
                                  title={item.isFavorite ? '取消收藏' : '标记为收藏精选'}
                                >
                                  <Star
                                    className={`h-3.5 w-3.5 ${
                                      item.isFavorite ? 'fill-amber-400' : ''
                                    }`}
                                  />
                                </button>

                                <button
                                  onClick={(e) => handleDelete(item.id, e)}
                                  className="p-1 rounded-md text-slate-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-[#27272a] transition-all"
                                  title="删除单条"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Query Title */}
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors line-clamp-1">
                              {renderHighlightedText(item.query, searchKeyword)}
                            </h4>

                            {/* Rich Content Preview: Top Result */}
                            {topResult && (
                              <div className="mt-2 p-2 rounded-xl bg-white dark:bg-[#101013] border border-slate-200 dark:border-neutral-800/80 text-xs text-slate-600 dark:text-neutral-300">
                                <div className="flex items-center space-x-1.5 text-[10px] text-cyan-600 dark:text-cyan-400 font-medium mb-0.5">
                                  <Globe className="h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    {topResult.engine ? `[${topResult.engine}] ` : ''}
                                    {topResult.url ? new URL(topResult.url).hostname : '相关源'}
                                  </span>
                                </div>
                                <p className="font-semibold text-slate-800 dark:text-neutral-200 line-clamp-1">
                                  {renderHighlightedText(topResult.title, searchKeyword)}
                                </p>
                              </div>
                            )}

                            {/* Rich Content Preview: AI Summary */}
                            {(item.aiSummaryPreview || item.aiSummaryFull) && (
                              <div className="mt-2 p-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-200 line-clamp-2 flex items-start space-x-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                                <span className="text-[11px] leading-relaxed">
                                  {renderHighlightedText(
                                    item.aiSummaryPreview || item.aiSummaryFull || '',
                                    searchKeyword
                                  )}
                                </span>
                              </div>
                            )}

                            {/* Card Footer */}
                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200 dark:border-[#27272a]/60 text-[11px] text-slate-500 dark:text-neutral-400">
                              <span className="flex items-center space-x-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                                <span>{item.resultCount} 个搜索结果缓存</span>
                              </span>
                              <span className="flex items-center space-x-1 text-cyan-600 dark:text-cyan-400 font-medium group-hover:translate-x-0.5 transition-transform">
                                <span>恢复离线会话</span>
                                <ArrowUpRight className="h-3 w-3" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-slate-200 dark:border-[#27272a] pt-3 flex items-center justify-between text-xs">
          <span className="text-slate-400 dark:text-[#a1a1aa] text-[11px]">
            CerealsNS History Engine v2.0 • 按 Esc 或 Ctrl+H 可快速关闭
          </span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 dark:bg-[#18181c] border border-slate-200 dark:border-[#27272a] px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-neutral-200 hover:bg-slate-200 dark:hover:bg-[#27272a] hover:text-slate-900 dark:hover:text-white transition-all active:scale-95"
          >
            关闭面板
          </button>
        </div>

      </div>
    </div>
  );
};
