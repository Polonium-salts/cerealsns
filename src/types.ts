export interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  engine: string;
  category: 'general' | 'science' | 'news' | 'it' | 'media';
  score: number;
  publishedDate?: string;
  favicon?: string;
  latencyMs: number;
  edgeNode: string;
}

export interface EngineStats {
  engine: string;
  count: number;
  avgLatencyMs: number;
}

export interface SearchResponse {
  query: string;
  category: string;
  results: SearchResult[];
  stats: {
    totalResults: number;
    fetchTimeMs: number;
    edgeNode: string;
    cacheHit: boolean;
    engineBreakdown: EngineStats[];
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
  type: 'EdgeOne' | 'Cloudflare' | 'Standard';
}

export interface EdgeNode {
  id: string;
  name: string;
  provider: 'EdgeOne' | 'Cloudflare Worker';
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
  openrouterBaseUrl: string;
  systemPrompt: string;
  customSearxngUrls: string[];
  activeEdgeProvider: 'Auto' | 'EdgeOne' | 'Cloudflare Worker';
  autoSummarize: boolean;
  summaryDepth: 'brief' | 'standard' | 'deep' | 'academic';
  temperature: number;
  theme: 'dark' | 'light' | 'system';
}

// API Admin Management Panel Types
export interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  scopes: string[];
  rateLimitRps: number;
  status: 'active' | 'suspended' | 'expired';
  createdAt: string;
  lastUsedAt?: string;
  totalCalls: number;
}

export interface ApiEndpointItem {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  name: string;
  description: string;
  enabled: boolean;
  rateLimitRpm: number;
  authRequired: boolean;
  totalRequests: number;
  errorCount: number;
  avgLatencyMs: number;
}

export interface ApiLogItem {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  ip: string;
  latencyMs: number;
  keyName?: string;
  userAgent?: string;
  responseSize?: string;
}

export interface JsDelivrCdnStats {
  totalAcceleratedRequests: number;
  cachedBandwidthSavedMb: number;
  avgLatencyWithCdnMs: number;
  hitRatioPercent: number;
}

export interface ApiAdminStats {
  totalCallsToday: number;
  activeKeysCount: number;
  avgLatencyMs: number;
  successRate: number;
  totalTokensUsed: number;
  systemStatus: 'healthy' | 'degraded' | 'maintenance';
  hourlyRps: Array<{ hour: string; requests: number; errors: number }>;
  jsDelivrStats?: JsDelivrCdnStats;
}

export interface SearxngInstanceItem {
  url: string;
  enabled: boolean;
  latencyMs: number;
  lastChecked?: string;
  status?: 'online' | 'degraded' | 'offline' | 'checking';
}

export interface ApiAdminConfig {
  globalRateLimitEnabled: boolean;
  globalRps: number;
  corsAllowedOrigins: string;
  requireApiKeyGlobal: boolean;
  searxngInstances: SearxngInstanceItem[];
  logRetentionDays: number;
  ipBlacklist: string[];
  jsDelivrCdnEnabled: boolean;
  jsDelivrCdnCacheTtlSec: number;
  jsDelivrCdnMirrorRegion: 'global' | 'asia_fast' | 'cloudflare_mesh' | 'gcore_edge';
  jsDelivrPurgedAt?: string;
}
