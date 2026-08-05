import React, { useState } from 'react';
import { X, Settings, Key, Cpu, Globe, Sliders, ShieldCheck, Check, Plus, Trash2, Save, Cloud } from 'lucide-react';
import type { AppConfig } from '../types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSaveConfig: (newConfig: Partial<AppConfig>) => void;
  storageType?: string;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  storageType,
}) => {
  const [apiKey, setApiKey] = useState(config.openrouterApiKey || '');
  const [model, setModel] = useState(config.openrouterModel || 'openrouter/free');
  const [summaryDepth, setSummaryDepth] = useState(config.summaryDepth || 'standard');
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt || '');
  const [searxngInstances, setSearxngInstances] = useState<string[]>(config.customSearxngUrls || []);
  const [defaultEngines, setDefaultEngines] = useState<string[]>(
    config.defaultEngines || ['google', 'bing', 'baidu', 'duckduckgo', 'yandex']
  );
  const [newUrl, setNewUrl] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleToggleDefaultEngine = (engineId: string) => {
    if (defaultEngines.includes(engineId)) {
      if (defaultEngines.length <= 1) return;
      setDefaultEngines(defaultEngines.filter((e) => e !== engineId));
    } else {
      setDefaultEngines([...defaultEngines, engineId]);
    }
  };

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
      defaultEngines,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-t-3xl sm:rounded-2xl border-t sm:border border-[#27272a] bg-[#18181b] p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        
        {/* Mobile Drag Handle */}
        <div className="sm:hidden w-12 h-1.5 rounded-full bg-[#3f3f46] mx-auto mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3 sm:pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#232326] text-white border border-[#2e2e32]">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>系统配置与 AI 大模型密钥</span>
              </h2>
              <p className="text-xs text-neutral-400">
                配置 OpenRouter API 密钥、精细调节流式总结深度与 SearXNG 节点源
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full border border-[#27272a] p-2 text-neutral-400 hover:bg-[#27272a] hover:text-white transition-colors"
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
                <option value="openrouter/free">⚡ Cloudflare / OpenRouter Free Flash (毫秒级极速响应·推荐)</option>
                <option value="google/gemini-2.0-flash-exp:free">Google Gemini 2.0 Flash (Free 毫秒级极速)</option>
                <option value="meta-llama/llama-3.3-70b-instruct:free">Meta Llama 3.3 70B Instruct (Free 极速)</option>
                <option value="qwen/qwen-2.5-72b-instruct:free">Qwen 2.5 72B Instruct (Free 极速)</option>
                <option value="deepseek/deepseek-chat">DeepSeek V3 Chat (High Performance)</option>
                <option value="deepseek/deepseek-r1:free">DeepSeek R1 Reasoning (Free 包含思维链)</option>
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

          {/* Section 3: Default Search Sources / Engines (默认检索元) */}
          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <label className="flex items-center space-x-2 font-bold text-slate-100">
              <Globe className="h-4 w-4 text-cyan-400" />
              <span>默认开启的全局检索元（搜索引擎源）</span>
            </label>
            <p className="text-[11px] text-slate-400">
              勾选默认发起的检索源，每次搜索将实时向已选检索元聚合并发检索：
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { id: 'google', name: 'Google 谷歌' },
                { id: 'bing', name: 'Bing 微软' },
                { id: 'baidu', name: 'Baidu 百度' },
                { id: 'duckduckgo', name: 'DuckDuckGo' },
                { id: 'yandex', name: 'Yandex' },
                { id: 'wikipedia', name: 'Wikipedia 维基' },
                { id: 'qwant', name: 'Qwant' },
                { id: 'youtube', name: 'YouTube' },
                { id: 'bilibili', name: '哔哩哔哩' },
              ].map((eng) => {
                const isChecked = defaultEngines.includes(eng.id);
                return (
                  <button
                    key={eng.id}
                    type="button"
                    onClick={() => handleToggleDefaultEngine(eng.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                      isChecked
                        ? 'border-cyan-500/80 bg-cyan-950/40 text-cyan-300 shadow-sm'
                        : 'border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div
                      className={`h-3.5 w-3.5 rounded flex items-center justify-center ${
                        isChecked ? 'bg-cyan-400 text-slate-950' : 'border border-slate-700'
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span>{eng.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Custom SearXNG Instances */}
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
              <span>{storageType === 'cloudflare_kv' ? '配置已持久化保存至 Cloudflare KV 空间' : '配置已保存至 KV / 本地存储'}</span>
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
