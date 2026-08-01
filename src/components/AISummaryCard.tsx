import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Copy, Check, Download, RefreshCw, Volume2, VolumeX, ArrowRight, Cpu, Pin, ExternalLink } from 'lucide-react';
import type { SearchResult, AppConfig } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

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
    { id: 'standard', label: '综合精准', icon: '📌', desc: '包含核心结论、重点归纳与溯源分析' },
    { id: 'brief', label: '极速提炼', icon: '⚡', desc: '200字速读核心结论与关键要点' },
    { id: 'academic', label: '学术溯源', icon: '🎓', desc: '强调背景理论、演进与事实交叉比对' },
    { id: 'tech', label: '技术全景', icon: '💻', desc: '技术架构、代码/API范式与对比表' },
    { id: 'market', label: '商业研报', icon: '📈', desc: '市场数据、玩家格局与商业对比表' },
    { id: 'deep', label: '深度探究', icon: '🔍', desc: '多层逻辑梳理与前因后果长文复盘' },
  ];

  // Preprocess text: Convert standalone [1], [^1^], [^1] into clickable citation links
  const processedMarkdown = summaryText.replace(/\[\^?(\d+)\^?\]/g, '[$1](#cite-$1)');

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
      <CardHeader className="pb-3 border-b border-[#27272a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#27272a] text-white border border-[#3f3f46]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-white flex items-center space-x-2">
                <span>AI 搜索概览结果</span>
                {isStreaming && (
                  <Badge variant="secondary" className="animate-pulse bg-[#27272a] text-neutral-200 border-[#3f3f46]">
                    <span className="h-1.5 w-1.5 rounded-full bg-white mr-1.5 animate-ping" />
                    思考生成中...
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
        {/* Markdown Render Area */}
        <div className="prose prose-invert prose-sm max-w-none text-neutral-200 leading-relaxed text-xs sm:text-sm">
          {summaryText ? (
            <ReactMarkdown
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
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-white underline hover:text-neutral-300">
                      {children}
                    </a>
                  );
                },
                h1: ({ children }) => <h1 className="text-base font-bold text-white my-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold text-neutral-100 my-1.5">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xs font-bold text-neutral-200 my-1">{children}</h3>,
                p: ({ children }) => <p className="my-1.5">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside my-1.5 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside my-1.5 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-neutral-300">{children}</li>,
                code: ({ children }) => (
                  <code className="rounded-lg bg-[#232326] px-1.5 py-0.5 text-[11px] font-mono text-neutral-200 border border-[#2e2e32]">
                    {children}
                  </code>
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

        {/* Source References Pill Grid */}
        {searchResults.length > 0 && (
          <div className="pt-3 border-t border-[#27272a]">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-2">
              <span>主要信息引用源 ({searchResults.slice(0, 5).length})：</span>
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
      </CardContent>
    </Card>
  );
};
