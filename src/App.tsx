import React, { useState, useEffect, useRef } from 'react';
import { Navbar, CATEGORIES } from './components/Navbar';
import { GoogleLogo } from './components/GoogleLogo';
import { SearchBar } from './components/SearchBar';
import { AISummaryCard } from './components/AISummaryCard';
import { SearchResultsList } from './components/SearchResultsList';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ConfigModal } from './components/ConfigModal';
import { CommandPalette } from './components/CommandPalette';
import { AdminApiPanel } from './components/admin/AdminApiPanel';
import type { SearchResponse, SearchResult, AppConfig, EdgeNode, SearchHistoryItem } from './types';
import { executeSearch, streamAISummary, fetchEdgeNodes } from './lib/api';
import { saveSearchToOfflineCache } from './lib/indexedDB';
import { loadAppConfigFromFirebase, saveAppConfigToFirebase } from './lib/firebase';
import { Sparkles, Layers, Pencil, Globe, Zap, Cpu, Server, Shield } from 'lucide-react';

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
  theme: 'dark',
};

export default function App() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('general');
  const [timeRange, setTimeRange] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Streaming AI summary state
  const [summaryText, setSummaryText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [summaryModel, setSummaryModel] = useState('OpenRouter Free Auto');
  const cancelStreamRef = useRef<(() => void) | null>(null);

  // App Configuration State
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [optimalNode, setOptimalNode] = useState<EdgeNode | null>(null);
  const [savedOfflineIds, setSavedOfflineIds] = useState<Set<string>>(new Set());

  // Modals & Drawers & Admin Route
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
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
      const urlPage = parseInt(params.get('page') || '1', 10);

      if (urlQuery && urlQuery.trim()) {
        setQuery(urlQuery);
        setCategory(urlCat);
        setCurrentPage(urlPage);
        handleExecuteSearch(urlQuery, urlCat, '', true, false, urlPage);
      } else if (!urlQuery && window.location.pathname === '/') {
        setQuery('');
        setSearchData(null);
        setSummaryText('');
        setCurrentPage(1);
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
    updateHistory = true,
    targetPage = 1,
    targetEngines = 'google'
  ) => {
    if (!searchQuery.trim()) return;

    setQuery(searchQuery);
    setCategory(searchCat);
    setTimeRange(searchTime);
    setCurrentPage(targetPage);
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
      if (targetPage > 1) {
        params.set('page', targetPage.toString());
      }
      const targetUrl = `/search?${params.toString()}`;
      if (window.location.pathname + window.location.search !== targetUrl) {
        window.history.pushState({ q: searchQuery, cat: searchCat, page: targetPage }, '', targetUrl);
      }
    }

    try {
      const resp = await executeSearch(searchQuery, searchCat, targetPage, searchTime, config.customSearxngUrls, targetEngines);
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
    handleExecuteSearch(query, category, timeRange, true, true, newPage, 'google');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="min-h-screen bg-[#0a0a0c] text-neutral-200 font-sans selection:bg-white selection:text-black flex flex-col relative">
      
      {/* Top Header Navbar with SearchBar & Category Selector below SearchBar */}
      <Navbar
        config={config}
        optimalNode={optimalNode}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
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
        activeTimeRange={timeRange}
        onSelectTimeRange={(trId) => {
          setTimeRange(trId);
          if (query.trim()) {
            handleExecuteSearch(query.trim(), category, trId, true);
          }
        }}
        searchQuery={query}
        onSearch={handleExecuteSearch}
        isLoading={isLoading}
        fetchTimeMs={searchData?.stats?.fetchTimeMs}
      />

      {/* Main Container */}
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
                onSearch={handleExecuteSearch}
                isLoading={isLoading}
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
                        ? 'bg-white text-black font-semibold shadow-md'
                        : 'bg-[#27272a] text-neutral-300 hover:text-white hover:bg-[#3f3f46] border border-[#2e2e32]'
                    }`}
                  >
                    <IconComp className={`h-3.5 w-3.5 ${isSelected ? 'text-black' : 'text-neutral-400'}`} />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Footer Edge Latency Info */}
            <div className="mt-10 text-center text-xs text-neutral-500 flex items-center justify-center space-x-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>EdgeOne 节点加速中</span>
              <span>·</span>
              <span>18ms 延迟</span>
            </div>
          </div>
        )}

        {/* State B: Active Search Results View */}
        {isSearchActive && (
          <div className="max-w-[1440px] w-full mx-auto py-2 space-y-6">
            
            {/* Dual Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,13fr)_minmax(0,8fr)] gap-6 xl:gap-8 items-start">
              {/* Left Side: Search Engine Results */}
              <div className="w-full min-w-0 space-y-4 order-2 lg:order-1">
                <SearchResultsList
                  results={searchData?.results || []}
                  isLoading={isLoading}
                  query={query}
                  onSaveToOffline={handleSaveSingleResult}
                  savedIds={savedOfflineIds}
                  currentPage={currentPage}
                  totalPages={searchData?.totalPages || 10}
                  onPageChange={handlePageChange}
                />
              </div>

              {/* Right Side: AI Overview / AI Answer */}
              <div className="w-full min-w-0 space-y-4 order-1 lg:order-2">
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
                />
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Floating Bottom-Right Launcher Buttons */}
      {!isSearchActive && (
        <div className="fixed bottom-6 right-6 z-30 flex items-center space-x-3">
          <button
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center space-x-2 rounded-full border border-[#3f3f46] bg-[#27272a] px-4 py-2 text-xs font-semibold text-white shadow-2xl hover:bg-[#3f3f46] transition-all"
          >
            <Pencil className="h-3.5 w-3.5 text-neutral-300" />
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

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onExecuteQuery={(q) => handleExecuteSearch(q, category, timeRange, true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenAdminPanel={handleOpenAdminPanel}
        onChangeModel={(m) => handleSaveConfig({ openrouterModel: m })}
      />

    </div>
  );
}
