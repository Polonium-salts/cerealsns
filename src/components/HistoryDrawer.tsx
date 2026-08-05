import React, { useState, useEffect } from 'react';
import { X, History, Search, Star, Trash2, Download, Upload, Clock, ArrowUpRight, HardDrive, Sparkles, Database, Layers } from 'lucide-react';
import type { SearchHistoryItem } from '../types';
import { getOfflineSearchHistory, toggleFavoriteSearch, deleteSearchHistoryItem, clearAllSearchHistory, exportHistoryJSON, importHistoryJSON } from '../lib/indexedDB';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHistoryItem: (item: SearchHistoryItem) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  onSelectHistoryItem,
}) => {
  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<SearchHistoryItem | null>(null);

  const reloadHistory = async () => {
    const items = await getOfflineSearchHistory(searchKeyword, categoryFilter);
    setHistoryItems(items);
  };

  useEffect(() => {
    if (isOpen) {
      reloadHistory();
    }
  }, [isOpen, searchKeyword, categoryFilter]);

  const handleToggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await toggleFavoriteSearch(id);
    reloadHistory();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteSearchHistoryItem(id);
    if (selectedPreviewItem?.id === id) setSelectedPreviewItem(null);
    reloadHistory();
  };

  const handleClearAll = async () => {
    if (confirm('确定要清空全部离线搜索历史记录与缓存吗？此操作不可撤销。')) {
      await clearAllSearchHistory();
      setSelectedPreviewItem(null);
      reloadHistory();
    }
  };

  const handleExport = async () => {
    const jsonStr = await exportHistoryJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_search_cache_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const content = evt.target?.result as string;
          const importedCount = await importHistoryJSON(content);
          alert(`成功导入 ${importedCount} 条离线搜索缓存记录`);
          reloadHistory();
        } catch (err: any) {
          alert(`导入失败: ${err.message}`);
        }
      };
      reader.readAsText(file);
    }
  };

  if (!isOpen) return null;

  const favoriteCount = historyItems.filter((i) => i.isFavorite).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end items-end sm:items-stretch bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative h-[88vh] sm:h-full w-full max-w-xl border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-[#27272a] bg-white text-slate-800 dark:bg-[#0c0c0e] dark:text-neutral-100 p-4 sm:p-6 rounded-t-3xl sm:rounded-none shadow-2xl flex flex-col space-y-4 overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
        
        {/* Mobile Drag Handle */}
        <div className="sm:hidden w-12 h-1.5 rounded-full bg-slate-300 dark:bg-[#27272a] mx-auto mb-1" />

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-[#27272a] pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-[#18181c] text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 shadow-xs">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>本地搜索历史与离线缓存</span>
                <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  <span>IndexedDB 高速缓存</span>
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                支持断网查阅已缓存结果、AI 总结与历史归档数据
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-100 dark:bg-[#18181c] p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-[#27272a] dark:hover:text-white transition-all active:scale-95"
            title="关闭面板"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cache Stats Overview Banner */}
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#141417] border border-slate-200 dark:border-[#27272a] text-xs">
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white dark:bg-[#1a1a1e] border border-slate-200 dark:border-neutral-800/80 shadow-2xs">
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 flex items-center space-x-1">
              <Database className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
              <span>已缓存条目</span>
            </span>
            <span className="text-sm font-bold text-cyan-700 dark:text-cyan-300 mt-0.5">{historyItems.length} 条</span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white dark:bg-[#1a1a1e] border border-slate-200 dark:border-neutral-800/80 shadow-2xs">
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 flex items-center space-x-1">
              <Star className="h-3 w-3 text-amber-500 dark:text-amber-400" />
              <span>收藏精选</span>
            </span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-300 mt-0.5">{favoriteCount} 条</span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white dark:bg-[#1a1a1e] border border-slate-200 dark:border-neutral-800/80 shadow-2xs">
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 flex items-center space-x-1">
              <Layers className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span>存储引擎</span>
            </span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">秒级离线</span>
          </div>
        </div>

        {/* Search & Action Controls */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 dark:text-neutral-500" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="快速检索本地缓存历史或 AI 总结..."
              className="w-full rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#141417] pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 focus:outline-none transition-all"
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

          <div className="flex items-center justify-between gap-2 text-xs overflow-x-auto scrollbar-none pb-0.5">
            {/* Category Filter */}
            <div className="flex items-center space-x-1.5 shrink-0">
              {[
                { id: 'all', label: '全部' },
                { id: 'general', label: '网页' },
                { id: 'it', label: 'IT/代码' },
                { id: 'science', label: '学术' },
                { id: 'news', label: '新闻' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 shadow-2xs'
                      : 'bg-slate-100 text-slate-600 dark:bg-[#18181c] dark:text-neutral-400 border border-slate-200 dark:border-[#27272a] hover:bg-slate-200 dark:hover:bg-[#27272a] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Import / Export / Clear Controls */}
            <div className="flex items-center space-x-1 shrink-0">
              <label className="cursor-pointer p-1.5 text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#18181c] hover:bg-slate-200 dark:hover:bg-[#27272a] border border-slate-200 dark:border-[#27272a] rounded-lg transition-all" title="导入 JSON 历史">
                <Upload className="h-3.5 w-3.5" />
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>

              <button
                onClick={handleExport}
                className="p-1.5 text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#18181c] hover:bg-slate-200 dark:hover:bg-[#27272a] border border-slate-200 dark:border-[#27272a] rounded-lg transition-all"
                title="导出离线缓存 JSON 备份"
              >
                <Download className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={handleClearAll}
                className="p-1.5 text-slate-500 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-[#18181c] hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-[#27272a] hover:border-rose-300 dark:hover:border-rose-800/50 rounded-lg transition-all"
                title="清空历史与缓存"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* History Item List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-neutral-800">
          {historyItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-neutral-500 text-center rounded-2xl border border-dashed border-slate-300 dark:border-[#27272a] bg-slate-50 dark:bg-[#101013] my-4">
              <Clock className="h-10 w-10 mb-2 opacity-40 text-slate-400 dark:text-neutral-400" />
              <p className="text-xs font-semibold text-slate-700 dark:text-neutral-300">暂无离线搜索缓存记录</p>
              <p className="text-[11px] text-slate-500 dark:text-neutral-500 mt-1 max-w-xs">在搜索结果页点击“离线保存”按钮，即可在此随时离线调取与复习</p>
            </div>
          ) : (
            historyItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectHistoryItem(item)}
                className="group relative rounded-2xl border border-slate-200 dark:border-[#27272a]/90 bg-slate-50 dark:bg-[#141417] p-3.5 hover:border-cyan-500/50 dark:hover:border-cyan-500/40 hover:bg-white dark:hover:bg-[#18181d] cursor-pointer transition-all shadow-2xs"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400 mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="rounded-md bg-slate-200 dark:bg-[#202026] px-2 py-0.5 text-[10px] font-semibold text-cyan-700 dark:text-cyan-300 border border-slate-300 dark:border-cyan-500/20">
                      {item.category.toUpperCase()}
                    </span>
                    <span className="text-slate-400 dark:text-neutral-500">{new Date(item.timestamp).toLocaleString()}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={(e) => handleToggleFavorite(e, item.id)}
                      className={`p-1 rounded-md hover:bg-slate-200 dark:hover:bg-[#27272a] transition-all ${item.isFavorite ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-neutral-500 hover:text-amber-500'}`}
                      title={item.isFavorite ? '取消收藏' : '标记收藏'}
                    >
                      <Star className={`h-3.5 w-3.5 ${item.isFavorite ? 'fill-amber-400' : ''}`} />
                    </button>

                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      className="p-1 rounded-md text-slate-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-[#27272a] transition-all"
                      title="删除单条缓存"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors line-clamp-1">
                  {item.query}
                </h4>

                {item.aiSummaryPreview && (
                  <div className="mt-2 p-2 rounded-xl bg-white dark:bg-[#101013] border border-slate-200 dark:border-neutral-800/70 text-xs text-slate-600 dark:text-neutral-400 line-clamp-2 flex items-start space-x-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <span>{item.aiSummaryPreview}</span>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200 dark:border-[#27272a]/60 text-[11px] text-slate-500 dark:text-neutral-400">
                  <span className="flex items-center space-x-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                    <span>缓存源: {item.resultCount} 个搜索结果</span>
                  </span>
                  <span className="flex items-center space-x-1 text-cyan-600 dark:text-cyan-400 font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>恢复离线会话</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-[#27272a] pt-3 flex items-center justify-between text-xs">
          <span className="text-slate-400 dark:text-[#a1a1aa] text-[11px]">Nexus Engine Offline Cache v1.2</span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 dark:bg-[#18181c] border border-slate-200 dark:border-[#27272a] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-neutral-200 hover:bg-slate-200 dark:hover:bg-[#27272a] hover:text-slate-900 dark:hover:text-white transition-all active:scale-95"
          >
            关闭面板
          </button>
        </div>

      </div>
    </div>
  );
};

