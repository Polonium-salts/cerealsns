import React, { useState } from 'react';
import { X, Settings, Key, Cpu, Globe, Sliders, ShieldCheck, Check, Plus, Trash2, Save, Cloud } from 'lucide-react';
import type { AppConfig } from '../types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSaveConfig: (newConfig: Partial<AppConfig>) => void;
  firebaseConnected: boolean;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  firebaseConnected,
}) => {
  const [apiKey, setApiKey] = useState(config.openrouterApiKey || '');
  const [model, setModel] = useState(config.openrouterModel || 'openrouter/free');
  const [summaryDepth, setSummaryDepth] = useState(config.summaryDepth || 'standard');
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt || '');
  const [searxngInstances, setSearxngInstances] = useState<string[]>(config.customSearxngUrls || []);
  const [newUrl, setNewUrl] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleAddInstance = () => {
    if (newUrl.trim() && !searxngInstances.includes(newUrl.trim())) {
      setSearxngInstances([...searxngInstances, newUrl.trim()]);
      setNewUrl('');
    }
  };

  const handleRemoveInstance = (urlToRemove: string) => {
    setSearxngInstances(searxngInstances.filter((u) => u !== urlToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      openrouterApiKey: apiKey,
      openrouterModel: model,
      summaryDepth: summaryDepth as any,
      systemPrompt,
      customSearxngUrls: searxngInstances,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-950 text-indigo-400 border border-indigo-800/50">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>系统配置与 AI 大模型密钥</span>
              </h2>
              <p className="text-xs text-slate-400">
                配置 OpenRouter API 密钥、精细调节流式总结深度与 SearXNG 节点源
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

        <form onSubmit={handleSubmit} className="space-y-5 text-xs text-slate-200">
          
          {/* Section 1: OpenRouter Key */}
          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <label className="flex items-center space-x-2 font-bold text-slate-100">
              <Key className="h-4 w-4 text-cyan-400" />
              <span>OpenRouter API Key (可选 / 留空默认使用服务器 OpenRouter 密钥)</span>
            </label>
            <p className="text-[11px] text-slate-400">
              接入 OpenRouter 可调用包含 Claude 3.5 Sonnet、DeepSeek R1、GPT-4o 等全球顶级 LLM 模型。
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-v1-xxxxxxxx..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-cyan-300 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Section 2: Model & Summary Depth */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <label className="flex items-center space-x-2 font-bold text-slate-100">
                <Cpu className="h-4 w-4 text-indigo-400" />
                <span>默认智能总结大模型</span>
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="openrouter/free">OpenRouter Free Router (自动选免费·推荐)</option>
                <option value="google/gemma-4-31b-it:free">Google Gemma 4 31B (Free)</option>
                <option value="nvidia/nemotron-3-super-120b-a12b:free">NVIDIA Nemotron 3 Super (Free)</option>
                <option value="openai/gpt-oss-20b:free">OpenAI gpt-oss-20b (Free)</option>
                <option value="cohere/north-mini-code:free">Cohere North Mini Code (Free)</option>
              </select>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <label className="flex items-center space-x-2 font-bold text-slate-100">
                <Sliders className="h-4 w-4 text-purple-400" />
                <span>总结模式与生成深度</span>
              </label>
              <select
                value={summaryDepth}
                onChange={(e) => setSummaryDepth(e.target.value as any)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-purple-500 focus:outline-none"
              >
                <option value="brief">⚡ 极速提炼 (200字速读核心结论与关键要点)</option>
                <option value="standard">📌 标准综合 (包含核心结论、重点归纳与溯源分析)</option>
                <option value="academic">🎓 学术溯源 (强调背景理论、演进与事实交叉比对)</option>
                <option value="tech">💻 技术全景 (技术架构、代码/API范式与 Markdown 对比表)</option>
                <option value="market">📈 商业研报 (市场数据、玩家格局与商业对比表)</option>
                <option value="deep">🔍 深度探究 (分层次剖析技术架构与多维度研报)</option>
              </select>
            </div>
          </div>

          {/* Section 3: Custom SearXNG Instances */}
          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <label className="flex items-center space-x-2 font-bold text-slate-100">
              <Globe className="h-4 w-4 text-emerald-400" />
              <span>SearXNG 节点实例源设置</span>
            </label>
            <p className="text-[11px] text-slate-400">
              系统已默认集成 6 个全球高速公用/私用 SearXNG 实例节点，您也可以添加自己的私有 SearXNG 节点 URL：
            </p>

            <div className="flex space-x-2">
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://my-searxng-instance.com"
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-emerald-300 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddInstance}
                className="flex items-center space-x-1 rounded-xl bg-slate-800 px-3 py-2 font-semibold text-slate-200 hover:bg-slate-700"
              >
                <Plus className="h-4 w-4" />
                <span>添加节点</span>
              </button>
            </div>

            {searxngInstances.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {searxngInstances.map((instUrl) => (
                  <div key={instUrl} className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-1.5 font-mono text-[11px] text-slate-300">
                    <span>{instUrl}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveInstance(instUrl)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: AI Skill Output Standard & System Prompt */}
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="font-bold text-slate-100 flex items-center space-x-1.5">
                <span>AI 回答结构规范 Skill 预设与 System Prompt</span>
              </label>
              <span className="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/60 font-mono">
                Skill 规范驱动
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              快速点击下方 Skill 规范模版，可一键向 AI 输出注入结构化提炼指令，让回答更直观便捷：
            </p>

            <div className="flex flex-wrap gap-2 text-[11px]">
              <button
                type="button"
                onClick={() =>
                  setSystemPrompt(
                    '严格遵循【AI 结构化回答标准 Skill】：1. 最顶部提供 📌 一句话结论；2. 💡 3 条核心要点带引用角标；3. 📊 使用 Markdown 表格进行对比分析；4. 🔍 深度拆解剖析；5. 🎯 末尾列出 3 个衍生追问。'
                  )
                }
                className="rounded-lg bg-indigo-950/80 px-2.5 py-1 text-indigo-300 border border-indigo-800/60 hover:bg-indigo-900 transition-colors"
              >
                📌 结构化标准 Skill
              </button>
              <button
                type="button"
                onClick={() =>
                  setSystemPrompt(
                    '遵循【对比分析 Skill】：重点突出不同方案、技术或工具的对比。必须包含至少一个 📊 Markdown 对比表格（包含维度、优点、缺点、适用场景），并在开头提供 📌 选型结论。'
                  )
                }
                className="rounded-lg bg-cyan-950/80 px-2.5 py-1 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900 transition-colors"
              >
                📊 方案对比表 Skill
              </button>
              <button
                type="button"
                onClick={() =>
                  setSystemPrompt(
                    '遵循【极简快讯 Skill】：去掉冗余解释，直接使用 📌 一句话结论 + ⚡ 3 条超精炼要点，全篇控制在 200 字以内，最快获取关键结论。'
                  )
                }
                className="rounded-lg bg-emerald-950/80 px-2.5 py-1 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900 transition-colors"
              >
                ⚡ 极简速览 Skill
              </button>
            </div>

            <textarea
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="自定义提示词指令..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
              <Cloud className="h-4 w-4 text-indigo-400" />
              <span>{firebaseConnected ? '配置将实时同步至 Firebase 云端' : '已保存在本地浏览器配置'}</span>
            </div>

            <button
              type="submit"
              className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 px-6 py-2.5 font-bold text-white shadow-lg shadow-indigo-500/20 hover:opacity-95"
            >
              {savedSuccess ? (
                <>
                  <Check className="h-4 w-4 text-emerald-300" />
                  <span>已保存设置</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>保存并应用</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
