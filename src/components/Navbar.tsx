import React, { useState } from 'react';
import type { AppConfig, EdgeNode } from '../types';
import { SearchBar } from './SearchBar';
import { 
  History, 
  Search, 
  Sparkles, 
  Video, 
  Image, 
  Clock,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  BarChart3
} from 'lucide-react';

interface NavbarProps {
  config: AppConfig;
  optimalNode: EdgeNode | null;
  onOpenConfig: () => void;
  onOpenHistory: () => void;
  onOpenAiTools?: () => void;
  onOpenCommandPalette: () => void;
  onResetSearch: () => void;
  isSearchActive: boolean;
  activeCategory: string;
  onSelectCategory: (catId: string) => void;
  activeTimeRange: string;
  onSelectTimeRange: (trId: string) => void;
  selectedEngines?: string[];
  onSelectEngines?: (engines: string[]) => void;
  searchQuery: string;
  onSearch: (query: string, category: string, timeRange: string, aiModeEnabled: boolean, targetEngines?: string) => void;
  isLoading: boolean;
  fetchTimeMs?: number;
  onUpdateConfig?: (newConfig: Partial<AppConfig>) => void;
  searxngLatencies?: Record<string, number | null>;
  isPingingSearxng?: boolean;
  onPingTest?: (urlsToPing?: string[]) => Promise<void>;
}

export const CATEGORIES = [
  { id: 'general', name: '全部', icon: Search },
  { id: 'ai', name: 'AI 概览', icon: Sparkles },
  { id: 'images', name: '图片搜索', icon: Image },
  { id: 'videos', name: '视频搜索', icon: Video },
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
  onOpenAiTools,
  onOpenCommandPalette,
  onResetSearch,
  isSearchActive,
  activeCategory,
  onSelectCategory,
  activeTimeRange,
  onSelectTimeRange,
  selectedEngines,
  onSelectEngines,
  searchQuery,
  onSearch,
  isLoading,
  fetchTimeMs,
  onUpdateConfig,
  searxngLatencies,
  isPingingSearxng,
  onPingTest,
}) => {
  const [showSearchBarInAI, setShowSearchBarInAI] = useState(false);

  const toggleTheme = () => {
    if (onUpdateConfig) {
      const nextTheme = config.theme === 'dark' ? 'light' : 'dark';
      onUpdateConfig({ theme: nextTheme });
    }
  };

  if (!isSearchActive) {
    return (
      <header className="w-full bg-transparent px-4 sm:px-8 py-3 flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400">
        <div 
          onClick={onResetSearch} 
          className="flex items-center space-x-2 cursor-pointer active:opacity-80 transition-opacity"
        >
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-900 dark:text-white text-sm tracking-wide">CerealsNS Engine</span>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#27272a] rounded-full transition-colors active:scale-95"
            title={config.theme === 'dark' ? '切换至浅色模式' : '切换至深色模式'}
          >
            {config.theme === 'dark' ? <Sun className="h-5 w-5 sm:h-4 sm:w-4 text-amber-400" /> : <Moon className="h-5 w-5 sm:h-4 sm:w-4 text-slate-700" />}
          </button>
          <button
            onClick={onOpenHistory}
            className="p-2.5 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#27272a] rounded-full transition-colors active:scale-95"
            title="搜索历史"
          >
            <History className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </header>
    );
  }

  const isAIMode = activeCategory === 'ai';

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#27272a] text-slate-900 dark:text-white shadow-xs transition-colors duration-200">
      <div className="max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-2.5 pb-1 space-y-2">
        
        {/* Row 1: Logo / Search Bar / Mode Title + Right Tools */}
        {isAIMode && !showSearchBarInAI ? null : (
          /* Standard Row 1 with Search Bar (Or AI mode with expanded search bar) */
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Mobile Home Reset Icon Button */}
            <button
              type="button"
              onClick={onResetSearch}
              className="sm:hidden p-2 rounded-full text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-[#27272a] active:scale-95 shrink-0"
              title="返回首页"
            >
              <span className="flex h-3 w-3 rounded-full bg-emerald-500" />
            </button>

            {/* Search Bar Input */}
            <div className="max-w-3xl flex-1 min-w-0">
              <SearchBar
                initialQuery={searchQuery}
                activeCategory={activeCategory}
                activeTimeRange={activeTimeRange}
                selectedEngines={selectedEngines}
                onSelectEngines={onSelectEngines}
                onSearch={onSearch}
                isLoading={isLoading}
                isCompactMode
                config={config}
                onUpdateConfig={onUpdateConfig}
                searxngLatencies={searxngLatencies}
                isPingingSearxng={isPingingSearxng}
                onPingTest={onPingTest}
              />
            </div>

            {/* Right Action Tools */}
            <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
              {isAIMode && (
                <button
                  type="button"
                  onClick={() => setShowSearchBarInAI(false)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#27272a] hover:bg-slate-200 dark:hover:bg-[#3f3f46] text-slate-700 dark:text-neutral-300 text-xs font-semibold transition-all"
                  title="隐藏搜索栏"
                >
                  隐藏搜索栏
                </button>
              )}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2.5 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#27272a] rounded-full transition-colors active:scale-95"
                title={config.theme === 'dark' ? '切换至浅色模式' : '切换至深色模式'}
              >
                {config.theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
              </button>
              {onOpenAiTools && (
                <button
                  onClick={onOpenAiTools}
                  className="p-2.5 text-slate-500 hover:text-emerald-600 dark:text-neutral-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-[#27272a] rounded-full transition-colors active:scale-95"
                  title="网站排名与 AI 精准搜索 API 工具"
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={onOpenHistory}
                className="p-2.5 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#27272a] rounded-full transition-colors active:scale-95"
                title="搜索历史"
              >
                <History className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Row 2: Category & Time Filter Choices */}
        <div className="flex items-center justify-between overflow-x-auto scrollbar-none pt-0.5 pb-0.5 space-x-4">
          
          {/* Left: Category Selector Tabs with touch horizontal scrolling */}
          <div className="flex items-center space-x-3 sm:space-x-5 text-xs sm:text-sm font-medium overflow-x-auto scrollbar-none whitespace-nowrap pr-2">
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.id;
              const IconComp = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`relative pb-2 pt-1 transition-all whitespace-nowrap flex items-center space-x-1.5 px-2 rounded-lg ${
                    isSelected
                      ? 'text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-[#1f1f23]/60'
                      : 'text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  <IconComp className={`h-3.5 w-3.5 ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-neutral-500'}`} />
                  <span>{cat.name}</span>
                  {isSelected && (
                    <span className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-slate-900 dark:bg-white shadow-xs" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Time Range Choices & Latency Indicator */}
          <div className="flex items-center space-x-2 shrink-0 text-xs text-slate-500 dark:text-neutral-400">
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-[#18181b] p-0.5 rounded-full border border-slate-200 dark:border-[#27272a] overflow-x-auto scrollbar-none whitespace-nowrap">
              <Clock className="h-3 w-3 text-slate-400 dark:text-neutral-500 ml-1.5 mr-0.5 hidden sm:inline-block" />
              {TIME_RANGES.map((tr) => (
                <button
                  key={tr.id}
                  onClick={() => onSelectTimeRange(tr.id)}
                  className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] whitespace-nowrap transition-all ${
                    activeTimeRange === tr.id
                      ? 'bg-slate-900 text-white font-bold dark:bg-white dark:text-black'
                      : 'text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  {tr.name}
                </button>
              ))}
            </div>

            {fetchTimeMs !== undefined && (
              <span className="hidden lg:inline-block text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                {fetchTimeMs} ms
              </span>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};


