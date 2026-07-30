import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { GoogleLogo } from './components/GoogleLogo';
import { SearchBar } from './components/SearchBar';
import { QuickShortcuts } from './components/QuickShortcuts';
import { AISummaryCard } from './components/AISummaryCard';
import { SearchResultsList } from './components/SearchResultsList';
import { SourceMatrixTab } from './components/SourceMatrixTab';
import { EdgeNodesMonitor } from './components/EdgeNodesMonitor';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ConfigModal } from './components/ConfigModal';
import { CommandPalette } from './components/CommandPalette';
import { AdminApiPanel } from './components/admin/AdminApiPanel';
import type { SearchResponse, SearchResult, AppConfig, EdgeNode, SearchHistoryItem } from './types';
import { executeSearch, streamAISummary, fetchEdgeNodes } from './lib/api';
import { saveSearchToOfflineCache } from './lib/indexedDB';
import { loadAppConfigFromFirebase, saveAppConfigToFirebase } from './lib/firebase';
import { Sparkles, Layers, BarChart3, Pencil, Globe, Zap, Cpu, Server, Shield } from 'lucide-react';

const DEFAULT_CONFIG: AppConfig = {
  openrouterApiKey: '',
  openrouterModel: 'google/gemini-2.0-flash-001',
  openrouterBaseUrl: 'https://openrouter.ai/api/v1',
  systemPrompt: '',
  customSearxngUrls: ['https://xka.cz'],
  activeEdgeProvider: 'Auto',
  autoSummarize: true,
  summaryDepth: 'standard',
  temperature: 0.3,
  theme: 'dark',
};

