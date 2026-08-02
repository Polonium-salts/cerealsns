import React, { useState, useEffect } from 'react';
import { Search, Command, Globe, History, Settings, Cpu, Sparkles, X, ArrowRight } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteQuery: (query: string) => void;
  onOpenHistory: () => void;
  onOpenConfig: () => void;
  onChangeModel: (model: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onExecuteQuery,
  onOpenHistory,
  onOpenConfig,
  onChangeModel,
}) => {
  const [input, setInput] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          setInput('');
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onExecuteQuery(input.trim());
      onClose();
    }
  };

  const COMMANDS = [
    {
      id: 'cmd-history',
      title: '检索本地 IndexedDB 离线搜索历史',
      icon: History,
      color: 'text-cyan-400',
      action: () => { onOpenHistory(); onClose(); }
    },
    {
      id: 'cmd-model-router',
      title: '将 AI 流式总结模型设为 OpenRouter Free Router (自动选免费)',
      icon: Cpu,
      color: 'text-indigo-400',
      action: () => { onChangeModel('openrouter/free'); onClose(); }
    },
    {
      id: 'cmd-model-deepseek',
      title: '将 AI 流式总结模型设为 DeepSeek R1 (Free)',
      icon: Cpu,
      color: 'text-blue-400',
      action: () => { onChangeModel('deepseek/deepseek-r1:free'); onClose(); }
    },
    {
      id: 'cmd-config',
      title: '打开系统配置与 OpenRouter API Key 密钥管理',
      icon: Settings,
      color: 'text-amber-400',
      action: () => { onOpenConfig(); onClose(); }
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        
        {/* Input Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center border-b border-slate-800 p-3">
          <Search className="h-5 w-5 text-cyan-400 ml-2" />
          <input
            type="text"
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入搜索词按 Enter 检索，或点击以下快捷指令..."
            className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {input && (
            <button type="submit" className="flex items-center space-x-1 rounded-lg bg-cyan-500 px-3 py-1 text-xs font-bold text-slate-950">
              <span>检索</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          <button type="button" onClick={onClose} className="p-1 text-slate-500 hover:text-slate-200 ml-2">
            <X className="h-4 w-4" />
          </button>
        </form>

        {/* Quick Commands List */}
        <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500">
            快捷动作 & 系统命令
          </div>

          {COMMANDS.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={cmd.action}
                className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`h-4 w-4 ${cmd.color}`} />
                  <span>{cmd.title}</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800/80 bg-slate-950 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
          <span>Esc 键关闭指令面板</span>
          <span className="flex items-center space-x-1">
            <Command className="h-3 w-3" />
            <span>+ K 打开面板</span>
          </span>
        </div>

      </div>
    </div>
  );
};
