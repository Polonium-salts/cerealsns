import React from 'react';
import type { AppConfig, EdgeNode } from '../types';

interface NavbarProps {
  config: AppConfig;
  optimalNode: EdgeNode | null;
  onOpenConfig: () => void;
  onOpenHistory: () => void;
  onOpenEdgeMonitor: () => void;
  onOpenCommandPalette: () => void;
  onResetSearch: () => void;
  firebaseConnected: boolean;
  isSearchActive: boolean;
  activeCategory: string;
  onSelectCategory: (catId: string) => void;
}

const CATEGORIES = [
  { id: 'general', name: '全部' },
  { id: 'ai', name: 'AI 概览' },
  { id: 'it', name: 'IT与编程' },
  { id: 'science', name: '学术论文' },
  { id: 'news', name: '新闻' },
  { id: 'media', name: '多媒体' },
];

export const Navbar: React.FC<NavbarProps> = ({
  config,
  optimalNode,
  onOpenConfig,
  onOpenHistory,
  onOpenEdgeMonitor,
  onOpenCommandPalette,
  onResetSearch,
  firebaseConnected,
  isSearchActive,
  activeCategory,
  onSelectCategory,
}) => {
  if (!isSearchActive) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-[#131722]/95 backdrop-blur-md border-b border-slate-800 text-white">
      {/* Secondary Search Result Category Sub-bar (Only shown when search is active) */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-6 overflow-x-auto py-2.5 text-xs font-medium scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`relative pb-1 transition-colors whitespace-nowrap ${
                  isSelected ? 'text-[#8ab4f8] font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{cat.name}</span>
                {isSelected && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#8ab4f8]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