export default function App() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('general');
  const [timeRange, setTimeRange] = useState('');
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Streaming AI summary state
  const [summaryText, setSummaryText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [summaryModel, setSummaryModel] = useState('Gemini 2.0 Flash');
  const cancelStreamRef = useRef<(() => void) | null>(null);

  // App Configuration State
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [optimalNode, setOptimalNode] = useState<EdgeNode | null>(null);
  const [savedOfflineIds, setSavedOfflineIds] = useState<Set<string>>(new Set());

  // UI Navigation Tabs
  const [activeTab, setActiveTab] = useState<'summary' | 'results' | 'matrix'>('summary');

  // Modals & Drawers & Admin Route
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isEdgeMonitorOpen, setIsEdgeMonitorOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // 1. Initial configuration & Edge node setup
  useEffect(() => {
    async function init() {
      // Fetch edge nodes
      const nodeData = await fetchEdgeNodes();
      if (nodeData.optimalRoute) setOptimalNode(nodeData.optimalRoute);

      // Fetch config from Firebase
      const fbConfig = await loadAppConfigFromFirebase();
      if (fbConfig) {
        setConfig((prev) => ({ ...prev, ...fbConfig }));
        setFirebaseConnected(true);
      } else {
        const local = localStorage.getItem('nexus_app_config');
        if (local) {
          try { setConfig((prev) => ({ ...prev, ...JSON.parse(local) })); } catch {}
        }
      }
    }
    init();
  }, []);

  // 2. Sync search query & route path /sfheoheejfifejfeppoj from URL
  useEffect(() => {
    const syncFromUrl = () => {
      if (window.location.pathname === '/sfheoheejfifejfeppoj') {
        setIsAdminPanelOpen(true);
        return;
      } else {
        setIsAdminPanelOpen(false);
      }

      const params = new URLSearchParams(window.location.search);
      const urlQuery = params.get('q');
      const urlCat = params.get('cat') || 'general';

      if (urlQuery && urlQuery.trim()) {
        setQuery(urlQuery);
        setCategory(urlCat);
        handleExecuteSearch(urlQuery, urlCat, '', true, false);
      } else if (!urlQuery && window.location.pathname === '/') {
        setQuery('');
        setSearchData(null);
        setSummaryText('');
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

  // Navigate to Admin Panel (/sfheoheejfifejfeppoj)
  const handleOpenAdminPanel = () => {
    setIsAdminPanelOpen(true);
    if (window.location.pathname !== '/sfheoheejfifejfeppoj') {
      window.history.pushState({}, '', '/sfheoheejfifejfeppoj');
    }
  };

  // Save config changes
  const handleSaveConfig = async (newConfig: Partial<AppConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    localStorage.setItem('nexus_app_config', JSON.stringify(updated));
    const success = await saveAppConfigToFirebase(updated);
    setFirebaseConnected(success);
  };

  // Execute Search
  const handleExecuteSearch = async (
    searchQuery: string,
    searchCat = category,
    searchTime = timeRange,
    aiModeEnabled = true,
    updateHistory = true
  ) => {
    if (!searchQuery.trim()) return;

    setQuery(searchQuery);
    setCategory(searchCat);
    setTimeRange(searchTime);
    setIsLoading(true);
    setSearchData(null);
    setSummaryText('');

    // Update URL path and query parameters
    if (updateHistory) {
      const params = new URLSearchParams();
      params.set('q', searchQuery.trim());
      if (searchCat && searchCat !== 'general') {
        params.set('cat', searchCat);
      }
      const targetUrl = `/search?${params.toString()}`;
      if (window.location.pathname + window.location.search !== targetUrl) {
        window.history.pushState({ q: searchQuery, cat: searchCat }, '', targetUrl);
      }
    }

    try {
      const resp = await executeSearch(searchQuery, searchCat, 1, searchTime, config.customSearxngUrls);
      setSearchData(resp);
      setIsLoading(false);

      // Save initial search item to offline IndexedDB cache
      saveSearchToOfflineCache({
        query: searchQuery,
        category: searchCat,
        resultCount: resp.results.length,
        results: resp.results,
        tags: [searchCat],
        isFavorite: false,
        offlineCached: true,
      });

      // Auto trigger AI summary if AI mode is enabled
      if (aiModeEnabled && config.autoSummarize && resp.results.length > 0) {
        startStreamingSummary(searchQuery, resp.results, config.openrouterModel);
      }
    } catch (err: any) {
      console.error('Search failed:', err);
      setIsLoading(false);
    }
  };

  // Start Streaming AI Summary
  const startStreamingSummary = (topic: string, results: SearchResult[], modelOverride?: string) => {
    if (cancelStreamRef.current) {
      cancelStreamRef.current();
    }

    const targetModel = modelOverride || config.openrouterModel;
    setSummaryModel(targetModel);
    setSummaryText('');
    setIsStreaming(true);

    const cancelFn = streamAISummary(
      {
        query: topic,
        results,
        model: targetModel,
        openrouterApiKey: config.openrouterApiKey,
        summaryDepth: config.summaryDepth,
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
    setActiveTab('summary');
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

  if (isAdminPanelOpen) {
    return (
      <AdminApiPanel
        onBackToMain={() => {
          setIsAdminPanelOpen(false);
          if (window.location.pathname === '/sfheoheejfifejfeppoj') {
            window.history.pushState({}, '', '/');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#11151c] text-slate-100 font-sans selection:bg-slate-200 selection:text-slate-900 flex flex-col relative">
      
      {/* Top Header Navbar */}
      <Navbar
        config={config}
        optimalNode={optimalNode}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenEdgeMonitor={() => setIsEdgeMonitorOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onResetSearch={() => {
          setQuery('');
          setSearchData(null);
          setSummaryText('');
          if (window.location.search || window.location.pathname !== '/') {
            window.history.pushState({}, '', '/');
          }
        }}
        firebaseConnected={firebaseConnected}
        isSearchActive={isSearchActive}
        activeCategory={category}
        onSelectCategory={(catId) => {
          setCategory(catId);
          if (query.trim()) {
            handleExecuteSearch(query.trim(), catId, timeRange, true);
          }
        }}
      />

      {/* Main Container */}
      <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col">
        
        {/* State A: Homepage View (Minimalist Google Layout matching screenshot) */}
        {!isSearchActive && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 sm:py-20 my-auto">
            
            {/* Centered Large Google Logo */}
            <div className="mb-8">
              <GoogleLogo size="xl" />
            </div>

            {/* Google Pill Search Input */}
            <div className="w-full">
              <SearchBar
                initialQuery={query}
                activeCategory={category}
                activeTimeRange={timeRange}
                onSearch={handleExecuteSearch}
                isLoading={isLoading}
              />
            </div>

            {/* Quick Circular Shortcuts Launcher Grid (Google, GitHub, Build, Hexo, YouTube, 热榜, 展开) */}
            <QuickShortcuts
              onExecuteShortcut={(sq) => handleExecuteSearch(sq, undefined, timeRange, true)}
              onOpenCustomModal={() => setIsCommandPaletteOpen(true)}
            />

            {/* Footer Edge Latency Info */}
            <div className="mt-8 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
              <span>EdgeOne 节点就绪</span>
              <span>·</span>
              <span>18ms 延迟</span>
              <span>·</span>
              <button
                onClick={() => setIsEdgeMonitorOpen(true)}
                className="text-white font-medium hover:underline"
              >
                查看节点矩阵
              </button>
            </div>
          </div>
        )}

        {/* State B: Active Search Results View */}
        {isSearchActive && (
          <div className="max-w-[1440px] w-full mx-auto py-2 space-y-6">
            
            {/* Search Bar in Active State */}
            <div className="max-w-3xl">
              <SearchBar
                initialQuery={query}
                activeCategory={category}
                activeTimeRange={timeRange}
                onSearch={handleExecuteSearch}
                isLoading={isLoading}
                isCompactMode
              />
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`flex items-center space-x-2 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                    activeTab === 'summary'
                      ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>双栏视图 (AI + 网页)</span>
                </button>

                <button
                  onClick={() => setActiveTab('results')}
                  className={`flex items-center space-x-2 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                    activeTab === 'results'
                      ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Layers className="h-4 w-4 text-blue-500" />
                  <span>聚合网页 ({searchData?.results.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('matrix')}
                  className={`flex items-center space-x-2 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                    activeTab === 'matrix'
                      ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                  <span>引擎延迟矩阵</span>
                </button>
              </div>

              {searchData && (
                <div className="text-xs text-slate-400 hidden sm:block">
                  检索耗时: <span className="font-mono text-emerald-400 font-bold">{searchData.stats.fetchTimeMs} ms</span>
                </div>
              )}
            </div>

            {/* Tab 1: AI Answer on Right (9fr) & Search Engine Results on Left (16fr) */}
            {activeTab === 'summary' && (
              <div className="grid grid-cols-1 lg:grid-cols-[16fr_9fr] gap-6 xl:gap-8 items-start">
                {/* Left Side: Search Engine Results (16 ratio) */}
                <div className="w-full space-y-4 order-2 lg:order-1">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Layers className="h-4 w-4 text-blue-400" />
                      <span>搜索引擎网页结果</span>
                    </h3>
                  </div>
                  <SearchResultsList
                    results={searchData?.results || []}
                    isLoading={isLoading}
                    query={query}
                    onSaveToOffline={handleSaveSingleResult}
                    savedIds={savedOfflineIds}
                  />
                </div>

                {/* Right Side: AI Overview / AI Answer (9 ratio) - Sticky Pin Position */}
                <div className="w-full space-y-4 order-1 lg:order-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto pr-1">
                  <AISummaryCard
                    query={query}
                    summaryText={summaryText}
                    isStreaming={isStreaming}
                    modelUsed={summaryModel}
                    searchResults={searchData?.results || []}
                    onRegenerate={(modelOverride) => {
                      if (searchData?.results) {
                        startStreamingSummary(query, searchData.results, modelOverride);
                      }
                    }}
                    onFollowUpClick={(fq) => handleExecuteSearch(fq, category, timeRange, true)}
                    config={config}
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Raw Search Results */}
            {activeTab === 'results' && (
              <div className="max-w-4xl">
                <SearchResultsList
                  results={searchData?.results || []}
                  isLoading={isLoading}
                  query={query}
                  onSaveToOffline={handleSaveSingleResult}
                  savedIds={savedOfflineIds}
                />
              </div>
            )}

            {/* Tab 3: Source Matrix Analytics */}
            {activeTab === 'matrix' && (
              <SourceMatrixTab searchData={searchData} />
            )}

          </div>
        )}

      </main>

      {/* Floating Bottom-Right Launcher Buttons */}
      {!isSearchActive && (
        <div className="fixed bottom-6 right-6 z-30 flex items-center space-x-3">
          <button
            onClick={handleOpenAdminPanel}
            className="flex items-center space-x-2 rounded-full border border-purple-500/30 bg-[#251d38] px-4 py-2 text-xs font-semibold text-purple-200 shadow-2xl hover:bg-[#32274d] hover:border-purple-400 transition-all"
            title="API 管理面板 (/sfheoheejfifejfeppoj)"
          >
            <Server className="h-3.5 w-3.5 text-purple-400" />
            <span>API 管理面板</span>
          </button>

          <button
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center space-x-2 rounded-full border border-[#4a4261] bg-[#312a42] px-4 py-2 text-xs font-semibold text-slate-200 shadow-2xl hover:bg-[#3c3452] hover:border-[#635a7e] transition-all"
          >
            <Pencil className="h-3.5 w-3.5 text-purple-300" />
            <span>自定义 Chrome</span>
          </button>
        </div>
      )}

      {/* Modals & Drawers */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        firebaseConnected={firebaseConnected}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectHistoryItem={handleSelectHistoryItem}
      />

      <EdgeNodesMonitor
        isOpen={isEdgeMonitorOpen}
        onClose={() => setIsEdgeMonitorOpen(false)}
        onSelectNode={(node) => setOptimalNode(node)}
        activeNode={optimalNode}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onExecuteQuery={(q) => handleExecuteSearch(q, category, timeRange, true)}
        onOpenEdgeMonitor={() => setIsEdgeMonitorOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenAdminPanel={handleOpenAdminPanel}
        onChangeModel={(m) => handleSaveConfig({ openrouterModel: m })}
      />

    </div>
  );
}
