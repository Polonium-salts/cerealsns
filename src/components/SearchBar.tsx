import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Mic, Sparkles, Plus, Camera, SlidersHorizontal, Clock, ArrowRight, Check, Server, Globe } from 'lucide-react';
import type { AppConfig } from '../types';

interface SearchBarProps {
  initialQuery?: string;
  activeCategory: string;
  activeTimeRange: string;
  selectedEngines?: string[];
  onSelectEngines?: (engines: string[]) => void;
  onSearch: (query: string, category: string, timeRange: string, aiModeEnabled: boolean, targetEngines?: string) => void;
  isLoading: boolean;
  isCompactMode?: boolean;
  config?: AppConfig;
  onUpdateConfig?: (newConfig: Partial<AppConfig>) => void;
  searxngLatencies?: Record<string, number | null>;
  isPingingSearxng?: boolean;
  onPingTest?: (urlsToPing?: string[]) => Promise<void>;
}

const TIME_RANGES = [
  { id: '', name: '不限时间' },
  { id: 'day', name: '24小时内' },
  { id: 'week', name: '本周' },
  { id: 'month', name: '本月' },
  { id: 'year', name: '今年' },
];

export const ENGINE_OPTIONS_BY_CATEGORY: Record<string, Array<{ id: string; name: string; desc: string }>> = {
  general: [
    { id: 'google', name: 'Google 谷歌', desc: '全球通用搜索引擎' },
    { id: 'bing', name: 'Bing 微软', desc: '微软搜素引擎' },
    { id: 'baidu', name: 'Baidu 百度', desc: '中文搜索引擎' },
    { id: 'duckduckgo', name: 'DuckDuckGo', desc: '无追踪隐私搜索' },
    { id: 'yandex', name: 'Yandex', desc: '欧洲与跨国索引' },
    { id: 'wikipedia', name: 'Wikipedia', desc: '维基百科权威词条' },
    { id: 'qwant', name: 'Qwant', desc: '欧洲安全搜索引擎' },
  ],
  videos: [
    { id: 'youtube', name: 'YouTube', desc: '全球视频库' },
    { id: 'bilibili', name: '哔哩哔哩 Bilibili', desc: '中文弹幕视频网' },
    { id: 'duckduckgo', name: 'DuckDuckGo Video', desc: 'DuckDuckGo 视频聚合' },
    { id: 'vimeo', name: 'Vimeo', desc: '高清创作者视频' },
    { id: 'dailymotion', name: 'Dailymotion', desc: '国际流行视频平台' },
  ],
  images: [
    { id: 'baidu', name: '百度图片', desc: '中文海量图库' },
    { id: 'duckduckgo', name: 'DuckDuckGo Image', desc: '高清大图检索' },
    { id: 'wikipedia', name: '维基媒体库', desc: '开源与公共图片' },
    { id: 'unsplash', name: 'Unsplash', desc: '无版权高精摄影图' },
    { id: 'openverse', name: 'Openverse', desc: '开源作品库' },
  ],
};

