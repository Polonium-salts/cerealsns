import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  Layers, 
  History, 
  Settings, 
  Image as ImageIcon,
  X,
  Code,
  BookOpen,
  Newspaper,
  ChevronUp,
  SlidersHorizontal
} from 'lucide-react';
import { CATEGORIES } from './Navbar';

interface MobileBottomNavProps {
  isSearchActive: boolean;
  activeCategory: string;
  onSelectCategory: (catId: string) => void;
  onOpenHistory: () => void;
  onOpenConfig: () => void;
  onResetSearch: () => void;
  onFocusSearch: () => void;
  mobileViewMode?: 'all' | 'web' | 'ai';
  onSelectMobileViewMode?: (mode: 'all' | 'web' | 'ai') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  isSearchActive,
  activeCategory,
  onSelectCategory,
  onOpenHistory,
  onOpenConfig,
  onResetSearch,
  onFocusSearch,
  mobileViewMode = 'all',
  onSelectMobileViewMode,
}) => {
  const [showCategorySheet, setShowCategorySheet] = useState(false);

  return (
    <>
      {/* Fixed Mobile Bottom Dock Bar */}
      <nav 
        aria-label="移动端主导航"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c0f]/95 backdrop-blur-xl border-t border-[#27272a] text-neutral-300 px-3 py-1.5 shadow-[0_-10px_25px_rgba(0,0,0,0.8)] transition-all"
      >
        <div className="grid grid-cols-5 items-center gap-1 text-[11px] font-medium">
          
          {/* Button 1: 首页/搜索 */}
          <button
            type="button"
            onClick={() => {
              if (isSearchActive) {
                onResetSearch();
              } else {
                onFocusSearch();
              }
            }}
            className="flex flex-col items-center justify-center py-1.5 rounded-xl transition-all active:scale-95 text-neutral-400 hover:text-white"
          >
            <Search className="h-5 w-5 mb-0.5" />
            <span className="truncate">{isSearchActive ? '新搜索' : '搜索'}</span>
          </button>

          {/* Button 2: 分类切换 */}
          <button
            type="button"
            onClick={() => setShowCategorySheet(true)}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all active:scale-95 ${
              activeCategory !== 'general' 
                ? 'text-white font-semibold' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <div className="relative">
              <Layers className="h-5 w-5 mb-0.5" />
              {activeCategory !== 'general' && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-white animate-pulse" />
              )}
            </div>
            <span className="truncate">
              {CATEGORIES.find((c) => c.id === activeCategory)?.name || '分类'}
            </span>
          </button>

          {/* Button 3: AI 概览解读 (中心高亮按钮) */}
          <button
            type="button"
            onClick={() => {
              if (onSelectMobileViewMode) {
                if (mobileViewMode === 'ai') {
                  onSelectMobileViewMode('all');
                } else {
                  onSelectMobileViewMode('ai');
                }
              } else {
                onSelectCategory('ai');
              }
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-2xl transition-all active:scale-95 ${
              mobileViewMode === 'ai' || activeCategory === 'ai'
                ? 'bg-white text-black font-bold shadow-lg shadow-white/20'
                : 'bg-[#27272a] text-white border border-[#3f3f46]'
            }`}
          >
            <Sparkles className={`h-5 w-5 mb-0.5 ${mobileViewMode === 'ai' || activeCategory === 'ai' ? 'text-black' : 'text-purple-300'}`} />
            <span className="text-[10px] truncate">AI 概览</span>
          </button>

          {/* Button 4: 搜索历史 */}
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex flex-col items-center justify-center py-1.5 rounded-xl transition-all active:scale-95 text-neutral-400 hover:text-white"
          >
            <History className="h-5 w-5 mb-0.5" />
            <span className="truncate">历史</span>
          </button>

          {/* Button 5: 设置 */}
          <button
            type="button"
            onClick={onOpenConfig}
            className="flex flex-col items-center justify-center py-1.5 rounded-xl transition-all active:scale-95 text-neutral-400 hover:text-white"
          >
            <SlidersHorizontal className="h-5 w-5 mb-0.5" />
            <span className="truncate">设置</span>
          </button>

        </div>
      </nav>

      {/* Mobile Category Selection Bottom Sheet Modal */}
      {showCategorySheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:hidden bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full bg-[#141418] border-t border-[#27272a] rounded-t-3xl p-5 shadow-2xl flex flex-col space-y-4 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 rounded-full bg-neutral-600 mx-auto" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
              <div className="flex items-center space-x-2">
                <Layers className="h-5 w-5 text-white" />
                <h3 className="text-base font-bold text-white">选择搜索引擎与频道分类</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCategorySheet(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#27272a]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Categories List */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {CATEGORIES.map((cat) => {
                const isSelected = activeCategory === cat.id;
                const IconComp = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat.id);
                      setShowCategorySheet(false);
                    }}
                    className={`flex items-center space-x-3 p-3.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-white text-black border-white font-bold shadow-lg'
                        : 'bg-[#1e1e24] text-neutral-200 border-[#2e2e36] hover:bg-[#272730]'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${isSelected ? 'bg-black text-white' : 'bg-[#2a2a32] text-neutral-300'}`}>
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{cat.name}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-neutral-700' : 'text-neutral-400'}`}>
                        {cat.id === 'general' && '全网网页智能聚合'}
                        {cat.id === 'ai' && 'AI 原生深度分析总结'}
                        {cat.id === 'images' && '高清图库与智能图谱'}
                        {cat.id === 'it' && '代码、文档与开源知识'}
                        {cat.id === 'science' && '学术论文与前沿研究'}
                        {cat.id === 'news' && '实时新闻与时事资讯'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowCategorySheet(false)}
              className="w-full py-3 rounded-2xl bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs font-semibold text-center mt-2"
            >
              完成
            </button>

          </div>
        </div>
      )}
    </>
  );
};
