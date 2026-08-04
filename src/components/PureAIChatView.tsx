import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { 
  Sparkles, 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  Globe, 
  Volume2, 
  VolumeX, 
  Download, 
  User, 
  Bot, 
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  MessageSquare,
  Search,
  SlidersHorizontal
} from 'lucide-react';
import type { SearchResult, AppConfig } from '../types';
import { streamAISummary, triggerAISearXNGToolSearch } from '../lib/api';

// Code Block with Copy & Syntax Header in Black & White Theme
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
    <div className="relative group my-3 rounded-xl border border-[#27272a] bg-[#121215] overflow-hidden shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#18181b] border-b border-[#27272a] text-[11px] font-mono text-neutral-400 select-none">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-neutral-600 inline-block" />
          <span className="h-2 w-2 rounded-full bg-neutral-600 inline-block" />
          <span className="h-2 w-2 rounded-full bg-neutral-600 inline-block" />
          <span className="ml-1.5 font-bold text-white tracking-wide">{lang ? lang.toUpperCase() : 'CODE'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#27272a] hover:bg-[#3f3f46] text-neutral-300 hover:text-white transition-all text-[11px]"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? '已复制' : '复制代码'}</span>
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto text-xs font-mono text-neutral-200 leading-relaxed whitespace-pre flex">
        {lines.length > 1 && (
          <div className="pr-3 mr-3 border-r border-[#27272a] text-neutral-600 text-right select-none font-mono text-[11px]">
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
  isStreaming?: boolean;
  sources?: SearchResult[];
  thinking?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface PureAIChatViewProps {
  initialQuery?: string;
  config: AppConfig;
  onUpdateConfig: (newConfig: Partial<AppConfig>) => void;
  onSearchGlobal?: (q: string) => void;
}

const LOCAL_STORAGE_KEY = 'nexus_ai_chat_sessions_v2';

const createNewSessionObj = (initialTitle = '新对话'): ChatSession => ({
  id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  title: initialTitle,
  messages: [],
  createdAt: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
  updatedAt: new Date().toISOString(),
});

export const PureAIChatView: React.FC<PureAIChatViewProps> = ({
  initialQuery = '',
  config,
  onUpdateConfig,
}) => {
  // Session list management
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load chat sessions:', e);
    }
    return [createNewSessionObj()];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || `session_${Date.now()}`;
  });

  const [inputPrompt, setInputPrompt] = useState(initialQuery);
  const [isSending, setIsSending] = useState(false);
  const [enableWebGrounding, setEnableWebGrounding] = useState(true);
  const [selectedModel, setSelectedModel] = useState(config.summaryModel || config.openrouterModel || 'google/gemini-2.5-flash');
  const [selectedDepth, setSelectedDepth] = useState<AppConfig['summaryDepth']>(config.summaryDepth || 'standard');
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessionSearchKeyword, setSessionSearchKeyword] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialSentRef = useRef<string>('');

  // Current active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || createNewSessionObj();
  const messages = activeSession ? activeSession.messages : [];

  // Persist sessions to local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save sessions:', e);
    }
  }, [sessions]);

  // Auto scroll to bottom on message update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle initial query auto-send
  useEffect(() => {
    if (initialQuery && initialSentRef.current !== initialQuery && messages.length === 0) {
      initialSentRef.current = initialQuery;
      handleSendMessage(initialQuery);
    }
  }, [initialQuery]);

  // Create a new session
  const handleNewSession = () => {
    const newSess = createNewSessionObj();
    setSessions((prev) => [newSess, ...prev]);
    setActiveSessionId(newSess.id);
    setInputPrompt('');
  };

  // Delete a session
  const handleDeleteSession = (sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const filtered = sessions.filter((s) => s.id !== sessionId);
    if (filtered.length === 0) {
      const fresh = createNewSessionObj();
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
    } else {
      setSessions(filtered);
      if (activeSessionId === sessionId) {
        setActiveSessionId(filtered[0].id);
      }
    }
  };

  // Send message in current active session
  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isSending) return;

    const userMsgId = `msg_user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const assistantMsgId = `msg_ai_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      model: selectedModel,
      isStreaming: true,
      sources: [],
    };

    // Update session title if first message
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const newTitle = s.messages.length === 0 ? prompt.slice(0, 24) : s.title;
          return {
            ...s,
            title: newTitle,
            updatedAt: new Date().toISOString(),
            messages: [...s.messages, userMessage, assistantMessage],
          };
        }
        return s;
      })
    );

    setInputPrompt('');
    setIsSending(true);

    let searchResults: SearchResult[] = [];

    // Web Grounding search
    if (enableWebGrounding) {
      try {
        const searchResp = await triggerAISearXNGToolSearch(prompt, 'general');
        if (searchResp && searchResp.results) {
          searchResults = searchResp.results.slice(0, 8);
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id === activeSessionId) {
                return {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === assistantMsgId ? { ...m, sources: searchResults } : m
                  ),
                };
              }
              return s;
            })
          );
        }
      } catch (err) {
        console.warn('Web grounding search failed, falling back to direct AI chat:', err);
      }
    }

    // Stream AI summary
    streamAISummary(
      {
        query: prompt,
        results: searchResults,
        model: selectedModel,
        summaryDepth: selectedDepth,
      },
      (delta) => {
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                messages: s.messages.map((m) => {
                  if (m.id === assistantMsgId) {
                    return { ...m, content: m.content + delta };
                  }
                  return m;
                }),
              };
            }
            return s;
          })
        );
      },
      () => {
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, isStreaming: false } : m
                ),
              };
            }
            return s;
          })
        );
        setIsSending(false);
      },
      (err) => {
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: `⚠️ 请求发生异常: ${err.message}`, isStreaming: false }
                    : m
                ),
              };
            }
            return s;
          })
        );
        setIsSending(false);
      }
    );
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeakMessage = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeakingId === id) {
      window.speechSynthesis.cancel();
      setIsSpeakingId(null);
    } else {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[#*\[\]`]/g, '');
      const u = new SpeechSynthesisUtterance(clean.substring(0, 800));
      u.lang = 'zh-CN';
      u.onend = () => setIsSpeakingId(null);
      u.onerror = () => setIsSpeakingId(null);
      window.speechSynthesis.speak(u);
      setIsSpeakingId(id);
    }
  };

  const handleDownloadChat = () => {
    const chatLog = messages
      .map((m) => `### ${m.role === 'user' ? '👤 我' : '🤖 AI 助手'} (${m.timestamp})\n\n${m.content}\n\n---`)
      .join('\n\n');
    const blob = new Blob([`# Nexus AI Chat Log (${activeSession.title})\n\n${chatLog}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_ai_chat_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(sessionSearchKeyword.toLowerCase())
  );

  return (
    <div className="w-full h-[calc(100vh-54px)] flex flex-row bg-[#09090b] text-white overflow-hidden select-none">
      
      {/* 1. Collapsible Sidebar Drawer (Sessions List) */}
      <aside
        className={`h-full bg-[#0d0d10] border-r border-[#27272a] flex flex-col transition-all duration-300 relative shrink-0 z-20 ${
          isSidebarOpen ? 'w-64 sm:w-72' : 'w-14'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b border-[#27272a] flex items-center justify-between shrink-0">
          {isSidebarOpen ? (
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-white" />
              <span className="text-xs font-bold tracking-wider text-white">对话历史</span>
            </div>
          ) : (
            <div className="mx-auto">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          )}

          {/* Toggle Sidebar Collapse */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-[#27272a] transition-colors"
            title={isSidebarOpen ? '收起对话列表' : '展开对话列表'}
          >
            {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
        </div>

        {/* Action: New Chat Button */}
        <div className="p-3 shrink-0">
          {isSidebarOpen ? (
            <button
              type="button"
              onClick={handleNewSession}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <Plus className="h-4 w-4 text-black" />
              <span>新建 AI 对话</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNewSession}
              className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl bg-white hover:bg-neutral-200 text-black font-bold shadow-md transition-all active:scale-95"
              title="新建 AI 对话"
            >
              <Plus className="h-4 w-4 text-black" />
            </button>
          )}
        </div>

        {/* Search Input for sessions (only when expanded) */}
        {isSidebarOpen && sessions.length > 3 && (
          <div className="px-3 pb-2 shrink-0">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-neutral-500" />
              <input
                type="text"
                value={sessionSearchKeyword}
                onChange={(e) => setSessionSearchKeyword(e.target.value)}
                placeholder="搜索历史对话..."
                className="w-full bg-[#161619] text-neutral-200 text-[11px] rounded-lg pl-8 pr-2 py-1.5 border border-[#27272a] focus:outline-none focus:border-neutral-400"
              />
            </div>
          </div>
        )}

        {/* Session List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin scrollbar-thumb-[#27272a]">
          {filteredSessions.map((sess) => {
            const isActive = sess.id === activeSessionId;
            return isSidebarOpen ? (
              <div
                key={sess.id}
                onClick={() => setActiveSessionId(sess.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-md'
                    : 'text-neutral-300 hover:text-white hover:bg-[#1a1a1e]'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1 pr-2">
                  <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-black' : 'text-neutral-500'}`} />
                  <span className="truncate">{sess.title}</span>
                </div>
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSession(sess.id, e)}
                    className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                      isActive ? 'text-neutral-600 hover:text-red-600' : 'text-neutral-500 hover:text-red-400'
                    }`}
                    title="删除此对话"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                key={sess.id}
                type="button"
                onClick={() => setActiveSessionId(sess.id)}
                className={`w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all ${
                  isActive
                    ? 'bg-white text-black font-bold shadow'
                    : 'text-neutral-400 hover:text-white hover:bg-[#1a1a1e]'
                }`}
                title={sess.title}
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="p-3 border-t border-[#27272a] text-[11px] text-neutral-500 shrink-0">
          {isSidebarOpen ? (
            <div className="flex items-center justify-between">
              <span>共 {sessions.length} 个对话记录</span>
              <button
                type="button"
                onClick={() => {
                  const fresh = createNewSessionObj();
                  setSessions([fresh]);
                  setActiveSessionId(fresh.id);
                }}
                className="text-neutral-400 hover:text-red-400 transition-colors"
              >
                清空全部
              </button>
            </div>
          ) : (
            <div className="text-center font-mono text-[10px]">{sessions.length}</div>
          )}
        </div>
      </aside>

      {/* 2. Main Chat Workspace (Full Page) */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#09090b]">

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#09090b]">
          {messages.length === 0 ? (
            /* Minimalist Empty State (No Preset Prompt Cards) */
            <div className="h-full flex flex-col justify-center items-center max-w-xl mx-auto py-16 text-center space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-black shadow-xl">
                <Sparkles className="h-7 w-7 text-black" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-extrabold text-white">Pure AI 智能对话</h3>
                <p className="text-xs text-neutral-400 max-w-md leading-relaxed">
                  输入任何思考、指令、代码分析或问题，开启全新对话。
                </p>
              </div>
            </div>
          ) : (
            /* Active Message List */
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start space-x-3.5 max-w-4xl mx-auto ${
                  msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs font-bold shadow-md ${
                    msg.role === 'user'
                      ? 'bg-white text-black border-white'
                      : 'bg-[#1c1c20] text-white border-[#3f3f46]'
                  }`}
                >
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Message Content Box */}
                <div
                  className={`flex-1 rounded-2xl p-4 space-y-2 border text-xs sm:text-sm shadow-xl transition-all ${
                    msg.role === 'user'
                      ? 'bg-white text-black border-white'
                      : 'bg-[#141417] text-neutral-200 border-[#27272a]'
                  }`}
                >
                  {/* Meta Header */}
                  <div
                    className={`flex items-center justify-between text-[11px] pb-1.5 border-b ${
                      msg.role === 'user' ? 'text-neutral-600 border-neutral-200' : 'text-neutral-400 border-[#27272a]'
                    }`}
                  >
                    <span className="font-bold">
                      {msg.role === 'user' ? '我' : `AI 助手 (${msg.model || 'Gemini 2.5'})`}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span>{msg.timestamp}</span>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="p-1 text-neutral-400 hover:text-white transition-colors"
                            title="复制内容"
                          >
                            {copiedId === msg.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSpeakMessage(msg.id, msg.content)}
                            className="p-1 text-neutral-400 hover:text-white transition-colors"
                            title="语音朗读"
                          >
                            {isSpeakingId === msg.id ? <VolumeX className="h-3 w-3 text-amber-300" /> : <Volume2 className="h-3 w-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sources list if grounded */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="py-1.5 px-3 rounded-xl bg-[#1c1c20] border border-[#27272a] text-[11px]">
                      <div className="text-neutral-400 font-medium mb-1">🔍 联网引证来源 ({msg.sources.length}):</div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.slice(0, 4).map((src, i) => (
                          <a
                            key={i}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-neutral-300 hover:text-white transition-colors truncate max-w-[180px] flex items-center space-x-1"
                          >
                            <span className="font-bold text-white">[{i + 1}]</span>
                            <span className="truncate">{src.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Markdown Text Body */}
                  <div
                    className={`prose max-w-none leading-relaxed text-xs sm:text-sm ${
                      msg.role === 'user' ? 'text-black prose-neutral' : 'prose-invert text-neutral-200'
                    }`}
                  >
                    {msg.content ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                        components={{
                          p: ({ children }) => (
                            <p className={`my-1.5 leading-relaxed ${msg.role === 'user' ? 'text-black' : 'text-neutral-200'}`}>
                              {children}
                            </p>
                          ),
                          h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1.5 border-b pb-1">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm font-bold mt-2.5 mb-1">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-xs font-bold mt-2 mb-1">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc pl-4 my-1.5 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 my-1.5 space-y-1">{children}</ol>,
                          code: ({ inline, className, children, ...props }: any) => {
                            const isBlock = !inline && (className || String(children).includes('\n'));
                            if (isBlock) {
                              return <CodeBlock className={className}>{children}</CodeBlock>;
                            }
                            return (
                              <code
                                className={`rounded px-1 py-0.5 text-[11px] font-mono border ${
                                  msg.role === 'user'
                                    ? 'bg-neutral-100 text-black border-neutral-300'
                                    : 'bg-[#27272a] text-white border-[#3f3f46]'
                                }`}
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <div className="py-3 flex items-center space-x-2 text-neutral-400 text-xs">
                        <Sparkles className="h-4 w-4 text-white animate-spin" />
                        <span>正在思考并流式回答...</span>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer Input Bar */}
        <footer className="p-3 bg-[#121215] border-t border-[#27272a] shrink-0">
          {/* Form Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative flex items-center rounded-2xl border border-[#27272a] bg-[#09090b] p-1.5 shadow-xl focus-within:border-white transition-all"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="输入任何提示词或指令... (Shift + Enter 换行，Enter 发送)"
              className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none resize-none max-h-32 min-h-[36px]"
            />

            <div className="flex items-center space-x-1 shrink-0 pr-1">
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isSending}
                className={`p-2 rounded-xl transition-all font-bold ${
                  inputPrompt.trim() && !isSending
                    ? 'bg-white text-black hover:bg-neutral-200 shadow-md active:scale-95'
                    : 'bg-[#18181b] text-neutral-600 cursor-not-allowed'
                }`}
                title="发送"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </footer>

      </div>

    </div>
  );
};