export const SearchBar: React.FC<SearchBarProps> = ({
  initialQuery = '',
  activeCategory,
  activeTimeRange,
  selectedEngines,
  onSelectEngines,
  onSearch,
  isLoading,
  isCompactMode = false,
  config,
  onUpdateConfig,
  searxngLatencies = {},
  isPingingSearxng = false,
  onPingTest,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [timeRange, setTimeRange] = useState(activeTimeRange);
  const [aiMode, setAiMode] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showImageLensModal, setShowImageLensModal] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const currentCategoryEngines = ENGINE_OPTIONS_BY_CATEGORY[activeCategory] || ENGINE_OPTIONS_BY_CATEGORY.general;
  const defaultEngineIds = currentCategoryEngines.map(e => e.id);
  
  const activeEngines = selectedEngines && selectedEngines.length > 0 ? selectedEngines : defaultEngineIds;

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const toggleEngine = (engineId: string) => {
    let updated: string[];
    if (activeEngines.includes(engineId)) {
      if (activeEngines.length <= 1) return; // keep at least 1 engine
      updated = activeEngines.filter(id => id !== engineId);
    } else {
      updated = [...activeEngines, engineId];
    }
    if (onSelectEngines) {
      onSelectEngines(updated);
    }
    if (query.trim()) {
      onSearch(query.trim(), activeCategory, timeRange, aiMode, updated.join(','));
    }
  };

  const selectPreset = (type: 'all' | 'cn' | 'overseas') => {
    let presetIds: string[] = [];
    if (type === 'all') {
      presetIds = defaultEngineIds;
    } else if (type === 'cn') {
      presetIds = defaultEngineIds.filter(id => ['baidu', 'bilibili'].includes(id));
      if (presetIds.length === 0) presetIds = defaultEngineIds;
    } else if (type === 'overseas') {
      presetIds = defaultEngineIds.filter(id => ['google', 'bing', 'duckduckgo', 'yandex', 'youtube', 'vimeo', 'unsplash'].includes(id));
      if (presetIds.length === 0) presetIds = defaultEngineIds;
    }
    if (onSelectEngines) {
      onSelectEngines(presetIds);
    }
    if (query.trim()) {
      onSearch(query.trim(), activeCategory, timeRange, aiMode, presetIds.join(','));
    }
  };

  // Skill 7.3 Autocomplete fetching with 150ms debounce
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/autocomplete?q=${encodeURIComponent(trimmed)}`);
        if (resp.ok) {
          const list = await resp.json();
          if (Array.isArray(list) && list.length > 0) {
            setSuggestions(list);
            // Only pop up suggestions if the input is currently the active/focused element
            if (document.activeElement === inputRef.current) {
              setShowSuggestions(true);
            }
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        }
      } catch (err) {
        setSuggestions([]);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle click outside to dismiss suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (query.trim()) {
      onSearch(query.trim(), activeCategory, timeRange, aiMode, activeEngines.join(','));
    }
  };

  const handleClear = () => {
    setQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('您的浏览器暂不支持 Web Speech API 语音输入');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
      if (transcript.trim()) {
        onSearch(transcript.trim(), activeCategory, timeRange, aiMode, activeEngines.join(','));
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  return (
    <div ref={containerRef} className={`w-full mx-auto ${isCompactMode ? 'max-w-3xl' : 'max-w-2xl my-4'} transition-all relative`}>
      <form onSubmit={handleSubmit} className="relative space-y-2">
        {/* High-Contrast Pill Search Bar */}
        <div className="relative flex items-center rounded-full border border-slate-300 dark:border-[#2e2e32] bg-white dark:bg-[#1c1c1f] text-slate-900 dark:text-white px-3 sm:px-4 py-2 sm:py-2.5 shadow-md hover:border-slate-400 dark:hover:border-[#3f3f46] focus-within:border-slate-500 dark:focus-within:border-white focus-within:ring-2 focus-within:ring-slate-300/50 dark:focus-within:ring-white/20 transition-all duration-200">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder="询问 CerealsNS AI 或输入搜索内容..."
            className="w-full bg-transparent px-2 py-1 text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none min-w-0"
          />

          {/* Clear Button */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 sm:p-1.5 text-slate-400 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-white transition-colors mr-0.5 shrink-0 active:scale-95"
              title="清空搜索词"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Voice Mic Icon */}
          <button
            type="button"
            onClick={handleVoiceSearch}
            className={`p-2 sm:p-1.5 rounded-full text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#27272a] transition-colors shrink-0 active:scale-95 ${
              isListening ? 'text-white bg-purple-600 font-bold ring-2 ring-purple-500 animate-pulse' : ''
            }`}
            title="语音输入"
          >
            <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Camera / Lens Icon */}
          <button
            type="button"
            onClick={() => setShowImageLensModal(true)}
            className="p-2 sm:p-1.5 rounded-full text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#27272a] transition-colors shrink-0 active:scale-95"
            title="CerealsNS 智慧镜头 (以图搜图与多模态)"
          >
            <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Filter Trigger Icon */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 sm:p-1.5 rounded-full text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#27272a] transition-colors shrink-0 active:scale-95 ${
              showFilters ? 'bg-slate-200 dark:bg-[#27272a] text-slate-900 dark:text-white' : ''
            }`}
            title="筛选与时间区间"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          {/* AI Mode Toggle Pill */}
          <button
            type="button"
            onClick={() => setAiMode(!aiMode)}
            className={`ml-1 flex items-center space-x-1 rounded-full px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold transition-all duration-200 shrink-0 active:scale-95 ${
              aiMode
                ? 'bg-slate-900 text-white font-bold shadow-md dark:bg-white dark:text-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#2b2b2e] dark:text-neutral-400 dark:hover:bg-[#3f3f46]'
            }`}
            title={aiMode ? 'AI 模式已开启（结合 LLM 流式总结）' : '快搜模式（仅网页索引）'}
          >
            <Sparkles className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${aiMode ? 'text-white dark:text-black' : 'text-slate-400 dark:text-neutral-500'}`} />
            <span className="whitespace-nowrap">AI 模式</span>
          </button>

          {/* Search Submit Arrow Button for Mobile */}
          <button
            type="submit"
            className="ml-1 sm:hidden p-2 rounded-full bg-slate-900 text-white dark:bg-white dark:text-black font-bold active:scale-95 shrink-0"
            title="搜索"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Skill 7.3 Autocomplete Suggestions Dropdown Popup */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 overflow-hidden rounded-2xl border border-slate-200 dark:border-[#27272a] bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md shadow-2xl divide-y divide-slate-100 dark:divide-[#27272a]">
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(item);
                  setShowSuggestions(false);
                  onSearch(item, activeCategory, timeRange, aiMode, activeEngines.join(','));
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-slate-800 dark:text-neutral-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#27272a] transition-colors text-left group"
              >
                <div className="flex items-center space-x-2.5">
                  <Search className="h-3.5 w-3.5 text-slate-400 dark:text-neutral-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                  <span>{item}</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 dark:text-neutral-600 group-hover:text-slate-900 dark:group-hover:text-white opacity-0 group-hover:opacity-100 transition-all" />
              </button>
            ))}
          </div>
        )}

        {/* Time Filters & Specified Search Engines Drawer */}
        {showFilters && (
          <div className="rounded-2xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] p-3 sm:p-4 shadow-2xl text-xs text-slate-900 dark:text-white space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            {/* Row 1: Time Range */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-[#27272a] pb-2.5">
              <span className="text-slate-700 dark:text-neutral-300 font-medium flex items-center space-x-1.5 shrink-0">
                <Clock className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>搜索时间范围：</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TIME_RANGES.map((tr) => (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() => {
                      setTimeRange(tr.id);
                      if (query.trim()) {
                        onSearch(query.trim(), activeCategory, tr.id, aiMode, activeEngines.join(','));
                      }
                    }}
                    className={`rounded-full px-3 py-1 text-xs transition-all ${
                      timeRange === tr.id
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#27272a] dark:text-neutral-300 dark:hover:bg-[#3f3f46]'
                    }`}
                  >
                    {tr.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Designated Search Sources / Engines */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-slate-900 dark:text-neutral-200 font-bold flex items-center space-x-1.5">
                  <Server className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>选定指定检索元源（{activeEngines.length}/{currentCategoryEngines.length}）：</span>
                </span>

                {/* Quick Presets */}
                <div className="flex items-center space-x-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => selectPreset('all')}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#27272a] text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#3f3f46] transition-colors"
                  >
                    🚀 全选
                  </button>
                  <button
                    type="button"
                    onClick={() => selectPreset('cn')}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#27272a] text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#3f3f46] transition-colors"
                  >
                    🇨🇳 国内源
                  </button>
                  <button
                    type="button"
                    onClick={() => selectPreset('overseas')}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#27272a] text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#3f3f46] transition-colors"
                  >
                    🌐 全球源
                  </button>
                </div>
              </div>

              {/* Engine Toggle Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {currentCategoryEngines.map((eng) => {
                  const isChecked = activeEngines.includes(eng.id);
                  return (
                    <button
                      key={eng.id}
                      type="button"
                      onClick={() => toggleEngine(eng.id)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-500/80 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:border-[#27272a] dark:bg-[#141417] dark:text-neutral-500 dark:hover:text-neutral-300 dark:hover:border-[#3f3f46]'
                      }`}
                      title={eng.desc}
                    >
                      <div className={`h-3.5 w-3.5 rounded flex items-center justify-center transition-colors ${
                        isChecked ? 'bg-emerald-500 text-white dark:text-black' : 'border border-slate-300 dark:border-neutral-600'
                      }`}>
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span>{eng.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Active SearXNG Instance Select */}
            <div className="space-y-2 border-t border-slate-200 dark:border-[#27272a] pt-3 flex flex-col">
              <div className="flex items-center justify-between text-slate-900 dark:text-neutral-200 font-bold">
                <div className="flex items-center space-x-1.5">
                  <Globe className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>指定 SearXNG API 检索节点：</span>
                </div>
                {onPingTest && (
                  <button
                    type="button"
                    onClick={() => {
                      const allInstances = Array.from(new Set([
                        ...(config?.customSearxngUrls || []),
                        ...(config?.envSearxngInstances || []),
                        'https://searxng.site',
                        'https://searx.be',
                        'https://paulgo.io',
                        'https://xka.cz',
                        'https://searx.work',
                        'https://opnxng.com'
                      ]));
                      onPingTest(allInstances);
                    }}
                    disabled={isPingingSearxng}
                    className="flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-md border border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-800/60 dark:bg-cyan-950/20 dark:text-cyan-400 dark:hover:bg-cyan-950/50 dark:hover:text-cyan-300 transition-all disabled:opacity-50"
                  >
                    <span>{isPingingSearxng ? '⌛ 测速中...' : '⏱️ 一键测速'}</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-neutral-400 leading-normal">
                可指定特定的服务节点进行定向查询，或使用 ⚡ 自动选择 (多节点智能并发 & 并发健康检测 fallback 负载均衡)
              </p>
              
              <div className="flex flex-wrap gap-1.5 pt-1">
                {/* Auto Option */}
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateConfig) {
                      onUpdateConfig({ activeSearxngUrl: 'auto' });
                    }
                  }}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs transition-all cursor-pointer ${
                    (!config?.activeSearxngUrl || config.activeSearxngUrl === 'auto')
                      ? 'border-cyan-500 bg-cyan-50 text-cyan-800 dark:border-cyan-500/80 dark:bg-cyan-950/40 dark:text-cyan-300 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 dark:border-[#27272a] dark:bg-[#141417] dark:text-neutral-500 dark:hover:text-neutral-300 dark:hover:border-[#3f3f46]'
                  }`}
                >
                  <span className="font-semibold">⚡ 自动负载均衡 (Auto)</span>
                </button>

                {/* Candidate Instances List */}
                {Array.from(new Set([
                  ...(config?.customSearxngUrls || []),
                  ...(config?.envSearxngInstances || []),
                  'https://searxng.site',
                  'https://searx.be',
                  'https://paulgo.io',
                  'https://xka.cz',
                  'https://searx.work',
                  'https://opnxng.com'
                ])).map((inst) => {
                  const isSelected = config?.activeSearxngUrl === inst;
                  const isCustom = config?.customSearxngUrls?.includes(inst);
                  const isEnv = config?.envSearxngInstances?.includes(inst);
                  
                  const latency = searxngLatencies[inst];
                  let latencyColor = 'text-slate-500 bg-slate-100 border-slate-200 dark:text-neutral-500 dark:bg-neutral-900/40 dark:border-neutral-800';
                  let latencyText = '';

                  if (latency !== undefined) {
                    if (latency === null) {
                      latencyColor = 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/30 dark:border-rose-900/50';
                      latencyText = '超时';
                    } else if (latency < 200) {
                      latencyColor = 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900/50';
                      latencyText = `${latency}ms`;
                    } else if (latency < 600) {
                      latencyColor = 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-900/50';
                      latencyText = `${latency}ms`;
                    } else {
                      latencyColor = 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/30 dark:border-rose-900/50';
                      latencyText = `${latency}ms`;
                    }
                  }

                  return (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => {
                        if (onUpdateConfig) {
                          onUpdateConfig({ activeSearxngUrl: inst });
                        }
                      }}
                      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-50 text-cyan-800 dark:border-cyan-500/80 dark:bg-cyan-950/40 dark:text-cyan-300 shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900 dark:border-[#27272a] dark:bg-[#141417] dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:border-[#3f3f46]'
                      }`}
                      title={inst}
                    >
                      <span className="truncate max-w-[150px]">{inst.replace(/^https?:\/\//, '')}</span>
                      {isCustom && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 px-1 rounded-sm scale-90 origin-left">
                          自定义
                        </span>
                      )}
                      {isEnv && (
                        <span className="text-[9px] bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800 px-1 rounded-sm scale-90 origin-left font-semibold">
                          环境变量
                        </span>
                      )}
                      {latencyText && (
                        <span className={`text-[9px] px-1 rounded-sm border font-semibold scale-95 ${latencyColor}`}>
                          {latencyText}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Google Lens Modal */}
      {showImageLensModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] p-6 shadow-2xl text-center space-y-4 text-slate-900 dark:text-white">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#27272a] text-slate-800 dark:text-white shadow-lg">
              <Camera className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">CerealsNS 智慧镜头 AI 识图</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                上传或拖拽图片，让 CerealsNS AI 分析图像内容、提取文字或识别相关主题
              </p>
            </div>

            <div className="border-2 border-dashed border-slate-300 dark:border-[#27272a] rounded-2xl p-6 hover:border-slate-400 dark:hover:border-[#3f3f46] transition-colors cursor-pointer bg-slate-50 dark:bg-[#141416]">
              <p className="text-xs font-medium text-slate-700 dark:text-neutral-300">点击上传或将图像拖放到此处</p>
              <p className="text-[10px] text-slate-400 dark:text-neutral-500 mt-1">支持 PNG, JPG, WEBP 大于 100KB</p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowImageLensModal(false)}
                className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#27272a] dark:text-neutral-300 dark:hover:bg-[#3f3f46] dark:hover:text-white px-5 py-2 text-xs transition-colors"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  setQuery('识别此架构图与技术草图');
                  setShowImageLensModal(false);
                  onSearch('识别此架构图与技术草图', activeCategory, timeRange, aiMode);
                }}
                className="rounded-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 px-5 py-2 text-xs font-bold transition-colors"
              >
                体验示例图片分析
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
