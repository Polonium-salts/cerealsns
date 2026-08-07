export interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  engine: string;
  category: 'general' | 'science' | 'news' | 'it' | 'media' | 'images' | 'videos';
  score: number;
  relevancePercent?: number;
  matchedKeywords?: string[];
  sourcesCount?: number;
  isConsensus?: boolean;
  isOfficial?: boolean;
  isDirectLink?: boolean;
  publishedDate?: string;
  favicon?: string;
  latencyMs: number;
  edgeNode: string;
  isAiCurated?: boolean;
  aiPrecisionTag?: string;
  aiReasoning?: string;
  img_src?: string;
  thumbnail_src?: string;
  thumbnail?: string;
  resolution?: string;
  author?: string;
  bvid?: string;
  duration?: string;
  views?: number | string;
  iframe?: string;
}

export interface EngineStats {
  engine: string;
  count: number;
  avgLatencyMs: number;
}

export interface CustomNodeInfo {
  specifiedUrl?: string | null;
  status: 'none' | 'success' | 'degraded' | 'failed' | 'invalid_url';
  validUrls?: string[];
  invalidUrls?: string[];
  resultCountFromCustom?: number;
  warning?: string | null;
  fallbackUsed?: boolean;
}

export interface SearchResponse {
  query: string;
  category: string;
  page?: number;
  totalPages?: number;
  results: SearchResult[];
  stats: {
    totalResults: number;
    fetchTimeMs: number;
    edgeNode: string;
    cacheHit: boolean;
    engineBreakdown: EngineStats[];
    customNodeInfo?: CustomNodeInfo;
  };
  enginesUsed: string[];
  suggestedQueries?: string[];
}

export interface AISummaryState {
  isStreaming: boolean;
  content: string;
  executiveSummary: string;
  keyInsights: string[];
  categories: string[];
  citations: Array<{ id: number; title: string; url: string }>;
  followUpQuestions: string[];
  modelUsed: string;
  tokensPerSec: number;
  durationMs: number;
  error?: string;
}

export interface SearxngInstance {
  url: string;
  name: string;
  enabled: boolean;
  latencyMs: number;
  region: string;
  status: 'online' | 'degraded' | 'offline';
  type: 'Cloudflare' | 'Standard';
}

export interface EdgeNode {
  id: string;
  name: string;
  provider: 'Cloudflare Pages' | 'Cloudflare Worker';
  location: string;
  city: string;
  countryCode: string;
  latencyMs: number;
  status: 'optimal' | 'active' | 'standby';
  cacheHitRatio: number;
  concurrentRequests: number;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  category: string;
  resultCount: number;
  aiSummaryPreview?: string;
  aiSummaryFull?: string;
  results: SearchResult[];
  tags: string[];
  isFavorite: boolean;
  offlineCached: boolean;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  latencyAvgMs: number;
  description: string;
  recommendedFor: string;
}

export interface AppConfig {
  openrouterApiKey: string;
  openrouterModel: string;
  summaryModel?: string;
  openrouterBaseUrl: string;
  systemPrompt: string;
  customSearxngUrls: string[];
  activeSearxngUrl?: string;
  envSearxngInstances?: string[];
  activeEdgeProvider: 'Auto' | 'Cloudflare Pages' | 'Cloudflare Worker';
  autoSummarize: boolean;
  summaryDepth: 'brief' | 'standard' | 'deep' | 'academic' | 'tech' | 'market';
  temperature: number;
  theme: 'dark' | 'light' | 'system';
  defaultEngines?: string[];
  adminSecret?: string;
}
