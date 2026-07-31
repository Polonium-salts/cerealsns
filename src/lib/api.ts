import type { SearchResponse, OpenRouterModel, EdgeNode, AppConfig } from '../types';

export async function executeSearch(
  query: string,
  category = 'general',
  page = 1,
  timeRange = '',
  customSearxngUrls: string[] = [],
  engines = 'google,bing,duckduckgo,baidu'
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query,
    category,
    page: page.toString(),
    time_range: timeRange,
    engines,
  });

  if (customSearxngUrls && customSearxngUrls.length > 0) {
    params.append('custom_urls', customSearxngUrls.join(','));
  }

  try {
    const resp = await fetch(`/api/search?${params.toString()}`);
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `请求失败 (HTTP ${resp.status})`);
    }
    return await resp.json();
  } catch (err: any) {
    console.error('Search request error:', err);
    throw new Error(err.message || '搜索服务连接失败，请稍后重试');
  }
}

export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  try {
    const resp = await fetch('/api/openrouter/models');
    if (resp.ok) return resp.json();
  } catch (e) {
    console.warn('Failed to fetch openrouter models:', e);
  }
  return [];
}

export async function fetchEdgeNodes(): Promise<{ nodes: EdgeNode[]; optimalRoute: EdgeNode }> {
  try {
    const resp = await fetch('/api/nodes/ping');
    if (resp.ok) return resp.json();
  } catch (e) {
    console.warn('Failed to ping edge nodes:', e);
  }
  return {
    nodes: [],
    optimalRoute: {
      id: 'edgeone-hk',
      name: 'EdgeOne HK-01',
      provider: 'EdgeOne',
      location: 'Hong Kong',
      city: 'Hong Kong',
      countryCode: 'HK',
      latencyMs: 18,
      status: 'optimal',
      cacheHitRatio: 0.92,
      concurrentRequests: 120,
    },
  };
}

export function streamAISummary(
  payload: {
    query: string;
    results: any[];
    model?: string;
    openrouterApiKey?: string;
    summaryDepth?: string;
    systemPrompt?: string;
  },
  onChunk: (delta: string) => void,
  onDone: (metadata?: any) => void,
  onError: (err: Error) => void
): () => void {
  const controller = new AbortController();

  fetch('/api/summary/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.delta) {
                onChunk(data.delta);
              }
              if (data.done) {
                onDone(data);
                return;
              }
            } catch (e) {
              // Ignore malformed SSE lines
            }
          }
        }
      }
      onDone();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err);
      }
    });

  return () => {
    controller.abort();
  };
}

// Admin Auth Management
let currentAdminToken = sessionStorage.getItem('nexus_admin_auth_token') || '';

export function getAdminAuthToken(): string {
  if (!currentAdminToken) {
    currentAdminToken = sessionStorage.getItem('nexus_admin_auth_token') || '';
  }
  return currentAdminToken;
}

export function setAdminAuthToken(token: string): void {
  currentAdminToken = token;
  sessionStorage.setItem('nexus_admin_auth_token', token);
}

export function clearAdminAuthToken(): void {
  currentAdminToken = '';
  sessionStorage.removeItem('nexus_admin_auth_token');
}

function getAdminHeaders(): Record<string, string> {
  const token = getAdminAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Admin-Token'] = token;
  }
  return headers;
}

export async function verifyAdminPassword(password: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  try {
    const resp = await fetch('/api/admin/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await resp.json().catch(() => ({}));
    if (resp.ok && data.ok && data.token) {
      setAdminAuthToken(data.token);
      return { ok: true, token: data.token };
    }
    return { ok: false, error: data.error || '密码错误，无权访问管理面板' };
  } catch (err: any) {
    console.error('Password verification error:', err);
    return { ok: false, error: '网络连接异常，验证失败' };
  }
}

// Admin API Management Panel Helper Functions
export async function fetchAdminStats(): Promise<import('../types').ApiAdminStats | null> {
  try {
    const resp = await fetch('/api/admin/stats', { headers: getAdminHeaders() });
    if (resp.ok) return resp.json();
  } catch (e) {
    console.warn('Failed to fetch admin stats:', e);
  }
  return null;
}

export async function fetchAdminApiKeys(): Promise<import('../types').ApiKeyItem[]> {
  try {
    const resp = await fetch('/api/admin/apikeys', { headers: getAdminHeaders() });
    if (resp.ok) return resp.json();
  } catch (e) {
    console.warn('Failed to fetch admin API keys:', e);
  }
  return [];
}

export async function createAdminApiKey(payload: { name: string; scopes: string[]; rateLimitRps: number }): Promise<import('../types').ApiKeyItem | null> {
  try {
    const resp = await fetch('/api/admin/apikeys', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    });
    if (resp.ok) return resp.json();
  } catch (e) {
    console.warn('Failed to create API key:', e);
  }
  return null;
}

