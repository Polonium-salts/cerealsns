import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { Sparkles, Copy, Check, Download, RefreshCw, Volume2, VolumeX, ArrowRight, Cpu, Pin, ExternalLink } from 'lucide-react';
import type { SearchResult, AppConfig } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { sanitizeMarkdown } from '../lib/utils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

// Helper Component for Code Blocks with Language & Copy Button
const CodeBlock: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';

  const codeString = String(children).replace(/\n$/, '');

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = codeString.split('\n');

  return (
    <div className="relative group my-3.5 rounded-xl border border-[#2e2e32] bg-[#121215] overflow-hidden shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1c1c20] border-b border-[#2e2e32] text-[11px] font-mono text-neutral-400 select-none">
        <div className="flex items-center space-x-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80 inline-block" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80 inline-block" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/80 inline-block" />
          <span className="ml-2 font-bold text-purple-300 tracking-wide">{lang ? lang.toUpperCase() : 'CODE'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#2a2a2e] hover:bg-[#3f3f46] text-neutral-300 hover:text-white transition-all text-[11px] font-medium"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? '已复制' : '复制代码'}</span>
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-xs font-mono text-neutral-200 leading-relaxed whitespace-pre flex">
        {lines.length > 1 && (
          <div className="pr-4 mr-4 border-r border-[#27272a] text-neutral-600 text-right select-none font-mono text-[11px]">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
        )}
        <code className="flex-1">{codeString}</code>
      </div>
    </div>
  );
};

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
  onAiTriggerSearXNGSearch?: () => void;
  isAiSyncing?: boolean;
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
  onAiTriggerSearXNGSearch,
  isAiSyncing = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeCitation, setActiveCitation] = useState<SearchResult | null>(null);
  const [isPinned, setIsPinned] = useState(true);

  const activeSkill = config.summaryDepth || 'standard';

  const skillList: Array<{ id: AppConfig['summaryDepth']; label: string; icon: string; desc: string }> = [
    { id: 'standard', label: '综合精准', icon: '📌', desc: '包含核心结论、重点归纳与溯源分析' },
    { id: 'brief', label: '极速提炼', icon: '⚡', desc: '200字速读核心结论与关键要点' },
    { id: 'academic', label: '学术溯源', icon: '🎓', desc: '强调背景理论、演进与事实交叉比对' },
    { id: 'tech', label: '技术全景', icon: '💻', desc: '技术架构、代码/API范式与对比表' },
    { id: 'market', label: '商业研报', icon: '📈', desc: '市场数据、玩家格局与商业对比表' },
    { id: 'deep', label: '深度探究', icon: '🔍', desc: '多层逻辑梳理与前因后果长文复盘' },
  ];

  // Preprocess markdown: Clean thinking tags, fix inline headers/lists, table syntax issues, protect code blocks, and format citations & math equations
  const formatMarkdownText = (rawText: string): string => {
    if (!rawText) return '';

    let text = rawText;

    // 1. Clean up thinking process tags (<think>...</think>, <thought>...</thought>) or model prompt leakage
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
    // Strip meta prompt instructions if present at start
    text = text.replace(/^(?:We need to produce|We need to answer|Here is a summary|Based on the search results)[\s\S]*?(?=(?:###|#|1\.|-|\*\*))/i, '');

    // 2. Extract code blocks (fenced ```...``` and inline `...`) to protect code syntax from corruption
    const codeBlocks: string[] = [];
    text = text.replace(/```[\s\S]*?```|`[^`\n]+`/g, (match) => {
      codeBlocks.push(match);
      return `__MD_CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    // 3. Normalize Unicode Circle Numbers & Citations into clickable links [$1](#cite-$1)
    const circleMap: Record<string, string> = {
      '❶': '1', '①': '1', '1️⃣': '1',
      '❷': '2', '②': '2', '2️⃣': '2',
      '❸': '3', '③': '3', '3️⃣': '3',
      '❹': '4', '④': '4', '4️⃣': '4',
      '❺': '5', '⑤': '5', '5️⃣': '5',
      '❻': '6', '⑥': '6', '6️⃣': '6',
      '❼': '7', '⑦': '7', '7️⃣': '7',
      '❽': '8', '⑧': '8', '8️⃣': '8',
      '❾': '9', '⑨': '9', '9️⃣': '9',
      '❿': '10', '⑩': '10'
    };
    text = text.replace(/[❶-❿①-⑩]|1️⃣|2️⃣|3️⃣|4️⃣|5️⃣|6️⃣|7️⃣|8️⃣|9️⃣/g, (m) => {
      const num = circleMap[m] || '1';
      return ` [${num}](#cite-${num})`;
    });

    // Convert standard bracket citations [1], [^1], [^1^] into clickable links
    text = text.replace(/\[\^?(\d+)\^?\](?!\(|:)/g, '[$1](#cite-$1)');
    // Convert trailing parenthesized numbers (1), (2) into clickable links if preceded by text/space
    text = text.replace(/(?<=\S)\s*\(([1-9]|10)\)(?!\(|:)/g, ' [$1](#cite-$1)');

    // 4. Ensure Headings (#, ##, ###, ####) start on a new line with empty space before them
    text = text.replace(/([^\n])\s*(#{1,6}\s+)/g, '$1\n\n$2');

    // 5. Ensure Unordered Lists (- , * ) and Ordered Lists (1. , 2. ) start on a new line
    text = text.replace(/([^\n])\s+([-\*]\s+)/g, '$1\n$2');
    text = text.replace(/([^\n;。！？:\n])\s+(\d+\.\s+)/g, '$1\n$2');

    // 6. Convert LaTeX math delimiters \[ ... \] -> $$ ... $$ and \( ... \) -> $ ... $
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$ $1 $$$$');
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, '$$ $1 $$');

    // 7. Fix Table syntax: concatenated pipes (||) and missing delimiter rows
    text = text.replace(/\|{2,}/g, '|\n|');
    text = text.replace(/\|\s*\|\s*(?=[-:\s]*\|)/g, '|\n|');

    const lines = text.split('\n');
    const resultLines: string[] = [];
    let inTable = false;
    let tableRowsBuffer: string[] = [];

    const flushTableBuffer = () => {
      if (tableRowsBuffer.length > 0) {
        // Check if table needs a GFM header separator row (| --- | --- |)
        if (tableRowsBuffer.length >= 2) {
          const firstRow = tableRowsBuffer[0];
          const secondRow = tableRowsBuffer[1];
          const isSecondRowSeparator = /^\|\s*:?-+:?\s*\|/.test(secondRow);
          if (!isSecondRowSeparator) {
            const cols = firstRow.split('|').length - 2;
            if (cols > 0) {
              const separatorRow = '| ' + Array(cols).fill('---').join(' | ') + ' |';
              tableRowsBuffer.splice(1, 0, separatorRow);
            }
          }
        }
        resultLines.push(...tableRowsBuffer);
        tableRowsBuffer = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const isTableLine = line.startsWith('|') && line.endsWith('|');

      if (isTableLine) {
        if (!inTable) {
          inTable = true;
          if (resultLines.length > 0 && resultLines[resultLines.length - 1].trim() !== '') {
            resultLines.push('');
          }
        }
        tableRowsBuffer.push(line);
      } else {
        if (inTable) {
          inTable = false;
          flushTableBuffer();
          if (line !== '') {
            resultLines.push('');
          }
        }
        resultLines.push(lines[i]);
      }
    }
    if (inTable) {
      flushTableBuffer();
    }

    text = resultLines.join('\n');

    // 8. Restore protected code blocks
    text = text.replace(/__MD_CODE_BLOCK_(\d+)__/g, (_, idx) => {
      return codeBlocks[parseInt(idx, 10)] || '';
    });

    return text.trim();
  };

  const processedMarkdown = sanitizeMarkdown(formatMarkdownText(summaryText));

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
    <Card className={`relative overflow-hidden border-[#27272a] bg-[#18181b] shadow-2xl transition-all ${isPinned ? 'lg:sticky lg:top-20' : ''}`}>
      {/* Header */}
      <CardHeader className="pb-3 border-b border-[#27272a] hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
              <Sparkles className="h-4 w-4 text-purple-300 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-white flex items-center space-x-2">
                <span>AI 搜索概览</span>
                {isStreaming && (
                  <Badge variant="secondary" className="animate-pulse bg-[#27272a] text-neutral-200 border-[#3f3f46]">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mr-1.5 animate-ping" />
                    SearXNG 思考生成中...
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center space-x-2 text-[11px] text-neutral-400 mt-0.5">
                <span className="flex items-center space-x-1">
                  <Cpu className="h-3 w-3 text-neutral-400" />
                  <span>引擎: {modelUsed}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center space-x-1">
            {onAiTriggerSearXNGSearch && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAiTriggerSearXNGSearch}
                disabled={isAiSyncing}
                className="h-7 px-2.5 text-[11px] bg-purple-500/15 border-purple-500/30 text-purple-300 hover:bg-purple-500/30 hover:text-white transition-all flex items-center space-x-1 mr-1"
                title="重新请求 SearXNG API 并同步列表"
              >
                <RefreshCw className={`h-3 w-3 ${isAiSyncing ? 'animate-spin' : ''}`} />
                <span>{isAiSyncing ? '同步中...' : 'SearXNG 列表同步'}</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-[#27272a]"
              title="复制回答"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSpeech}
              className={`h-8 w-8 ${isSpeaking ? 'text-amber-300' : 'text-neutral-400 hover:text-white hover:bg-[#27272a]'}`}
              title="语音朗读"
            >
              {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-[#27272a]"
              title="下载 Markdown 简报"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRegenerate()}
              className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-[#27272a]"
              title="重新生成"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isStreaming ? 'animate-spin text-white' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPinned(!isPinned)}
              className={`h-8 w-8 ${isPinned ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
              title={isPinned ? '已固定置顶' : '取消固定'}
            >
              <Pin className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Skill Selector Tabs - Native Rounded Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-2.5 scrollbar-none">
          {skillList.map((skill) => {
            const isSelected = activeSkill === skill.id;
            return (
              <button
                key={skill.id}
                onClick={() => {
                  if (onUpdateConfig) {
                    onUpdateConfig({ summaryDepth: skill.id });
                  }
                  onRegenerate(undefined, skill.id);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center space-x-1 ${
                  isSelected
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'bg-[#27272a] text-neutral-300 hover:text-white hover:bg-[#3f3f46] border border-[#2e2e32]'
                }`}
                title={skill.desc}
              >
                <span>{skill.icon}</span>
                <span>{skill.label}</span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      {/* Main Content Area */}
      <CardContent className="pt-4 space-y-4">
        {/* Source References Pill Grid (Moved to top) */}
        {searchResults.length > 0 && (
          <div className="pb-3 border-b border-[#27272a]">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-2">
              <span className="font-medium text-neutral-300">主要信息引用源 ({searchResults.slice(0, 5).length})：</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {searchResults.slice(0, 5).map((item, idx) => (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-[#232326] hover:bg-[#27272a] border border-[#2e2e32] text-[10px] text-neutral-300 hover:text-white transition-colors truncate flex items-center space-x-1.5"
                >
                  <span className="h-4 w-4 rounded-full bg-[#27272a] text-white flex items-center justify-center font-bold text-[9px] shrink-0 border border-[#3f3f46]">
                    {idx + 1}
                  </span>
                  <span className="truncate">{item.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Markdown Render Area */}
        <div className="prose prose-invert prose-sm max-w-none text-neutral-200 leading-relaxed text-xs sm:text-sm">
          {summaryText ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeRaw, rehypeKatex]}
              components={{
                a: ({ href, children }) => {
                  if (href?.startsWith('#cite-')) {
                    const index = parseInt(href.replace('#cite-', ''), 10) - 1;
                    const result = searchResults[index];
                    return (
                      <span
                        onClick={() => result && setActiveCitation(result)}
                        className="inline-flex items-center justify-center h-4 w-4 text-[10px] font-bold rounded-full bg-[#27272a] text-white border border-[#3f3f46] hover:bg-white hover:text-black transition-colors cursor-pointer mx-0.5"
                        title={result?.title || '引用来源'}
                      >
                        {children}
                      </span>
                    );
                  }
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-purple-300 underline hover:text-purple-200 transition-colors">
                      {children}
                    </a>
                  );
                },
                h1: ({ children }) => <h1 className="text-lg sm:text-xl font-extrabold text-white mt-4 mb-2 pb-2 border-b border-[#3f3f46] tracking-tight">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base sm:text-lg font-bold text-neutral-100 mt-4 mb-2 flex items-center space-x-2 tracking-tight">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm sm:text-base font-semibold text-purple-300 mt-3 mb-1.5">{children}</h3>,
                h4: ({ children }) => <h4 className="text-xs sm:text-sm font-semibold text-neutral-200 mt-2.5 mb-1">{children}</h4>,
                h5: ({ children }) => <h5 className="text-xs font-semibold text-neutral-300 mt-2 mb-1">{children}</h5>,
                h6: ({ children }) => <h6 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mt-2 mb-1">{children}</h6>,
                p: ({ children }) => <p className="my-2 text-neutral-300 leading-relaxed text-xs sm:text-sm">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                em: ({ children }) => <em className="italic text-neutral-200">{children}</em>,
                hr: () => <hr className="my-4 border-[#2e2e32]" />,
                ul: ({ children }) => <ul className="list-disc list-outside pl-5 my-2 space-y-1 text-neutral-300 text-xs sm:text-sm">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-outside pl-5 my-2 space-y-1 text-neutral-300 text-xs sm:text-sm">{children}</ol>,
                li: ({ children }) => <li className="text-neutral-300 leading-relaxed text-xs sm:text-sm my-0.5">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="my-3.5 border-l-4 border-purple-500 bg-[#1a1a1e] py-2.5 px-4 rounded-r-xl text-neutral-300 italic text-xs sm:text-sm shadow-inner">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3.5 rounded-xl border border-[#2e2e32] bg-[#121215] p-0.5 shadow-md">
                    <table className="w-full text-left text-xs border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-[#1c1c20] text-white border-b border-[#2e2e32]">{children}</thead>,
                tbody: ({ children }) => <tbody className="divide-y divide-[#27272a] text-neutral-200">{children}</tbody>,
                tr: ({ children }) => <tr className="hover:bg-[#1a1a1e] odd:bg-[#151518] transition-colors">{children}</tr>,
                th: ({ children }) => <th className="p-2.5 font-bold text-white border-b border-[#3f3f46] whitespace-nowrap">{children}</th>,
                td: ({ children }) => <td className="p-2.5 border-t border-[#27272a] text-neutral-300 align-top">{children}</td>,
                pre: ({ children }) => <>{children}</>,
                code: ({ inline, className, children, ...props }: any) => {
                  const isBlock = !inline && (className || String(children).includes('\n'));
                  if (isBlock) {
                    return <CodeBlock className={className}>{children}</CodeBlock>;
                  }
                  return (
                    <code className="rounded-md bg-[#242428] px-1.5 py-0.5 text-[11px] font-mono text-purple-200 border border-[#2e2e32] mx-0.5 font-medium" {...props}>
                      {children}
                    </code>
                  );
                },
                img: ({ src, alt }) => (
                  <img src={src} alt={alt || ''} className="max-w-full h-auto rounded-xl border border-[#27272a] my-2.5 shadow-lg" referrerPolicy="no-referrer" />
                ),
                details: ({ children }) => (
                  <details className="my-2.5 rounded-xl border border-[#2e2e32] bg-[#18181b] p-3 text-xs text-neutral-200 transition-all">{children}</details>
                ),
                summary: ({ children }) => (
                  <summary className="cursor-pointer font-bold text-white hover:text-purple-300 transition-colors select-none font-sans">{children}</summary>
                ),
                mark: ({ children }) => (
                  <mark className="bg-amber-400/25 text-amber-200 px-1 py-0.5 rounded border border-amber-400/30">{children}</mark>
                ),
                del: ({ children }) => <del className="line-through text-neutral-400">{children}</del>,
                input: (props: any) =>
                  props.type === 'checkbox' ? (
                    <input type="checkbox" checked={props.checked} readOnly className="mr-2 h-3.5 w-3.5 rounded bg-[#27272a] border-[#3f3f46] text-purple-500 accent-purple-500 align-middle" />
                  ) : (
                    <input {...props} />
                  ),
              }}
            >
              {processedMarkdown}
            </ReactMarkdown>
          ) : (
            <div className="py-8 text-center text-neutral-500 text-xs">
              <Sparkles className="h-6 w-6 mx-auto mb-2 text-neutral-400 animate-pulse" />
              <span>正在对搜索结果进行智能语义整理与多维度归纳...</span>
            </div>
          )}
        </div>

        {/* Citation Popover */}
        {activeCitation && (
          <div className="rounded-2xl border border-[#27272a] bg-[#232326] p-3.5 text-xs text-neutral-200 space-y-1.5 relative shadow-xl">
            <button
              onClick={() => setActiveCitation(null)}
              className="absolute top-2.5 right-2.5 text-neutral-400 hover:text-white text-xs"
            >
              ✕
            </button>
            <div className="font-bold text-white flex items-center space-x-1">
              <span>引用来源：{activeCitation.title}</span>
            </div>
            <p className="text-neutral-300 text-[11px] line-clamp-2">{activeCitation.snippet}</p>
            <a
              href={activeCitation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-white hover:underline text-[11px] pt-1 font-medium"
            >
              <span>访问原网页</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Interactive Follow-up Questions */}
        {followUpQuestions.length > 0 && (
          <div className="pt-3 border-t border-[#27272a] space-y-2">
            <span className="text-[11px] text-neutral-400 font-medium">智能关联追问探索：</span>
            <div className="space-y-1.5">
              {followUpQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onFollowUpClick(q)}
                  className="w-full text-left px-3.5 py-2 rounded-full bg-[#27272a] hover:bg-[#3f3f46] text-xs text-neutral-200 hover:text-white border border-[#3f3f46] transition-all flex items-center justify-between group"
                >
                  <span className="line-clamp-1">{q}</span>
                  <ArrowRight className="h-3 w-3 text-neutral-400 group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
