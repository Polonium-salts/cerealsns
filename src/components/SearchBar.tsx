import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Mic, Sparkles, Plus, Camera, SlidersHorizontal, Clock, ArrowRight, Check, Server } from 'lucide-react';

interface SearchBarProps {
  initialQuery?: string;
  activeCategory: string;
  activeTimeRange: string;
  selectedEngines?: string[];
  onSelectEngines?: (engines: string[]) => void;
  onSearch: (query: string, category: string, timeRange: string, aiModeEnabled: boolean, targetEngines?: string) => void;
  isLoading: boolean;
  isCompactMode?: boolean;
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
            setShowSuggestions(true);
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
        {/* High-Contrast Dark Native Pill Search Bar */}
        <div className="relative flex items-center rounded-full border border-[#2e2e32] bg-[#1c1c1f] text-white px-3 sm:px-4 py-2 sm:py-2.5 shadow-xl hover:border-[#3f3f46] focus-within:border-white focus-within:ring-1 focus-within:ring-white/20 transition-all duration-200">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder="询问 CerealsNS AI 或输入搜索内容..."
            className="w-full bg-transparent px-2 py-1 text-sm sm:text-base text-white placeholder-neutral-500 focus:outline-none min-w-0"
          />

          {/* Clear Button */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 sm:p-1.5 text-neutral-400 hover:text-white transition-colors mr-0.5 shrink-0 active:scale-95"
              title="清空搜索词"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Voice Mic Icon */}
          <button
            type="button"
            onClick={handleVoiceSearch}
            className={`p-2 sm:p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#27272a] transition-colors shrink-0 active:scale-95 ${
              isListening ? 'text-white bg-[#27272a] font-bold ring-2 ring-purple-500 animate-pulse' : ''
            }`}
            title="语音输入"
          >
            <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Camera / Lens Icon */}
          <button
            type="button"
            onClick={() => setShowImageLensModal(true)}
            className="p-2 sm:p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#27272a] transition-colors shrink-0 active:scale-95"
            title="CerealsNS 智慧镜头 (以图搜图与多模态)"
          >
            <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Filter Trigger Icon */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 sm:p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#27272a] transition-colors shrink-0 active:scale-95 ${
              showFilters ? 'bg-[#27272a] text-white' : ''
            }`}
            title="筛选与时间区间"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          {/* AI Mode Toggle Pill - High-Contrast Solid White or Dark Pill */}
          <button
            type="button"
            onClick={() => setAiMode(!aiMode)}
            className={`ml-1 flex items-center space-x-1 rounded-full px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold transition-all duration-200 shrink-0 active:scale-95 ${
              aiMode
                ? 'bg-white text-black font-bold shadow-md'
                : 'bg-[#2b2b2e] text-neutral-400 hover:bg-[#3f3f46]'
            }`}
            title={aiMode ? 'AI 模式已开启（结合 LLM 流式总结）' : '快搜模式（仅网页索引）'}
          >
            <Sparkles className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${aiMode ? 'text-black' : 'text-neutral-500'}`} />
            <span className="whitespace-nowrap">AI 模式</span>
          </button>

          {/* Search Submit Arrow Button for Mobile */}
          <button
            type="submit"
            className="ml-1 sm:hidden p-2 rounded-full bg-white text-black font-bold active:scale-95 shrink-0"
            title="搜索"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Skill 7.3 Autocomplete Suggestions Dropdown Popup */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 overflow-hidden rounded-2xl border border-[#27272a] bg-[#18181b]/95 backdrop-blur-md shadow-2xl divide-y divide-[#27272a]">
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(item);
                  setShowSuggestions(false);
                  onSearch(item, activeCategory, timeRange, aiMode, activeEngines.join(','));
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-neutral-200 hover:text-white hover:bg-[#27272a] transition-colors text-left group"
              >
                <div className="flex items-center space-x-2.5">
                  <Search className="h-3.5 w-3.5 text-neutral-500 group-hover:text-white transition-colors" />
                  <span>{item}</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-neutral-600 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all" />
              </button>
            ))}
          </div>
        )}

        {/* Sub-label for SearXNG API engine */}
        {!isCompactMode && (
          <div className="flex items-center justify-center space-x-2 pt-1.5 text-[11px] text-neutral-400">
            <span className="inline-flex items-center space-x-1 rounded-full bg-[#18181b] px-3 py-1 text-neutral-300 border border-[#27272a] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>SearXNG 隐私元搜索 API 驱动</span>
            </span>
            <span>·</span>
            <span>无跟踪 · 零日志 · 多源实时聚合</span>
          </div>
        )}

        {/* Time Filters & Specified Search Engines Drawer */}
        {showFilters && (
          <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-3 sm:p-4 shadow-2xl text-xs text-white space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            {/* Row 1: Time Range */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#27272a] pb-2.5">
              <span className="text-neutral-300 font-medium flex items-center space-x-1.5 shrink-0">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
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
                        ? 'bg-white text-black font-bold shadow-xs'
                        : 'bg-[#27272a] text-neutral-300 hover:bg-[#3f3f46]'
                    }`}
                  >
                    {tr.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Designated Search Sources / Engines (检索元选定) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-neutral-200 font-bold flex items-center space-x-1.5">
                  <Server className="h-3.5 w-3.5 text-emerald-400" />
                  <span>选定指定检索元源（{activeEngines.length}/{currentCategoryEngines.length}）：</span>
                </span>

                {/* Quick Presets */}
                <div className="flex items-center space-x-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => selectPreset('all')}
                    className="px-2 py-0.5 rounded-md bg-[#27272a] text-neutral-300 hover:text-white hover:bg-[#3f3f46] transition-colors"
                  >
                    🚀 全选
                  </button>
                  <button
                    type="button"
                    onClick={() => selectPreset('cn')}
                    className="px-2 py-0.5 rounded-md bg-[#27272a] text-neutral-300 hover:text-white hover:bg-[#3f3f46] transition-colors"
                  >
                    🇨🇳 国内源
                  </button>
                  <button
                    type="button"
                    onClick={() => selectPreset('overseas')}
                    className="px-2 py-0.5 rounded-md bg-[#27272a] text-neutral-300 hover:text-white hover:bg-[#3f3f46] transition-colors"
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
                          ? 'border-emerald-500/80 bg-emerald-950/40 text-emerald-300 shadow-sm'
                          : 'border-[#27272a] bg-[#141417] text-neutral-500 hover:text-neutral-300 hover:border-[#3f3f46]'
                      }`}
                      title={eng.desc}
                    >
                      <div className={`h-3.5 w-3.5 rounded flex items-center justify-center transition-colors ${
                        isChecked ? 'bg-emerald-500 text-black' : 'border border-neutral-600'
                      }`}>
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span>{eng.name}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-[#27272a] bg-[#18181b] p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#27272a] text-white shadow-lg">
              <Camera className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">CerealsNS 智慧镜头 AI 识图</h3>
              <p className="text-xs text-neutral-400 mt-1">
                上传或拖拽图片，让 CerealsNS AI 分析图像内容、提取文字或识别相关主题
              </p>
            </div>

            <div className="border-2 border-dashed border-[#27272a] rounded-2xl p-6 hover:border-[#3f3f46] transition-colors cursor-pointer bg-[#141416]">
              <p className="text-xs font-medium text-neutral-300">点击上传或将图像拖放到此处</p>
              <p className="text-[10px] text-neutral-500 mt-1">支持 PNG, JPG, WEBP 大于 100KB</p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowImageLensModal(false)}
                className="rounded-full bg-[#27272a] px-5 py-2 text-xs text-neutral-300 hover:bg-[#3f3f46] hover:text-white transition-colors"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  setQuery('识别此架构图与技术草图');
                  setShowImageLensModal(false);
                  onSearch('识别此架构图与技术草图', activeCategory, timeRange, aiMode);
                }}
                className="rounded-full bg-white px-5 py-2 text-xs font-bold text-black hover:bg-neutral-200 transition-colors"
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
