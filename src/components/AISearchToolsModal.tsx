import React, { useState } from 'react';
import { 
  X, 
  BarChart3, 
  Sparkles, 
  Globe, 
  Copy, 
  Check, 
  Terminal, 
  ShieldCheck, 
  ExternalLink,
  Code2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Search,
  BookOpen
} from 'lucide-react';

interface AISearchToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AISearchToolsModal: React.FC<AISearchToolsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'domain_rank' | 'ai_search' | 'api_docs'>('domain_rank');

  // Domain Rank State
  const [domainInput, setDomainInput] = useState('github.com, developer.mozilla.org, baike.baidu.com, csdn.net');
  const [isEvaluatingRank, setIsEvaluatingRank] = useState(false);
  const [domainResults, setDomainResults] = useState<any[]>([]);

  // AI Search API Playground State
  const [searchQuery, setSearchQuery] = useState('Spring Boot 跨域配置');
  const [formatMode, setFormatMode] = useState<'markdown' | 'json'>('markdown');
  const [maxResults, setMaxResults] = useState(5);
  const [isGeneratingAiSearch, setIsGeneratingAiSearch] = useState(false);
  const [aiSearchResult, setAiSearchResult] = useState<any>(null);
  const [rawTextOutput, setRawTextOutput] = useState('');

  // Copy indicator
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Run Domain Rank Assessment
  const runDomainRankTest = async () => {
    if (!domainInput.trim()) return;
    setIsEvaluatingRank(true);
    try {
      const resp = await fetch(`/api/domain-rank?urls=${encodeURIComponent(domainInput)}`);
      if (resp.ok) {
        const data = await resp.json();
        setDomainResults(data.results || []);
      }
    } catch (e) {
      console.error('Domain rank test error:', e);
    } finally {
      setIsEvaluatingRank(false);
    }
  };

  // Run AI Search API Test
  const runAiSearchTest = async () => {
    if (!searchQuery.trim()) return;
    setIsGeneratingAiSearch(true);
    try {
      const url = `/api/ai-search?q=${encodeURIComponent(searchQuery)}&format=${formatMode}&max_results=${maxResults}`;
      const resp = await fetch(url);
      if (formatMode === 'markdown') {
        const text = await resp.text();
        setRawTextOutput(text);
        setAiSearchResult(null);
      } else {
        const json = await resp.json();
        setAiSearchResult(json);
        setRawTextOutput(JSON.stringify(json, null, 2));
      }
    } catch (e) {
      console.error('AI search test error:', e);
    } finally {
      setIsGeneratingAiSearch(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#27272a] flex items-center justify-between bg-slate-50/50 dark:bg-[#18181b]/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                网站排名与 AI 精准搜索 API 工具
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                  v2.5 RAG API
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                评估域名权威度排名，并测试为 AI Agent / LLM 自动提供精准搜索上下文的内部数据源
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#27272a] rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="px-5 border-b border-slate-200 dark:border-[#27272a] flex space-x-6 bg-white dark:bg-[#121215]">
          <button
            onClick={() => { setActiveTab('domain_rank'); if (domainResults.length === 0) runDomainRankTest(); }}
            className={`py-3 text-xs sm:text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'domain_rank'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>网站排名权威度检测</span>
          </button>

          <button
            onClick={() => { setActiveTab('ai_search'); if (!rawTextOutput && !aiSearchResult) runAiSearchTest(); }}
            className={`py-3 text-xs sm:text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'ai_search'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>AI 精准搜索 API 调试器</span>
          </button>

          <button
            onClick={() => setActiveTab('api_docs')}
            className={`py-3 text-xs sm:text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'api_docs'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
            }`}
          >
            <Code2 className="h-4 w-4" />
            <span>API 开发者文档</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: DOMAIN RANKING TOOL */}
          {activeTab === 'domain_rank' && (
            <div className="space-y-5">
              <div className="bg-slate-50 dark:bg-[#18181b] p-4 rounded-xl border border-slate-200 dark:border-[#27272a] space-y-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  输入待测试的网址或域名 (支持逗号分隔多个域名):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    placeholder="例如: github.com, developer.mozilla.org, csdn.net"
                    className="flex-1 px-3 py-2 bg-white dark:bg-[#09090b] border border-slate-300 dark:border-[#3f3f46] rounded-lg text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  />
                  <button
                    onClick={runDomainRankTest}
                    disabled={isEvaluatingRank}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs sm:text-sm font-medium flex items-center space-x-1.5 transition-all disabled:opacity-50 shrink-0"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>{isEvaluatingRank ? '分析中...' : '评估排名与权威度'}</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-500 dark:text-neutral-400">
                  <span>快捷测试点选:</span>
                  {['github.com', 'developer.mozilla.org', 'react.dev', 'baike.baidu.com', 'csdn.net'].map((sample) => (
                    <button
                      key={sample}
                      onClick={() => { setDomainInput(sample); }}
                      className="px-2 py-0.5 rounded-sm bg-slate-200 dark:bg-[#27272a] hover:bg-emerald-500/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>

              {/* Domain Assessment Results Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  域名权威度评估报告 ({domainResults.length})
                </h3>

                {domainResults.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 dark:border-[#27272a] rounded-xl text-slate-400 dark:text-neutral-500 text-xs">
                    点击“评估排名与权威度”查看详细数据
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {domainResults.map((item, idx) => {
                      const isHigh = item.authorityScore >= 80;
                      return (
                        <div key={idx} className="p-4 bg-slate-50/70 dark:bg-[#18181b]/70 border border-slate-200 dark:border-[#27272a] rounded-xl space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <Globe className="h-4 w-4 text-slate-400" />
                              <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                                {item.domain}
                              </span>
                            </div>
                            <div className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold font-mono border ${
                              isHigh 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            }`}>
                              Score: {item.authorityScore}/100
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-[#27272a] font-medium text-slate-700 dark:text-neutral-300">
                              {item.authorityTier}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-[#27272a]/60 text-slate-600 dark:text-neutral-400 font-mono">
                              类别: {item.category}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-neutral-300 bg-white dark:bg-[#09090b] p-2 rounded-lg border border-slate-200 dark:border-[#27272a]">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">AI Citation 建议: </span>
                            {item.recommendation}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AI SEARCH API PLAYGROUND */}
          {activeTab === 'ai_search' && (
            <div className="space-y-5">
              <div className="bg-slate-50 dark:bg-[#18181b] p-4 rounded-xl border border-slate-200 dark:border-[#27272a] space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                      搜索 Prompt 词:
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="如: Spring Boot 跨域配置"
                      className="w-full px-3 py-2 bg-white dark:bg-[#09090b] border border-slate-300 dark:border-[#3f3f46] rounded-lg text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                      输出数据格式:
                    </label>
                    <select
                      value={formatMode}
                      onChange={(e) => setFormatMode(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#09090b] border border-slate-300 dark:border-[#3f3f46] rounded-lg text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="markdown">Markdown Prompt (RAG Context)</option>
                      <option value="json">Structured JSON Array</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-3 text-xs text-slate-600 dark:text-neutral-400">
                    <span>最大精确条目数: {maxResults}</span>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      value={maxResults}
                      onChange={(e) => setMaxResults(parseInt(e.target.value, 10))}
                      className="w-24 accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={runAiSearchTest}
                    disabled={isGeneratingAiSearch}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs sm:text-sm font-medium flex items-center space-x-1.5 transition-all disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{isGeneratingAiSearch ? '数据源生成中...' : '生成 AI 搜索上下文'}</span>
                  </button>
                </div>
              </div>

              {/* Output Viewer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-emerald-500" />
                    /api/ai-search 返回结果预览
                  </span>

                  {rawTextOutput && (
                    <button
                      onClick={() => handleCopy(rawTextOutput, 'ai_output')}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-[#27272a] hover:bg-slate-200 dark:hover:bg-[#3f3f46] text-slate-700 dark:text-neutral-300 rounded text-xs flex items-center space-x-1 transition-all"
                    >
                      {copiedKey === 'ai_output' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedKey === 'ai_output' ? '已复制上下文!' : '复制 AI 提示词上下文'}</span>
                    </button>
                  )}
                </div>

                <div className="relative bg-[#09090b] border border-slate-800 rounded-xl p-4 overflow-x-auto font-mono text-xs text-neutral-200 max-h-80 scrollbar-thin">
                  {rawTextOutput ? (
                    <pre className="whitespace-pre-wrap break-words">{rawTextOutput}</pre>
                  ) : (
                    <div className="py-12 text-center text-neutral-600 text-xs font-sans">
                      点击“生成 AI 搜索上下文”测试 AI 数据源接口
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEVELOPER API DOCS */}
          {activeTab === 'api_docs' && (
            <div className="space-y-6 text-xs sm:text-sm">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                <h4 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  内部 AI 自动化精准搜索与域名排名 API 说明
                </h4>
                <p className="text-slate-600 dark:text-neutral-300 text-xs">
                  本系统提供原生的内部 API，专门为 AI Agent、RAG 向量检索、LLM Prompt 提示词上下文以及开发者工具提供高精确度、无垃圾广告的纯净搜索数据源。
                </p>
              </div>

              {/* Endpoint 1 */}
              <div className="space-y-3 border border-slate-200 dark:border-[#27272a] p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-xs font-bold font-mono">GET / POST</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">/api/ai-search</span>
                  </div>
                  <span className="text-xs text-slate-400">AI 专用搜索接口</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-neutral-400">
                  为 AI Agent 生成直接可用的带有 [1], [2] 编号与权威度分数的 RAG 提示词上下文。
                </p>
                <div className="bg-[#09090b] p-3 rounded-lg font-mono text-xs text-neutral-200 relative">
                  <button
                    onClick={() => handleCopy(`curl "http://localhost:3000/api/ai-search?q=Spring+Boot+跨域&format=markdown&max_results=5"`, 'curl_1')}
                    className="absolute top-2 right-2 p-1 text-neutral-400 hover:text-white"
                  >
                    {copiedKey === 'curl_1' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <code>curl "http://localhost:3000/api/ai-search?q=Spring+Boot+跨域&format=markdown&max_results=5"</code>
                </div>
              </div>

              {/* Endpoint 2 */}
              <div className="space-y-3 border border-slate-200 dark:border-[#27272a] p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-xs font-bold font-mono">GET / POST</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">/api/domain-rank</span>
                  </div>
                  <span className="text-xs text-slate-400">网站排名权威度评估</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-neutral-400">
                  批量计算网站域名权威度分数 (0-100)、评分阶梯 (S+ Tier / A Tier)、置信级别与 AI 引用建议。
                </p>
                <div className="bg-[#09090b] p-3 rounded-lg font-mono text-xs text-neutral-200 relative">
                  <button
                    onClick={() => handleCopy(`curl "http://localhost:3000/api/domain-rank?urls=github.com,developer.mozilla.org"`, 'curl_2')}
                    className="absolute top-2 right-2 p-1 text-neutral-400 hover:text-white"
                  >
                    {copiedKey === 'curl_2' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <code>curl "http://localhost:3000/api/domain-rank?urls=github.com,developer.mozilla.org"</code>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-[#27272a] bg-slate-50/50 dark:bg-[#18181b]/50 flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI 实时检索 API 就绪中</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-[#27272a] hover:bg-slate-300 dark:hover:bg-[#3f3f46] text-slate-800 dark:text-white rounded-lg font-medium transition-colors"
          >
            关闭
          </button>
        </div>

      </div>
    </div>
  );
};
