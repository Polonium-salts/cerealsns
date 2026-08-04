import React, { useState, useEffect } from 'react';
import { X, History, Search, Star, Trash2, Download, Upload, Bookmark, Clock, ArrowUpRight, WifiOff } from 'lucide-react';
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
    if (confirm('确定要清空全部离线搜索历史记录吗？此操作不可撤销。')) {
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
    a.download = `nexus_search_history_${new Date().toISOString().slice(0, 10)}.json`;
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
          alert(`成功导入 ${importedCount} 条搜索历史记录`);
          reloadHistory();
        } catch (err: any) {
          alert(`导入失败: ${err.message}`);
        }
      };
      reader.readAsText(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end items-end sm:items-stretch bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative h-[85vh] sm:h-full w-full max-w-xl border-t sm:border-t-0 sm:border-l border-slate-800 bg-slate-900 p-4 sm:p-6 rounded-t-3xl sm:rounded-none shadow-2xl flex flex-col space-y-4 overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
        
        {/* Mobile Drag Handle */}
        <div className="sm:hidden w-12 h-1.5 rounded-full bg-slate-700 mx-auto mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-950 text-cyan-400 border border-cyan-800/50">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>本地搜索历史与离线缓存</span>
                <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-800">
                  IndexedDB
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                本地秒级检索，断网状态下仍可查阅已缓存的检索结果与 AI 总结
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Action Controls */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="快速搜索本地历史记录或摘要..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            {/* Category Filter */}
            <div className="flex items-center space-x-1">
              {['all', 'general', 'it', 'science', 'news'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    categoryFilter === cat
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat === 'all' ? '全部' : cat.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Import / Export Controls */}
            <div className="flex items-center space-x-2">
              <label className="cursor-pointer p-1.5 text-slate-400 hover:text-white" title="导入 JSON 历史">
                <Upload className="h-4 w-4" />
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>

              <button onClick={handleExport} className="p-1.5 text-slate-400 hover:text-white" title="导出备份 JSON">
                <Download className="h-4 w-4" />
              </button>

              <button onClick={handleClearAll} className="p-1.5 text-slate-400 hover:text-rose-400" title="清空历史">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* History Item List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {historyItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-center">
              <Clock className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-xs">暂无符合条件的本地历史记录</p>
            </div>
          ) : (
            historyItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectHistoryItem(item)}
                className="group relative rounded-2xl border border-slate-800/80 bg-slate-950 p-3.5 hover:border-slate-700 hover:bg-slate-900 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                      {item.category.toUpperCase()}
                    </span>
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => handleToggleFavorite(e, item.id)}
                      className={`p-1 ${item.isFavorite ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}
                      title={item.isFavorite ? '取消收藏' : '标记收藏'}
                    >
                      <Star className="h-3.5 w-3.5 fill-current" />
                    </button>

                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      className="p-1 text-slate-600 hover:text-rose-400"
                      title="删除单条"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                  {item.query}
                </h4>

                {item.aiSummaryPreview && (
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {item.aiSummaryPreview}
                  </p>
                )}

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/50 text-[11px] text-slate-500">
                  <span>网页源: {item.resultCount} 个结果</span>
                  <span className="flex items-center space-x-1 text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                    <span>恢复离线会话</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-3 text-right">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            关闭 Drawer
          </button>
        </div>

      </div>
    </div>
  );
};
