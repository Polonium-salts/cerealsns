import React, { useState, useEffect, useRef } from 'react';
import { Navbar, CATEGORIES } from './components/Navbar';
import { GoogleLogo } from './components/GoogleLogo';
import { SearchBar } from './components/SearchBar';
import { AISummaryCard } from './components/AISummaryCard';
import { SearchResultsList } from './components/SearchResultsList';
import { ImageSearchResults } from './components/ImageSearchResults';
import { VideoSearchResults } from './components/VideoSearchResults';
import { HistoryDrawer } from './components/HistoryDrawer';
import { HistoryPage } from './components/HistoryPage';
import { ConfigModal } from './components/ConfigModal';
import { CommandPalette } from './components/CommandPalette';
import { MobileBottomNav } from './components/MobileBottomNav';
import { PureAIChatView } from './components/PureAIChatView';
import { AISearchToolsModal } from './components/AISearchToolsModal';
import type { SearchResponse, SearchResult, AppConfig, EdgeNode, SearchHistoryItem } from './types';
import { executeSearch, triggerAISearXNGToolSearch, streamAISummary, fetchEdgeNodes, fetchAppConfig, saveAppConfig, pingSearxngInstances } from './lib/api';
import { saveSearchToOfflineCache } from './lib/indexedDB';
import { Sparkles, Layers, Globe, Zap, Cpu, Shield } from 'lucide-react';

const DEFAULT_CONFIG: AppConfig = {
  openrouterApiKey: '',
  openrouterModel: 'openrouter/free',
  openrouterBaseUrl: 'https://openrouter.ai/api/v1',
  systemPrompt: '',
  customSearxngUrls: ['https://xka.cz'],
  activeEdgeProvider: 'Auto',
  autoSummarize: true,
  summaryDepth: 'standard',
  temperature: 0.3,
  theme: 'light',
};

