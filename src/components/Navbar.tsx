import React from 'react';
import type { AppConfig, EdgeNode } from '../types';
import { SearchBar } from './SearchBar';
import { 
  History, 
  Search, 
  Sparkles, 
  Code, 
  BookOpen, 
  Newspaper, 
  Image, 
  Clock 
} from 'lucide-react';

interface NavbarProps {
  config: AppConfig;
  optimalNode: EdgeNode | null;
  onOpenConfig: () => void;
  onOpenHistory: () => void;
  onOpenCommandPalette: () => void;
  onResetSearch: () => void;
  isSearchActive: boolean;
  activeCategory: string;
  onSelectCategory: (catId: string) => void;
  activeTimeRange: string;
  onSelectTimeRange: (trId: string) => void;
  searchQuery: string;
  onSearch: (query: string, category: string, timeRange: string, aiModeEnabled: boolean) => void;
  isLoading: boolean;
  fetchTimeMs?: number;
}

export const CATEGORIES = [
  { id: 'general', name: '全部', icon: Search },
  { id: 'ai', name: 'AI 概览', icon: Sparkles },
  { id: 'images', name: '图片搜索', icon: Image },
  { id: 'it', name: 'IT与编程', icon: Code },
  { id: 'science', name: '学术论文', icon: BookOpen },
  { id: 'news', name: '新闻', icon: Newspaper },
];

export const TIME_RANGES = [
  { id: '', name: '不限时间' },
  { id: 'day', name: '24小时内' },
  { id: 'week', name: '本周' },
  { id: 'month', name: '本月' },
  { id: 'year', name: '今年' },
];

export const Navbar: React.FC<NavbarProps> = ({
  config,
  optimalNode,
  onOpenConfig,
  onOpenHistory,
  onOpenCommandPalette,
  onResetSearch,
  isSearchActive,
  activeCategory,
  onSelectCategory,
  activeTimeRange,
  onSelectTimeRange,
  searchQuery,
  onSearch,
  isLoading,
  fetchTimeMs,
}) => {
  if (!isSearchActive) {
    return (
      <header className="w-full bg-transparent px-4 sm:px-8 py-3 flex items-center justify-between text-xs text-neutral-400">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
          <span className="font-semibold text-white">CerealsNS Engine</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenHistory}
            className="p-2 text-neutral-400 hover:text-white hover:bg-[#27272a] rounded-full transition-colors"
            title="搜索历史"
          >
            <History className="h-4 w-4" />
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0c0c0e]/95 backdrop-blur-md border-b border-[#27272a] text-white shadow-xl">
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-1 space-y-3">
        
        {/* Row 1: Logo + Search Bar + Right Quick Action Tools */}
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          
          {/* Search Bar Input */}
          <div className="max-w-3xl flex-1">
            <SearchBar
              initialQuery={searchQuery}
              activeCategory={activeCategory}
              activeTimeRange={activeTimeRange}
              onSearch={onSearch}
              isLoading={isLoading}
              isCompactMode
            />
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            <button
              onClick={onOpenHistory}
              className="p-2 text-neutral-400 hover:text-white hover:bg-[#27272a] rounded-full transition-colors"
              title="搜索历史"
            >
              <History className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Category & Time Filter Choices */}
        <div className="flex items-center justify-between overflow-x-auto scrollbar-none pt-1">
          
          {/* Left: Category Selector Tabs */}
          <div className="flex items-center space-x-5 text-xs sm:text-sm font-medium">
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.id;
              const IconComp = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`relative pb-2.5 pt-0.5 transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                    isSelected ? 'text-white font-bold' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <IconComp className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-neutral-500'}`} />
                  <span>{cat.name}</span>
                  {isSelected && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-white shadow-xs" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Time Range Choices & Latency Indicator */}
          <div className="hidden md:flex items-center space-x-3 text-xs text-neutral-400">
            {/* Quick Time Filters */}
            <div className="flex items-center space-x-1 bg-[#18181b] p-0.5 rounded-full border border-[#27272a]">
              <Clock className="h-3 w-3 text-neutral-500 ml-2 mr-0.5" />
              {TIME_RANGES.map((tr) => (
                <button
                  key={tr.id}
                  onClick={() => onSelectTimeRange(tr.id)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] transition-all ${
                    activeTimeRange === tr.id
                      ? 'bg-white text-black font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {tr.name}
                </button>
              ))}
            </div>

            {fetchTimeMs !== undefined && (
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-800/50">
                {fetchTimeMs} ms
              </span>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};

