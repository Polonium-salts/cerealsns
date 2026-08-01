import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Copy, Check, Download, RefreshCw, Volume2, VolumeX, HelpCircle, ArrowRight, Cpu, Pin, ExternalLink } from 'lucide-react';
import type { SearchResult, AppConfig } from '../types';

interface AISummaryCardProps {
  query: string;
  summaryText: string;
  isStreaming: boolean;
  modelUsed?: string;
  searchResults: SearchResult[];
  onRegenerate: (modelOverride?: string, skillOverride?: AppConfig['summaryDepth']) => void;
  onFollowUpClick: (followUpQuery: string) => void;
  config: AppConfig;
  onUpdateConfig?: (newConfig: Partial<AppConfig>) => void;
}

export const AISummaryCard: React.FC<AISummaryCardProps> = ({
  query,
  summaryText,
  isStreaming,
  modelUsed = 'OpenRouter Free Router',
  searchResults,
  onRegenerate,
  onFollowUpClick,
  config,
  onUpdateConfig,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeCitation, setActiveCitation] = useState<SearchResult | null>(null);
  const [isPinned, setIsPinned] = useState(true);

  const activeSkill = config.summaryDepth || 'standard';

  const skillList: Array<{ id: AppConfig['summaryDepth']; label: string; icon: string; desc: string }> = [
    { id: 'standard', label: '📌 综合精准', icon: '📌', desc: '包含核心结论、重点归纳与溯源分析' },
    { id: 'brief', label: '⚡ 极速提炼', icon: '⚡', desc: '200字速读核心结论与关键要点' },
    { id: 'academic', label: '🎓 学术溯源', icon: '🎓', desc: '强调背景理论、演进与事实交叉比对' },
    { id: 'tech', label: '💻 技术全景', icon: '💻', desc: '技术架构、代码/API范式与 Markdown 对比表' },
    { id: 'market', label: '📈 商业研报', icon: '📈', desc: '市场数据、玩家格局与商业对比表' },
    { id: 'deep', label: '🔍 深度探究', icon: '🔍', desc: '多层逻辑梳理与前因后果长文复盘' },
  ];

  // Preprocess text: Convert standalone [1], [2] into clickable [1](#cite-1) if not already markdown link
  const processedMarkdown = summaryText.replace(/(^|[^\[])\[(\d+)\](?!\()/g, (match, prefix, num) => {
    return `${prefix}[${num}](#cite-${num})`;
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([`# AI 概览总结: ${query}\n\n${summaryText}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `google_ai_overview_${query.substring(0, 15).replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('您的浏览器不支持语音朗读功能');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const cleanText = summaryText.replace(/[#*\[\]`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText.substring(0, 800));
      utterance.lang = 'zh-CN';
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Parse follow-up questions
  const extractFollowUps = (text: string): string[] => {
    const followUps: string[] = [];
    const lines = text.split('\n');
    lines.forEach(line => {
      const match = line.match(/(?:追问|延伸探索|建议问题|\d+[\.、])[:：\s]*(.+)/i);
      if (match && match[1] && match[1].length > 4 && match[1].length < 60) {
        followUps.push(match[1].replace(/[*?？]/g, '').trim());
      }
    });
    return Array.from(new Set(followUps)).slice(0, 3);
  };

  const followUpQuestions = extractFollowUps(summaryText);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 p-4 sm:p-5 shadow-lg mb-4">
      {/* Header Bar: Google AI Overview Style */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-3">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1e2432] text-white shadow-md">
            <Sparkles className="h-4 w-4 text-amber-300" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>AI 搜索概览结果</span>
              <span className="inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-[10px] font-bold border border-indigo-300 bg-indigo-50 text-indigo-900 shadow-sm" title="基于实时搜索引擎检索结果精炼合成">
                <Sparkles className="h-2.5 w-2.5 text-indigo-600" />
                <span>精准提炼</span>
              </span>
              {isStreaming && (
                <span className="inline-flex items-center space-x-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-300 animate-pulse">
                  <span>实时提炼中...</span>
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-500">
              知识提炼引擎: <span className="text-slate-800 font-medium">{modelUsed}</span>
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleSpeech}
            className={`p-2 rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors ${
              isSpeaking ? 'text-blue-700 border-blue-300 bg-blue-50' : ''
            }`}
            title={isSpeaking ? '停止朗读' : '语音朗读'}
          >
            {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            onClick={handleCopy}
            className="p-2 rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="复制 Markdown"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </button>

          <button
            onClick={handleDownload}
            className="p-2 rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="导出 Markdown"
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            onClick={() => onRegenerate()}
            disabled={isStreaming}
            className="flex items-center space-x-1.5 rounded-full border border-slate-700 bg-[#1e2432] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-200" />
            <span>重新分析</span>
          </button>
        </div>
      </div>

      {/* AI Search Skill Mode Selector Pill Row */}
      <div className="mb-4 rounded-xl bg-slate-100/80 border border-slate-200/90 p-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1.5 px-1">
          <span className="flex items-center space-x-1.5">
            <Cpu className="h-3.5 w-3.5 text-indigo-600" />
            <span>AI 搜索提炼 Skill 模式</span>
          </span>
          <span className="text-[10px] text-slate-500 font-normal">点击切换技能提炼视角</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {skillList.map((sk) => {
            const isActive = activeSkill === sk.id;
            return (
              <button
                key={sk.id}
                onClick={() => {
                  if (onUpdateConfig) {
                    onUpdateConfig({ summaryDepth: sk.id });
                  }
                  onRegenerate(undefined, sk.id);
                }}
                disabled={isStreaming}
                title={sk.desc}
                className={`flex items-center space-x-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <span>{sk.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Sources Bar */}
      {searchResults && searchResults.length > 0 && (
        <div className="mb-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 p-3 shadow-inner">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2 px-1">
            <span className="flex items-center space-x-1.5 text-slate-900">
              <ExternalLink className="h-3.5 w-3.5 text-indigo-600" />
              <span>权威参考来源 ({Math.min(searchResults.length, 6)})</span>
            </span>
            <span className="text-[10px] text-slate-500 font-normal">引证置顶预览 · 点击打开网页</span>
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
            {searchResults.slice(0, 6).map((item, idx) => (
              <a
                key={item.id || idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setActiveCitation(item)}
                onMouseLeave={() => setActiveCitation(null)}
                className="group flex shrink-0 items-center space-x-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-sm hover:border-indigo-400 hover:bg-indigo-50/80 hover:shadow transition-all max-w-[210px]"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded bg-indigo-100 text-[10px] font-mono font-bold text-indigo-700 shrink-0">
                  {idx + 1}
                </span>
                <img src={item.favicon} alt="" className="h-3.5 w-3.5 rounded shrink-0" />
                <span className="truncate font-medium text-[11px] group-hover:text-indigo-900">
                  {item.title}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Markdown Output Area */}
      <div className="relative text-slate-800 text-sm leading-relaxed min-h-[100px]">
        {summaryText ? (
          <div className="prose max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-h3:text-base prose-p:leading-relaxed prose-a:text-blue-600 prose-code:text-slate-900 prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
            <ReactMarkdown
              components={{
                h3: ({ children }) => (
                  <h3 className="text-base font-bold text-slate-900 mt-5 mb-2.5 pb-1 border-b border-slate-200/80 flex items-center space-x-2">
                    <span>{children}</span>
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-sm font-semibold text-slate-800 mt-3 mb-1.5">{children}</h4>
                ),
                p: ({ children }) => (
                  <p className="my-2 text-slate-800 leading-relaxed">{children}</p>
                ),
                hr: () => <hr className="my-4 border-slate-200" />,
                strong: ({ children }) => (
                  <strong className="font-bold text-slate-950 bg-slate-100/80 px-1 py-0.5 rounded">{children}</strong>
                ),
                a: ({ href, children }) => {
                  const match = href?.match(/^#cite-(\d+)$/);
                  if (match) {
                    const citeIdx = parseInt(match[1], 10) - 1;
                    const resultItem = searchResults[citeIdx];
                    return (
                      <button
                        type="button"
                        onClick={() => resultItem && window.open(resultItem.url, '_blank')}
                        onMouseEnter={() => setActiveCitation(resultItem || null)}
                        onMouseLeave={() => setActiveCitation(null)}
                        className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-mono font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-colors mx-0.5 cursor-pointer"
                        title={resultItem ? `${resultItem.title} - ${resultItem.url}` : `来源网页 [${citeIdx + 1}]`}
                      >
                        <span>{children}</span>
                      </button>
                    );
                  }
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 font-medium text-blue-600 hover:text-blue-800 underline decoration-blue-300 hover:decoration-blue-600 transition-colors"
                    >
                      <span>{children}</span>
                      <ExternalLink className="h-3 w-3 inline-block shrink-0 opacity-80" />
                    </a>
                  );
                },
                table: ({ children }) => (
                  <div className="my-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/90 p-1 shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-slate-200/90 text-slate-900 font-bold border-b border-slate-300">{children}</thead>,
                th: ({ children }) => <th className="px-3 py-2 text-slate-900 font-bold">{children}</th>,
                td: ({ children }) => <td className="px-3 py-2 border-t border-slate-200 text-slate-800 font-normal">{children}</td>,
                ul: ({ children }) => <ul className="list-disc pl-5 my-2.5 space-y-1.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 my-2.5 space-y-1.5">{children}</ol>,
                li: ({ children }) => <li className="text-slate-800 leading-relaxed">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-indigo-500 bg-indigo-50/60 px-4 py-2.5 my-3 rounded-r-lg text-slate-700 font-medium">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {processedMarkdown}
            </ReactMarkdown>

            {isStreaming && (
              <span className="inline-block h-4 w-2 ml-1 bg-slate-800 rounded-sm vertical-middle" />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500 space-y-3">
            <p className="text-xs font-medium text-slate-600">正在生成 CerealsNS AI 概览总结...</p>
          </div>
        )}
      </div>

      {/* Hover Citation Preview */}
      {activeCitation && (
        <div className="mt-3 rounded-2xl border border-slate-300 bg-slate-50 p-3 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-900 flex items-center space-x-1">
              <img src={activeCitation.favicon} alt="" className="h-3.5 w-3.5 rounded" />
              <span>来源: {activeCitation.engine}</span>
            </span>
            <span className="text-[10px] text-emerald-700">{activeCitation.edgeNode}</span>
          </div>
          <p className="text-xs font-bold text-slate-900 line-clamp-1">{activeCitation.title}</p>
          <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{activeCitation.snippet}</p>
        </div>
      )}

      {/* Follow-Up Questions Pill List */}
      {followUpQuestions.length > 0 && !isStreaming && (
        <div className="mt-5 pt-3 border-t border-slate-200">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 mb-2">
            <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
            <span>延伸追问：</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {followUpQuestions.map((fq, idx) => (
              <button
                key={idx}
                onClick={() => onFollowUpClick(fq)}
                className="group flex items-center space-x-1.5 rounded-full border border-slate-300 bg-slate-50 px-3.5 py-1.5 text-xs text-slate-700 hover:border-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all text-left"
              >
                <span>{fq}</span>
                <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Model Selector Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-3 border-t border-slate-200">
        <div className="flex items-center space-x-1.5">
          <Cpu className="h-3.5 w-3.5 text-slate-700" />
          <span>切换模型：</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'openrouter/free', name: 'Free Router (推荐)' },
            { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)' },
            { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 (Free)' },
            { id: 'openai/gpt-oss-20b:free', name: 'gpt-oss-20b (Free)' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => onRegenerate(m.id)}
              disabled={isStreaming}
              className={`rounded-full px-3 py-0.5 text-[11px] transition-colors ${
                config.openrouterModel === m.id
                  ? 'bg-[#1e2432] text-white font-bold'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