export async function updateAdminApiKey(id: string, updates: Partial<import('../types').ApiKeyItem>): Promise<boolean> {
  try {
    const resp = await fetch(`/api/admin/apikeys/${id}`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify(updates),
    });
    return resp.ok;
  } catch (e) {
    console.warn('Failed to update API key:', e);
    return false;
  }
}

export async function deleteAdminApiKey(id: string): Promise<boolean> {
  try {
    const resp = await fetch(`/api/admin/apikeys/${id}`, { method: 'DELETE', headers: getAdminHeaders() });
    return resp.ok;
  } catch (e) {
    console.warn('Failed to delete API key:', e);
    return false;
  }
}

export async function fetchAdminEndpoints(): Promise<import('../types').ApiEndpointItem[]> {
  try {
    const resp = await fetch('/api/admin/endpoints', { headers: getAdminHeaders() });
    if (resp.ok) return resp.json();
  } catch (e) {
    console.warn('Failed to fetch admin endpoints:', e);
  }
  return [];
}

export async function updateAdminEndpoint(id: string, updates: Partial<import('../types').ApiEndpointItem>): Promise<boolean> {
  try {
    const resp = await fetch(`/api/admin/endpoints/${id}`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify(updates),
    });
    return resp.ok;
  } catch (e) {
    console.warn('Failed to update endpoint:', e);
    return false;
  }
}

export async function fetchAdminLogs(status?: string, search?: string): Promise<import('../types').ApiLogItem[]> {
  try {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);

    const resp = await fetch(`/api/admin/logs?${params.toString()}`, { headers: getAdminHeaders() });
    if (resp.ok) return resp.json();
  } catch (e) {
    console.warn('Failed to fetch admin logs:', e);
  }
  return [];
}

export async function fetchAdminConfig(): Promise<import('../types').ApiAdminConfig | null> {
  try {
    const resp = await fetch('/api/admin/config', { headers: getAdminHeaders() });
    if (resp.ok) return resp.json();
  } catch (e) {
    console.warn('Failed to fetch admin config:', e);
  }
  return null;
}

export async function saveAdminConfig(config: Partial<import('../types').ApiAdminConfig>): Promise<boolean> {
  try {
    const resp = await fetch('/api/admin/config', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(config),
    });
    return resp.ok;
  } catch (e) {
    console.warn('Failed to save admin config:', e);
    return false;
  }
}

export async function pingSearxngNode(url: string): Promise<{ ok: boolean; latencyMs: number; status: 'online' | 'degraded' | 'offline' }> {
  try {
    const resp = await fetch('/api/admin/searxng/ping', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ url }),
    });
    if (resp.ok) return resp.json();
  } catch (e) {
    console.warn('Failed to ping SearXNG node:', e);
  }
  return { ok: false, latencyMs: 999, status: 'offline' };
}

export async function pingAllSearxngNodes(): Promise<import('../types').SearxngInstanceItem[]> {
  try {
    const resp = await fetch('/api/admin/searxng/ping-all', {
      method: 'POST',
      headers: getAdminHeaders(),
    });
    if (resp.ok) {
      const data = await resp.json();
      return data.searxngInstances || [];
    }
  } catch (e) {
    console.warn('Failed to ping all SearXNG nodes:', e);
  }
  return [];
}

export async function purgeJsDelivrCdnCache(): Promise<{ ok: boolean; message?: string; purgedAt?: string }> {
  try {
    const resp = await fetch('/api/admin/jsdelivr/purge', { method: 'POST', headers: getAdminHeaders() });
    if (resp.ok) {
      const data = await resp.json();
      return { ok: true, message: data.message, purgedAt: data.purgedAt };
    }
  } catch (e) {
    console.warn('Failed to purge jsDelivr CDN cache:', e);
  }
  return { ok: false, message: 'Purge request failed' };
}

