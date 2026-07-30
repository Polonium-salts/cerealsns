import React from 'react';
import { Globe, Github, Sparkles, BookOpen, Youtube, Flame, Maximize2, Plus } from 'lucide-react';

interface ShortcutItem {
  id: string;
  name: string;
  query: string;
  url?: string;
  iconBg: string;
  iconColor: string;
  icon: React.ElementType;
}

interface QuickShortcutsProps {
  onExecuteShortcut: (query: string, url?: string) => void;
  onOpenCustomModal: () => void;
}

const SHORTCUTS: ShortcutItem[] = [
  {
    id: 'cerealsns',
    name: 'CerealsNS',
    query: 'CerealsNS 深度搜索热点',
    iconBg: 'bg-[#2b273a]',
    iconColor: 'text-blue-500',
    icon: Globe,
  },
  {
    id: 'github',
    name: 'GitHub',
    query: 'GitHub 趋势榜大模型与 AI 开源项目',
    iconBg: 'bg-[#2b273a]',
    iconColor: 'text-slate-100',
    icon: Github,
  },
  {
    id: 'build',
    name: 'Build',
    query: 'AI Studio Build 前沿架构实战',
    iconBg: 'bg-[#2b273a]',
    iconColor: 'text-purple-400',
    icon: Sparkles,
  },
  {
    id: 'hexo',
    name: 'Hexo',
    query: 'Hexo 博客与静态文档生成器方案',
    iconBg: 'bg-[#2b273a]',
    iconColor: 'text-blue-400',
    icon: BookOpen,
  },
  {
    id: 'youtube',
    name: '(100) YouTube',
    query: 'YouTube AI 前沿教程与技术解读',
    iconBg: 'bg-[#2b273a]',
    iconColor: 'text-red-500',
    icon: Youtube,
  },
  {
    id: 'trending',
    name: '全网今日实时热榜',
    query: '2026 今日全网科技与 AI 实时热点排行榜',
    iconBg: 'bg-[#2b273a]',
    iconColor: 'text-amber-400',
    icon: Flame,
  },
  {
    id: 'expand',
    name: '展开 / 自定义',
    query: '',
    iconBg: 'bg-[#2b273a]',
    iconColor: 'text-slate-300',
    icon: Maximize2,
  },
];

export const QuickShortcuts: React.FC<QuickShortcutsProps> = ({
  onExecuteShortcut,
  onOpenCustomModal,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto my-6 px-4">
      <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
        {SHORTCUTS.map((item) => {
          const Icon = item.icon;
          const isCustomButton = item.id === 'expand';

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isCustomButton) {
                  onOpenCustomModal();
                } else {
                  onExecuteShortcut(item.query, item.url);
                }
              }}
              className="group flex flex-col items-center space-y-2 w-16 sm:w-20 cursor-pointer focus:outline-none"
            >
              {/* Circular Icon Wrapper - Pure White Button */}
              <div
                className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-white text-slate-900 border border-slate-200 shadow-md group-hover:bg-slate-100 transition-colors"
              >
                <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${item.iconColor}`} />
              </div>

              {/* Text Label */}
              <span className="text-[11px] sm:text-xs font-medium text-slate-200 group-hover:text-white transition-colors text-center truncate max-w-full">
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
