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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className={`w-full mx-auto ${isCompactMode ? 'max-w-3xl' : 'max-w-2xl my-4'} transition-all`}>
      <form onSubmit={handleSubmit} className="relative space-y-2">
        {/* White & Starry Sky Gray High Contrast Pill Search Bar */}
        <div className="relative flex items-center rounded-full border border-slate-300 bg-white text-slate-900 px-4 py-2.5 shadow-xl hover:border-slate-400 focus-within:border-slate-700 focus-within:ring-2 focus-within:ring-slate-400/30 transition-all duration-200">
          
          {/* Left Plus / Search Icon */}
          <div className="pr-2 text-slate-500">
            {isLoading ? (
              <Sparkles className="h-5 w-5 text-slate-800" />
            ) : (
              <Plus className="h-5 w-5 text-slate-500" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="询问 CerealsNS AI 或输入搜索内容..."
            className="w-full bg-transparent px-2 py-1 text-base text-slate-900 placeholder-slate-400 focus:outline-none"
          />

          {/* Clear Button */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors mr-1"
              title="清空搜索词"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Voice Mic Icon */}
          <button
            type="button"
            onClick={handleVoiceSearch}
            className={`p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors ${
              isListening ? 'text-blue-600 bg-blue-50 font-bold' : ''
            }`}
            title="语音输入"
          >
            <Mic className="h-5 w-5" />
          </button>

          {/* Camera / Lens Icon */}
          <button
            type="button"
            onClick={() => setShowImageLensModal(true)}
            className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="CerealsNS 智慧镜头 (以图搜图与多模态)"
          >
            <Camera className="h-5 w-5" />
          </button>

          {/* Filter Trigger Icon */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors ${
              showFilters ? 'bg-slate-200 text-slate-900' : ''
            }`}
            title="筛选与时间区间"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          {/* AI Mode Toggle Pill - Starry Slate Gray Badge */}
          <button
            type="button"
            onClick={() => setAiMode(!aiMode)}
            className={`ml-1 flex items-center space-x-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
              aiMode
                ? 'bg-[#1e2432] text-white border border-slate-700 shadow-sm'
                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
            }`}
            title={aiMode ? 'AI 模式已开启（结合 LLM 流式总结）' : '快搜模式（仅网页索引）'}
          >
            <Sparkles className={`h-3.5 w-3.5 ${aiMode ? 'text-amber-300' : 'text-slate-400'}`} />
            <span className="whitespace-nowrap">AI 模式</span>
          </button>
        </div>

        {/* Sub-label for SearXNG API engine */}
        {!isCompactMode && (
          <div className="flex items-center justify-center space-x-2 pt-1.5 text-[11px] text-slate-400">
            <span className="inline-flex items-center space-x-1 rounded-full bg-cyan-950/60 px-2.5 py-0.5 text-cyan-300 border border-cyan-800/60 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>SearXNG 隐私元搜索 API 驱动</span>
            </span>
            <span>·</span>
            <span>无跟踪 · 零日志 · 多源实时聚合</span>
          </div>
        )}

        {/* Time Filters Drawer */}
        {showFilters && (
          <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-xl flex items-center justify-between text-xs text-slate-800">
            <span className="text-slate-700 font-medium flex items-center space-x-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-800" />
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
                      ? 'bg-[#1e2432] text-white font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1e2432] text-white shadow-lg">
              <Camera className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">CerealsNS 智慧镜头 AI 识图</h3>
              <p className="text-xs text-slate-500 mt-1">
                上传或拖拽图片，让 CerealsNS AI 分析图像内容、提取文字或识别相关主题
              </p>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 hover:border-slate-600 transition-colors cursor-pointer bg-slate-50">
              <p className="text-xs font-medium text-slate-700">点击上传或将图像拖放到此处</p>
              <p className="text-[10px] text-slate-400 mt-1">支持 PNG, JPG, WEBP 大于 100KB</p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowImageLensModal(false)}
                className="rounded-full bg-slate-100 px-5 py-2 text-xs text-slate-700 hover:bg-slate-200 transition-colors"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  setQuery('识别此架构图与技术草图');
                  setShowImageLensModal(false);
                  onSearch('识别此架构图与技术草图', activeCategory, timeRange, aiMode);
                }}
                className="rounded-full bg-[#1e2432] px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
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