export default function App() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('general');
  const [timeRange, setTimeRange] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Mobile responsive view mode switcher ('all' | 'web' | 'ai')
  const [mobileViewMode, setMobileViewMode] = useState<'all' | 'web' | 'ai'>('all');

  // Streaming AI summary state
  const [summaryText, setSummaryText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAiSyncing, setIsAiSyncing] = useState(false);
  const [summaryModel, setSummaryModel] = useState('OpenRouter Free Auto');
  const cancelStreamRef = useRef<(() => void) | null>(null);

  // App Configuration & Engines State
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [selectedEngines, setSelectedEngines] = useState<string[]>(['google', 'bing', 'baidu', 'duckduckgo', 'yandex']);
  const [configStorageType, setConfigStorageType] = useState<string>('memory');
  const [optimalNode, setOptimalNode] = useState<EdgeNode | null>(null);
  const [savedOfflineIds, setSavedOfflineIds] = useState<Set<string>>(new Set());

  // SearXNG Instance Latency Tracking
  const [searxngLatencies, setSearxngLatencies] = useState<Record<string, number | null>>({});
  const [isPingingSearxng, setIsPingingSearxng] = useState(false);

  // Trigger ping test for all active/configured SearXNG instances
  const triggerPingTest = async (urlsToPing?: string[]) => {
    setIsPingingSearxng(true);
    const targetUrls = urlsToPing || Array.from(new Set([
      ...(config.customSearxngUrls || []),
      ...(config.envSearxngInstances || []),
      'https://searxng.site',
      'https://searx.be',
      'https://paulgo.io',
      'https://xka.cz',
      'https://searx.work',
      'https://opnxng.com'
    ]));

    try {
      const results = await pingSearxngInstances(targetUrls);
      const newLatencies: Record<string, number | null> = {};
      results.forEach(res => {
        newLatencies[res.url] = res.latency;
      });
      setSearxngLatencies(newLatencies);
    } catch (e) {
      console.error('Ping test failed:', e);
    } finally {
      setIsPingingSearxng(false);
    }
  };

  // Modals & Views
  const [currentView, setCurrentView] = useState<'search' | 'history'>('search');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAiToolsOpen, setIsAiToolsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // 0. Theme Sync Effect
  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = config.theme || 'light';
    let isDark = false;

    if (currentTheme === 'dark') {
      isDark = true;
    } else if (currentTheme === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark = false;
    }

    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
    }
  }, [config.theme]);

  // Global Keyboard Shortcuts (Ctrl+H or Cmd+H to toggle Search History Page)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setCurrentView((prev) => (prev === 'history' ? 'search' : 'history'));
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // 1. Initial configuration & Edge node setup
  useEffect(() => {
    async function init() {
      // Fetch edge nodes
      const nodeData = await fetchEdgeNodes();
      if (nodeData.optimalRoute) setOptimalNode(nodeData.optimalRoute);

      // Fetch config from KV / API endpoint (Site defaults)
      const kvResult = await fetchAppConfig();
      const local = localStorage.getItem('nexus_app_config');
      let localConfig: any = {};
      if (local) {
        try {
          localConfig = JSON.parse(local);
        } catch {}
      }

      const mergedCustom = localConfig.customSearxngUrls || kvResult?.config?.customSearxngUrls || ['https://xka.cz'];
      const mergedEnv = kvResult?.envSearxngInstances || [];

      // Merge: Local user configuration always takes precedence over server-side defaults, but preserve envSearxngInstances from the server environment
      const nextConfig = {
        ...DEFAULT_CONFIG,
        ...(kvResult?.config || {}),
        ...localConfig,
        envSearxngInstances: mergedEnv,
      };
      setConfig(nextConfig);

      if (kvResult?.storageType) {
        setConfigStorageType(kvResult.storageType);
      }

      // Automatically trigger parallelized latency checks on load
      const initUrls = Array.from(new Set([
        ...mergedCustom,
        ...mergedEnv,
        'https://searxng.site',
        'https://searx.be',
        'https://paulgo.io',
        'https://xka.cz',
        'https://searx.work',
        'https://opnxng.com'
      ]));

      setIsPingingSearxng(true);
      try {
        const results = await pingSearxngInstances(initUrls);
        const newLatencies: Record<string, number | null> = {};
        results.forEach(res => {
          newLatencies[res.url] = res.latency;
        });
        setSearxngLatencies(newLatencies);
      } catch (e) {
        console.error('Initial ping test failed:', e);
      } finally {
        setIsPingingSearxng(false);
      }
    }
    init();
  }, []);

  // 2. Sync search query & route path from URL
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const urlQuery = params.get('q');
      const urlCat = params.get('cat') || 'general';
      const urlPage = parseInt(params.get('page') || '1', 10);

      if (urlQuery && urlQuery.trim()) {
        setQuery(urlQuery);
        setCategory(urlCat);
        setCurrentPage(urlPage);
        handleExecuteSearch(urlQuery, urlCat, '', true, undefined, false, urlPage);
      } else if (!urlQuery && window.location.pathname === '/') {
        setQuery('');
        setSearchData(null);
        setSummaryText('');
        setCurrentPage(1);
        document.title = 'CerealsNS 智能聚合搜索 | AI驱动无广告全球隐私元搜索引擎';
      }
    };

    // Run on initial page load
    syncFromUrl();

    // Listen to browser back/forward buttons
    const handlePopState = () => {
      syncFromUrl();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Save config changes
  const handleSaveConfig = async (newConfig: Partial<AppConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    localStorage.setItem('nexus_app_config', JSON.stringify(updated));
    const result = await saveAppConfig(updated);
    if (result.storageType) setConfigStorageType(result.storageType);
  };

  // Execute Search
  const handleExecuteSearch = async (
    searchQuery: string,
    searchCat = category,
    searchTime = timeRange,
    aiModeEnabled = true,
    targetEngines?: string,
    updateHistory = true,
    targetPage = 1
  ) => {
    if (!searchQuery.trim()) return;

    const effectiveEngines = targetEngines || (selectedEngines.length > 0 ? selectedEngines.join(',') : (searchCat === 'videos' ? 'youtube,bilibili,vimeo,dailymotion' : 'google,bing,baidu,duckduckgo,yandex'));

    setQuery(searchQuery);
    setCategory(searchCat);
    setTimeRange(searchTime);
    setCurrentPage(targetPage);
    setIsLoading(true);
    setSearchData(null);
    setSummaryText('');
    document.title = `${searchQuery.trim()} - CerealsNS 智能聚合搜索`;

    // Update URL path and query parameters
    if (updateHistory) {
      const params = new URLSearchParams();
      params.set('q', searchQuery.trim());
      if (searchCat && searchCat !== 'general') {
        params.set('cat', searchCat);
      }
      if (targetPage > 1) {
        params.set('page', targetPage.toString());
      }
      const targetUrl = `/search?${params.toString()}`;
      if (window.location.pathname + window.location.search !== targetUrl) {
        window.history.pushState({ q: searchQuery, cat: searchCat, page: targetPage }, '', targetUrl);
      }
    }

    try {
      const resp = await executeSearch(searchQuery, searchCat, targetPage, searchTime, config.customSearxngUrls, effectiveEngines, config.activeSearxngUrl);
      setSearchData(resp);
      setIsLoading(false);

      // Save initial search item to offline IndexedDB cache
      saveSearchToOfflineCache({
        query: searchQuery,
        category: searchCat,
        resultCount: resp.results.length,
        results: resp.results,
        tags: [searchCat, `page_${targetPage}`],
        isFavorite: false,
        offlineCached: true,
      });

      // Auto trigger AI summary if AI mode is enabled and on page 1
      if (aiModeEnabled && config.autoSummarize && resp.results.length > 0 && targetPage === 1) {
        startStreamingSummary(searchQuery, resp.results, config.openrouterModel);
      }
    } catch (err: any) {
      console.error('Search failed:', err);
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    handleExecuteSearch(query, category, timeRange, true, selectedEngines.join(','), true, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // AI Tool Calling SearXNG API & Sync Search Results List
  const handleAiTriggerSearXNGSearch = async () => {
    if (!query.trim()) return;
    setIsAiSyncing(true);
    try {
      const syncedData = await triggerAISearXNGToolSearch(query, category, config.customSearxngUrls, selectedEngines.join(','), config.activeSearxngUrl);
      setSearchData(syncedData);
      setIsAiSyncing(false);
      // Re-trigger AI summary stream with synced precise results
      if (syncedData.results.length > 0) {
        startStreamingSummary(query, syncedData.results, config.openrouterModel);
      }
    } catch (e) {
      console.error('AI SearXNG sync failed:', e);
      setIsAiSyncing(false);
    }
  };

  // Start Streaming AI Summary
  const startStreamingSummary = (
    topic: string,
    results: SearchResult[],
    modelOverride?: string,
    depthOverride?: AppConfig['summaryDepth']
  ) => {
    if (cancelStreamRef.current) {
      cancelStreamRef.current();
    }

    const targetModel = modelOverride || config.openrouterModel;
    const targetDepth = depthOverride || config.summaryDepth;
    setSummaryModel(targetModel);
    setSummaryText('');
    setIsStreaming(true);

    const cancelFn = streamAISummary(
      {
        query: topic,
        results,
        model: targetModel,
        openrouterApiKey: config.openrouterApiKey,
        summaryDepth: targetDepth,
        systemPrompt: config.systemPrompt,
      },
      (delta) => {
        setSummaryText((prev) => prev + delta);
      },
      (metadata) => {
        setIsStreaming(false);
        if (metadata?.modelUsed) {
          setSummaryModel(metadata.modelUsed);
        }
        // Save full summary to IndexedDB
        saveSearchToOfflineCache({
          query: topic,
          category,
          resultCount: results.length,
          aiSummaryPreview: summaryText.substring(0, 150),
          aiSummaryFull: summaryText,
          results,
          tags: [category],
          isFavorite: false,
          offlineCached: true,
        });
      },
      (err) => {
        console.error('Stream error:', err);
        setIsStreaming(false);
        setSummaryText((prev) => prev + `\n\n*(流式传输连接中断，已还原本地搜索库快照)*`);
      }
    );

    cancelStreamRef.current = cancelFn;
  };

  // Select History Item
  const handleSelectHistoryItem = (item: SearchHistoryItem) => {
    setQuery(item.query);
    setCategory(item.category);
    setSearchData({
      query: item.query,
      category: item.category,
      results: item.results,
      stats: {
        totalResults: item.results.length * 30,
        fetchTimeMs: 12,
        edgeNode: 'IndexedDB Offline Cache',
        cacheHit: true,
        engineBreakdown: [{ engine: 'IndexedDB', count: item.results.length, avgLatencyMs: 2 }],
      },
      enginesUsed: Array.from(new Set(item.results.map((r) => r.engine))),
    });
    setSummaryText(item.aiSummaryFull || item.aiSummaryPreview || '');
    setIsHistoryOpen(false);
    setCurrentView('search');
  };

  // Save single result
  const handleSaveSingleResult = (result: SearchResult) => {
    setSavedOfflineIds((prev) => new Set(prev).add(result.id));
    saveSearchToOfflineCache({
      query: result.title,
      category: result.category,
      resultCount: 1,
      results: [result],
      tags: ['bookmark'],
      isFavorite: true,
      offlineCached: true,
    });
  };

  const isSearchActive = Boolean(searchData || isLoading);

  if (currentView === 'history') {
    return (
      <HistoryPage
        onBack={() => setCurrentView('search')}
        onSelectHistoryItem={handleSelectHistoryItem}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0c] text-slate-800 dark:text-neutral-200 font-sans selection:bg-slate-900 selection:text-white dark:selection:bg-white dark:selection:text-black flex flex-col relative transition-colors duration-200">
      
      {/* Top Header Navbar with SearchBar & Category Selector below SearchBar */}
      <Navbar
        config={config}
        optimalNode={optimalNode}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenHistory={() => setCurrentView('history')}
        onOpenAiTools={() => setIsAiToolsOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onResetSearch={() => {
          setQuery('');
          setSearchData(null);
          setSummaryText('');
          if (window.location.search || window.location.pathname !== '/') {
            window.history.pushState({}, '', '/');
          }
        }}
        isSearchActive={isSearchActive}
        activeCategory={category}
        onSelectCategory={(catId) => {
          setCategory(catId);
          if (query.trim()) {
            handleExecuteSearch(query.trim(), catId, timeRange, true, selectedEngines.join(','));
          }
        }}
        activeTimeRange={timeRange}
        onSelectTimeRange={(trId) => {
          setTimeRange(trId);
          if (query.trim()) {
            handleExecuteSearch(query.trim(), category, trId, true, selectedEngines.join(','));
          }
        }}
        selectedEngines={selectedEngines}
        onSelectEngines={setSelectedEngines}
        searchQuery={query}
        onSearch={handleExecuteSearch}
        isLoading={isLoading}
        fetchTimeMs={searchData?.stats?.fetchTimeMs}
        onUpdateConfig={handleSaveConfig}
        searxngLatencies={searxngLatencies}
        isPingingSearxng={isPingingSearxng}
        onPingTest={triggerPingTest}
      />

      {/* Main Container */}
      {category === 'ai' ? (
        <main className="flex-1 w-full flex flex-col p-0 m-0 overflow-hidden">
          <PureAIChatView
            initialQuery={query}
            config={config}
            onUpdateConfig={handleSaveConfig}
            onSearchGlobal={(q) => handleExecuteSearch(q, 'general', '', true, selectedEngines.join(','))}
          />
        </main>
      ) : (
        <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col">
          {/* State A: Homepage View */}
            {!isSearchActive && (
              <div className="flex-1 flex flex-col items-center justify-center py-12 sm:py-20 my-auto">
                
                {/* Centered Large Google Logo */}
                <div className="mb-8">
                  <GoogleLogo size="xl" />
                </div>

                {/* Search Bar */}
                <div className="w-full">
                  <SearchBar
                    initialQuery={query}
                    activeCategory={category}
                    activeTimeRange={timeRange}
                    selectedEngines={selectedEngines}
                    onSelectEngines={setSelectedEngines}
                    onSearch={handleExecuteSearch}
                    isLoading={isLoading}
                    config={config}
                    onUpdateConfig={handleSaveConfig}
                    searxngLatencies={searxngLatencies}
                    isPingingSearxng={isPingingSearxng}
                    onPingTest={triggerPingTest}
                  />
                </div>

                {/* Category Selection Information - Native Pills */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-2xl px-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    const IconComp = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white font-semibold shadow-md dark:bg-white dark:text-black'
                            : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 dark:bg-[#27272a] dark:text-neutral-300 dark:hover:text-white dark:hover:bg-[#3f3f46] dark:border-[#2e2e32]'
                        }`}
                      >
                        <IconComp className={`h-3.5 w-3.5 ${isSelected ? 'text-white dark:text-black' : 'text-slate-500 dark:text-neutral-400'}`} />
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Footer Edge Latency Info */}
                <div className="mt-10 text-center text-xs text-slate-500 dark:text-neutral-500 flex items-center justify-center space-x-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Cloudflare Pages API 加速中</span>
                  <span>·</span>
                  <span>{optimalNode?.latencyMs || 18}ms 延迟</span>
                </div>
              </div>
            )}

            {/* State B: Active Search Results View */}
            {isSearchActive && (
              <div className="max-w-[1440px] w-full mx-auto py-2 space-y-4 pb-16 sm:pb-4">
                {(() => {
                  const resultsLength = searchData?.results?.length || 0;
                  const calcTotalPages = searchData?.totalPages ?? (
                    resultsLength === 0 ? 1 :
                    (currentPage === 1 && resultsLength < 8) ? 1 :
                    (resultsLength < 5 && currentPage > 1) ? currentPage :
                    10
                  );
                  const calcTotalResults = searchData?.stats?.totalResults || resultsLength;

                  return category === 'images' ? (
                    <ImageSearchResults
                      results={searchData?.results || []}
                      isLoading={isLoading}
                      query={query}
                      onSaveToOffline={handleSaveSingleResult}
                      savedIds={savedOfflineIds}
                      currentPage={currentPage}
                      totalPages={calcTotalPages}
                      totalResults={calcTotalResults}
                      onPageChange={handlePageChange}
                    />
                  ) : category === 'videos' ? (
                    <VideoSearchResults
                      results={searchData?.results || []}
                      isLoading={isLoading}
                      query={query}
                      onSaveToOffline={handleSaveSingleResult}
                      savedIds={savedOfflineIds}
                      currentPage={currentPage}
                      totalPages={calcTotalPages}
                      totalResults={calcTotalResults}
                      onPageChange={handlePageChange}
                    />
                  ) : (
                    <>
                      {/* Mobile View Switcher Segmented Control */}
                      <div className="lg:hidden sticky top-[52px] z-30 bg-slate-50/95 dark:bg-[#0a0a0c]/95 backdrop-blur-md pb-2 pt-1">
                        <div className="flex items-center justify-center p-1 bg-white dark:bg-[#18181c] rounded-2xl border border-slate-200 dark:border-[#27272a] max-w-sm mx-auto text-xs font-semibold shadow-lg">
                          <button
                            type="button"
                            onClick={() => setMobileViewMode('all')}
                            className={`flex-1 py-1.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-1 ${
                              mobileViewMode === 'all'
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-bold shadow-md'
                                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <Layers className="h-3.5 w-3.5" />
                            <span>全部视图</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMobileViewMode('ai')}
                            className={`flex-1 py-1.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-1 ${
                              mobileViewMode === 'ai'
                                ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30'
                                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <Sparkles className="h-3.5 w-3.5 text-purple-200" />
                            <span>AI 概览</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMobileViewMode('web')}
                            className={`flex-1 py-1.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-1 ${
                              mobileViewMode === 'web'
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-bold shadow-md'
                                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <Globe className="h-3.5 w-3.5" />
                            <span>网页结果</span>
                          </button>
                        </div>
                      </div>

                      {/* Dual Column Layout (Desktop: Side by side; Mobile: Mode toggled) */}
                      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,13fr)_minmax(0,8fr)] gap-6 xl:gap-8 items-start">
                        
                        {/* Left Side: Search Engine Results */}
                        <div className={`w-full min-w-0 space-y-4 order-2 lg:order-1 ${
                          mobileViewMode === 'ai' ? 'hidden lg:block' : 'block'
                        }`}>
                          <SearchResultsList
                            results={searchData?.results || []}
                            isLoading={isLoading}
                            query={query}
                            onSaveToOffline={handleSaveSingleResult}
                            savedIds={savedOfflineIds}
                            currentPage={currentPage}
                            totalPages={calcTotalPages}
                            totalResults={calcTotalResults}
                            onPageChange={handlePageChange}
                            onAiTriggerSearXNGSearch={handleAiTriggerSearXNGSearch}
                            isAiSyncing={isAiSyncing}
                            customNodeWarning={searchData?.stats?.customNodeInfo?.warning}
                          />
                        </div>

                      {/* Right Side: AI Overview / AI Answer */}
                      <div className={`w-full min-w-0 space-y-4 order-1 lg:order-2 ${
                        mobileViewMode === 'web' ? 'hidden lg:block' : 'block'
                      }`}>
                        <AISummaryCard
                          query={query}
                          summaryText={summaryText}
                          isStreaming={isStreaming}
                          modelUsed={summaryModel}
                          searchResults={searchData?.results || []}
                          onRegenerate={(modelOverride, skillOverride) => {
                            if (searchData?.results) {
                              startStreamingSummary(query, searchData.results, modelOverride, skillOverride);
                            }
                          }}
                          onFollowUpClick={(fq) => handleExecuteSearch(fq, category, timeRange, true)}
                          config={config}
                          onUpdateConfig={handleSaveConfig}
                          onAiTriggerSearXNGSearch={handleAiTriggerSearXNGSearch}
                          isAiSyncing={isAiSyncing}
                        />
                      </div>
                    </div>
                  </>
                  );
                })()}
              </div>
            )}
        </main>
      )}



      {/* Mobile Bottom Dock Bar */}
      <MobileBottomNav
        isSearchActive={isSearchActive}
        activeCategory={category}
        onSelectCategory={(catId) => {
          setCategory(catId);
          if (query.trim()) {
            handleExecuteSearch(query.trim(), catId, timeRange, true, selectedEngines.join(','));
          }
        }}
        onOpenHistory={() => setCurrentView('history')}
        onOpenConfig={() => setIsConfigOpen(true)}
        onResetSearch={() => {
          setQuery('');
          setSearchData(null);
          setSummaryText('');
          if (window.location.search || window.location.pathname !== '/') {
            window.history.pushState({}, '', '/');
          }
        }}
        onFocusSearch={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        mobileViewMode={mobileViewMode}
        onSelectMobileViewMode={setMobileViewMode}
      />

      {/* Modals & Drawers */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        storageType={configStorageType}
        searxngLatencies={searxngLatencies}
        isPingingSearxng={isPingingSearxng}
        onPingTest={triggerPingTest}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectHistoryItem={handleSelectHistoryItem}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onExecuteQuery={(q) => handleExecuteSearch(q, category, timeRange, true, selectedEngines.join(','))}
        onOpenHistory={() => {
          setIsCommandPaletteOpen(false);
          setCurrentView('history');
        }}
        onOpenConfig={() => setIsConfigOpen(true)}
        onChangeModel={(m) => handleSaveConfig({ openrouterModel: m })}
      />

      <AISearchToolsModal
        isOpen={isAiToolsOpen}
        onClose={() => setIsAiToolsOpen(false)}
      />

    </div>
  );
}
