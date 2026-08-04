import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Play,
  ExternalLink,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  Share2,
  Tv,
  Film,
  Sparkles,
  Eye,
  Clock,
  User,
  ListVideo,
  ThumbsUp,
  Maximize2,
  Minimize2,
  Lightbulb
} from 'lucide-react';
import type { SearchResult } from '../types';

interface VideoPlayerPageProps {
  video: SearchResult;
  relatedVideos: SearchResult[];
  query: string;
  onBack: () => void;
  onSelectVideo: (video: SearchResult) => void;
  onSaveToOffline?: (result: SearchResult) => void;
  isSaved?: boolean;
}

export const VideoPlayerPage: React.FC<VideoPlayerPageProps> = ({
  video,
  relatedVideos,
  query,
  onBack,
  onSelectVideo,
  onSaveToOffline,
  isSaved = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isTheater, setIsTheater] = useState(false);
  const [isDimmed, setIsDimmed] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'ai'>('info');
  const [localSaved, setLocalSaved] = useState(isSaved);

  useEffect(() => {
    setLocalSaved(isSaved);
  }, [isSaved, video]);

  // Comprehensive video embed parser supporting YouTube, Bilibili, Vimeo, Youku, QQ Video, Dailymotion & direct MP4/WebM
  const getEmbedInfo = (item: SearchResult) => {
    if (item.iframe) return { type: 'iframe', url: item.iframe };
    const url = item.url || '';
    const thumb = item.thumbnail || item.thumbnail_src || item.img_src || '';

    // 1. YouTube Detection (checks URL, embed params, and thumbnail ytimg ID)
    let ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (!ytMatch) {
      ytMatch = thumb.match(/\/vi\/([^"&?\/\s]{11})\//i);
    }
    if (!ytMatch && url.includes('v=')) {
      ytMatch = url.match(/[?&]v=([^"&?\/\s]{11})/i);
    }
    if (ytMatch && ytMatch[1]) {
      return {
        type: 'iframe',
        url: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0`
      };
    }

    // 2. Bilibili Detection (checks bvid property, BV string, or av aid)
    const bvid = item.bvid || (url.match(/(BV[a-zA-Z0-9]{10})/i)?.[1]) || (url.match(/video\/(BV[a-zA-Z0-9]+)/i)?.[1]);
    if (bvid) {
      return {
        type: 'iframe',
        url: `https://player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1&danmaku=0&autoplay=1`
      };
    }
    const aid = url.match(/video\/av([0-9]+)/i)?.[1];
    if (aid) {
      return {
        type: 'iframe',
        url: `https://player.bilibili.com/player.html?aid=${aid}&page=1&high_quality=1&danmaku=0&autoplay=1`
      };
    }

    // 3. Vimeo Detection
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return {
        type: 'iframe',
        url: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`
      };
    }

    // 4. Dailymotion Detection
    const dmMatch = url.match(/dailymotion\.com\/(?:video|embed\/video)\/([a-zA-Z0-9]+)/i);
    if (dmMatch && dmMatch[1]) {
      return {
        type: 'iframe',
        url: `https://www.dailymotion.com/embed/video/${dmMatch[1]}?autoplay=1`
      };
    }

    // 5. Youku Detection
    const youkuMatch = url.match(/v_show\/id_([a-zA-Z0-9==]+)/i);
    if (youkuMatch && youkuMatch[1]) {
      return {
        type: 'iframe',
        url: `https://player.youku.com/embed/${youkuMatch[1]}`
      };
    }

    // 6. Tencent Video (QQ Video)
    const qqMatch = url.match(/v\.qq\.com\/x\/(?:cover|page)\/(?:.*\/)?([a-zA-Z0-9]+)\.html/i) || url.match(/[?&]vid=([a-zA-Z0-9]+)/i);
    if (qqMatch && qqMatch[1]) {
      return {
        type: 'iframe',
        url: `https://v.qq.com/txp/iframe/player.html?vid=${qqMatch[1]}&auto=1`
      };
    }

    // 7. Direct HTML5 Video File
    if (/\.(mp4|webm|m3u8|ogg)($|\?)/i.test(url)) {
      return {
        type: 'video',
        url: url
      };
    }

    return null;
  };

  const embedInfo = getEmbedInfo(video);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(video.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSave = () => {
    if (onSaveToOffline) {
      onSaveToOffline(video);
      setLocalSaved(!localSaved);
    }
  };

  // Determine platform details
  let platform = video.engine || '视频平台';
  let platformColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
  const urlLower = (video.url || '').toLowerCase();
  if (urlLower.includes('bilibili.com') || (video.engine || '').toLowerCase().includes('bilibili')) {
    platform = 'Bilibili';
    platformColor = 'bg-[#00a1d6]/20 text-[#00a1d6] border-[#00a1d6]/40';
  } else if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || (video.engine || '').toLowerCase().includes('youtube')) {
    platform = 'YouTube';
    platformColor = 'bg-red-500/20 text-red-400 border-red-500/40';
  } else if (urlLower.includes('v.qq.com')) {
    platform = '腾讯视频';
    platformColor = 'bg-orange-500/20 text-orange-400 border-orange-500/40';
  } else if (urlLower.includes('youku.com')) {
    platform = '优酷视频';
    platformColor = 'bg-blue-500/20 text-blue-400 border-blue-500/40';
  }

  // Cover image proxying & fallback
  let rawThumb = video.thumbnail_src || video.thumbnail || video.img_src || '';
  if (rawThumb.startsWith('//')) rawThumb = 'https:' + rawThumb;
  let coverSrc = rawThumb;
  if (rawThumb && (rawThumb.startsWith('http://') || rawThumb.startsWith('https://')) && !rawThumb.includes('pollinations.ai') && !rawThumb.startsWith('/api/proxy-image')) {
    coverSrc = `/api/proxy-image?url=${encodeURIComponent(rawThumb)}`;
  }
  const fallbackThumb = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    `video tutorial cover ${query} ${video.title}`
  )}?width=1280&height=720&seed=999&nologo=true`;

  if (!coverSrc) {
    coverSrc = fallbackThumb;
  }

  return (
    <div className={`min-h-screen bg-[#09090b] text-white flex flex-col transition-colors duration-500 ${isDimmed ? 'opacity-90' : ''}`}>
      
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-[#121215]/90 backdrop-blur-md border-b border-[#27272a] px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0 pr-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-neutral-200 hover:text-white transition-all text-xs font-semibold shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">返回搜索结果</span>
          </button>
          
          <div className="h-4 w-[1px] bg-[#27272a] hidden sm:block" />
          
          <div className="flex items-center space-x-2 min-w-0">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${platformColor}`}>
              {platform}
            </span>
            <h1 className="text-sm font-bold text-white truncate max-w-xl">{video.title}</h1>
          </div>
        </div>

        {/* Quick Toolbar Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setIsDimmed(!isDimmed)}
            className={`p-2 rounded-xl border text-xs font-medium transition-all ${
              isDimmed ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-[#1e1e24] border-[#27272a] text-neutral-300 hover:text-white'
            }`}
            title={isDimmed ? '取消关灯' : '关灯模式'}
          >
            <Lightbulb className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsTheater(!isTheater)}
            className={`p-2 rounded-xl border text-xs font-medium transition-all ${
              isTheater ? 'bg-purple-600/30 text-purple-300 border-purple-500/50' : 'bg-[#1e1e24] border-[#27272a] text-neutral-300 hover:text-white'
            }`}
            title={isTheater ? '退出影院模式' : '影院模式'}
          >
            {isTheater ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          <button
            onClick={handleToggleSave}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              localSaved
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-[#1e1e24] border-[#27272a] text-neutral-300 hover:text-white'
            }`}
          >
            {localSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            <span className="hidden sm:inline">{localSaved ? '已收藏' : '收藏'}</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#1e1e24] border border-[#27272a] text-xs font-medium text-neutral-300 hover:text-white transition-all"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span className="hidden sm:inline">{copied ? '已复制' : '复制链接'}</span>
          </button>

          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all shadow-lg"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">原站观看</span>
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <div className={`w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 transition-all ${isTheater ? 'max-w-none' : 'max-w-[1440px]'}`}>
        
        {/* Video Player Cinema Frame */}
        <div className="w-full bg-black rounded-3xl overflow-hidden border border-[#27272a] shadow-2xl relative aspect-video max-h-[78vh]">
          {embedInfo?.type === 'iframe' ? (
            <iframe
              src={embedInfo.url}
              title={video.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="no-referrer"
            />
          ) : embedInfo?.type === 'video' ? (
            <video
              src={embedInfo.url}
              controls
              autoPlay
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <div className="w-full h-full relative flex flex-col items-center justify-center p-6 text-center space-y-4 bg-gradient-to-b from-[#18181b] via-[#09090b] to-black">
              <img
                src={coverSrc}
                alt={video.title}
                className="absolute inset-0 w-full h-full object-cover opacity-40 blur-md"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallbackThumb;
                }}
              />
              <div className="relative z-10 space-y-4 max-w-xl bg-black/80 p-6 sm:p-8 rounded-3xl border border-[#27272a] backdrop-blur-md shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center mx-auto shadow-2xl">
                  <Play className="h-8 w-8 fill-white ml-1" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">{video.title}</h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  当前视频资源来自于第三方平台（{platform}）。为避免嵌入受阻或防盗链限制，我们已为您准备了原站极速播放通道：
                </p>
                <div className="pt-2 flex items-center justify-center space-x-3">
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-2xl bg-white text-black font-extrabold text-xs hover:bg-neutral-200 transition-all flex items-center space-x-2 shadow-2xl scale-105"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>前往 {platform} 原站高清播放</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Details & Recommendation Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,14fr)_minmax(0,7fr)] gap-6 lg:gap-8 items-start">
          
          {/* Left: Video Details & Tabs */}
          <div className="space-y-6">
            
            {/* Title & Metadata Card */}
            <div className="bg-[#121215] border border-[#27272a] rounded-3xl p-5 sm:p-6 space-y-4">
              <h1 className="text-lg sm:text-xl font-bold text-white leading-snug">
                {video.title}
              </h1>

              {/* Stats & Author Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400 border-b border-[#27272a] pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-purple-600/30 border border-purple-500/40 text-purple-300 flex items-center justify-center font-bold">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{video.author || platform}</div>
                    <div className="text-[11px] text-neutral-400">资源索引自 {platform}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {video.duration && (
                    <div className="flex items-center space-x-1 bg-[#1c1c20] px-3 py-1.5 rounded-xl border border-[#27272a]">
                      <Clock className="h-3.5 w-3.5 text-purple-400" />
                      <span>{video.duration}</span>
                    </div>
                  )}
                  {video.views && (
                    <div className="flex items-center space-x-1 bg-[#1c1c20] px-3 py-1.5 rounded-xl border border-[#27272a]">
                      <Eye className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{video.views} 播放</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center space-x-2 border-b border-[#27272a] pb-2">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'info'
                      ? 'bg-white text-black shadow-md'
                      : 'text-neutral-400 hover:text-white hover:bg-[#1e1e24]'
                  }`}
                >
                  视频详情
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                    activeTab === 'ai'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-neutral-400 hover:text-white hover:bg-[#1e1e24]'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-200" />
                  <span>AI 智能解析</span>
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'info' ? (
                <div className="space-y-3 pt-1">
                  <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed bg-[#18181b] p-4 rounded-2xl border border-[#27272a]">
                    {video.snippet || '全网超清视频，由 NexusSearch 实时搜索引擎聚合呈现。'}
                  </p>
                  <div className="text-xs text-neutral-500 flex items-center justify-between">
                    <span>链接: {video.url}</span>
                    <span>搜索引擎: {video.engine}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1 bg-purple-950/20 border border-purple-800/30 p-4 rounded-2xl">
                  <div className="flex items-center space-x-2 text-xs font-bold text-purple-300">
                    <Sparkles className="h-4 w-4" />
                    <span>AI 视频核心内容提炼</span>
                  </div>
                  <p className="text-xs text-purple-100/90 leading-relaxed">
                    本视频《{video.title}》主要围绕关键词 “{query}” 展开。核心涵盖相关教程说明、关键功能演示及代码实现。全长约 {video.duration || '数分钟'}，为全网优质视频教程资源。
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Related Videos Sidebar Queue */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
              <div className="flex items-center space-x-2 text-xs font-bold text-neutral-200">
                <ListVideo className="h-4 w-4 text-purple-400" />
                <span>相关推荐视频 ({relatedVideos.length})</span>
              </div>
            </div>

            <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
              {relatedVideos.map((item, idx) => {
                const isCurrent = item.url === video.url;
                let rThumb = item.thumbnail_src || item.thumbnail || item.img_src || '';
                if (rThumb.startsWith('//')) rThumb = 'https:' + rThumb;
                if (rThumb && (rThumb.startsWith('http://') || rThumb.startsWith('https://')) && !rThumb.includes('pollinations.ai') && !rThumb.startsWith('/api/proxy-image')) {
                  rThumb = `/api/proxy-image?url=${encodeURIComponent(rThumb)}`;
                }

                return (
                  <div
                    key={idx}
                    onClick={() => onSelectVideo(item)}
                    className={`group flex space-x-3 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-purple-900/30 border-purple-500/50 shadow-md'
                        : 'bg-[#121215] hover:bg-[#18181c] border-[#27272a] hover:border-[#3f3f46]'
                    }`}
                  >
                    {/* Small Thumbnail */}
                    <div className="relative w-28 aspect-video rounded-xl overflow-hidden bg-black shrink-0 border border-[#2e2e34]">
                      <img
                        src={rThumb || `https://image.pollinations.ai/prompt/${encodeURIComponent(item.title)}&width=320&height=180`}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://image.pollinations.ai/prompt/${encodeURIComponent(item.title)}&width=320&height=180`;
                        }}
                      />
                      {item.duration && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] text-white font-mono px-1.5 py-0.5 rounded">
                          {item.duration}
                        </span>
                      )}
                    </div>

                    {/* Small Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <h4 className="text-xs font-semibold text-neutral-200 group-hover:text-white line-clamp-2 leading-tight">
                        {item.title}
                      </h4>
                      <div className="flex items-center space-x-2 text-[10px] text-neutral-400">
                        <span className="truncate">{item.author || item.engine || '视频'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
