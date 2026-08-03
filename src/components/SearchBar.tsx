import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Mic, Sparkles, Plus, Camera, SlidersHorizontal, Clock, ArrowRight } from 'lucide-react';

interface SearchBarProps {
  initialQuery?: string;
  activeCategory: string;
  activeTimeRange: string;
  onSearch: (query: string, category: string, timeRange: string, aiModeEnabled: boolean) => void;
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

export const SearchBar: React.FC<SearchBarProps> = ({
  initialQuery = '',
  activeCategory,
  activeTimeRange,
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
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

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
      onSearch(query.trim(), activeCategory, timeRange, aiMode);
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
        onSearch(transcript.trim(), activeCategory, timeRange, aiMode);
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
        <div className="relative flex items-center rounded-full border border-[#2e2e32] bg-[#1c1c1f] text-white px-4 py-2.5 shadow-xl hover:border-[#3f3f46] focus-within:border-white focus-within:ring-1 focus-within:ring-white/20 transition-all duration-200">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder="询问 CerealsNS AI 或输入搜索内容..."
            className="w-full bg-transparent px-2 py-1 text-base text-white placeholder-neutral-500 focus:outline-none"
          />

          {/* Clear Button */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors mr-1"
              title="清空搜索词"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Voice Mic Icon */}
          <button
            type="button"
            onClick={handleVoiceSearch}
            className={`p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#27272a] transition-colors ${
              isListening ? 'text-white bg-[#27272a] font-bold' : ''
            }`}
            title="语音输入"
          >
            <Mic className="h-5 w-5" />
          </button>

          {/* Camera / Lens Icon */}
          <button
            type="button"
            onClick={() => setShowImageLensModal(true)}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#27272a] transition-colors"
            title="CerealsNS 智慧镜头 (以图搜图与多模态)"
          >
            <Camera className="h-5 w-5" />
          </button>

          {/* Filter Trigger Icon */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#27272a] transition-colors ${
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
            className={`ml-1 flex items-center space-x-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
              aiMode
                ? 'bg-white text-black shadow-md hover:bg-neutral-200'
                : 'bg-[#27272a] text-neutral-300 hover:bg-[#3f3f46]'
            }`}
            title={aiMode ? 'AI 模式已开启（结合 LLM 流式总结）' : '快搜模式（仅网页索引）'}
          >
            <Sparkles className={`h-3.5 w-3.5 ${aiMode ? 'text-black' : 'text-neutral-400'}`} />
            <span className="whitespace-nowrap">AI 模式</span>
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
                  onSearch(item, activeCategory, timeRange, aiMode);
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

        {/* Time Filters Drawer */}
        {showFilters && (
          <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-3 shadow-2xl flex items-center justify-between text-xs text-white">
            <span className="text-neutral-300 font-medium flex items-center space-x-1.5">
              <Clock className="h-3.5 w-3.5 text-neutral-400" />
              <span>搜索时间区间范围：</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TIME_RANGES.map((tr) => (
                <button
                  key={tr.id}
                  type="button"
                  onClick={() => {
                    setTimeRange(tr.id);
                    if (query.trim()) {
                      onSearch(query.trim(), activeCategory, tr.id, aiMode);
                    }
                  }}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    timeRange === tr.id
                      ? 'bg-white text-black font-bold'
                      : 'bg-[#27272a] text-neutral-300 hover:bg-[#3f3f46]'
                  }`}
                >
                  {tr.name}
                </button>
              ))}
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
