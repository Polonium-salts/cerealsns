import type { SearchResponse, OpenRouterModel, EdgeNode, AppConfig } from '../types';

export async function executeSearch(
  query: string,
  category = 'general',
  page = 1,
  timeRange = '',
  customSearxngUrls: string[] = [],
  engines = 'google,bing,baidu,duckduckgo,yandex',
  activeSearxngUrl = ''
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

  if (activeSearxngUrl) {
    params.append('active_searxng_url', activeSearxngUrl);
  }

  try {
    const resp = await fetch(`/api/search?${params.toString()}`);
    const text = await resp.text();
    let data: any;

    try {
      data = JSON.parse(text);
    } catch {
      if (text.trim().startsWith('<')) {
        throw new Error('服务器后端尚未准备就绪，请刷新页面重试');
      }
      throw new Error(`服务器响应格式异常 (HTTP ${resp.status})`);
    }

    if (!resp.ok) {
      throw new Error(data?.error || `请求失败 (HTTP ${resp.status})`);
    }

    return data;
  } catch (err: any) {
    console.error('Search request error:', err);
    throw new Error(err.message || '搜索服务连接失败，请稍后重试');
  }
}

/**
 * AI Tool Calling Function: Let AI invoke the global SearXNG API to retrieve
 * external search resources and synchronize the search list with precise AI results.
 */
export async function triggerAISearXNGToolSearch(
  query: string,
  category = 'general',
  customUrls: string[] = [],
  engines?: string,
  activeSearxngUrl = ''
): Promise<SearchResponse> {
  return executeSearch(query, category, 1, '', customUrls, engines, activeSearxngUrl);
}

export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  try {
    const resp = await fetch('/api/openrouter/models');
    if (resp.ok) {
      const text = await resp.text();
      return JSON.parse(text);
    }
  } catch (e) {
    console.warn('Failed to fetch openrouter models:', e);
  }
  return [];
}

export async function fetchEdgeNodes(): Promise<{ nodes: EdgeNode[]; optimalRoute: EdgeNode }> {
  try {
    const resp = await fetch('/api/nodes/ping');
    if (resp.ok) {
      const text = await resp.text();
      return JSON.parse(text);
    }
  } catch (e) {
    console.warn('Failed to ping edge nodes:', e);
  }
  return {
    nodes: [],
    optimalRoute: {
      id: 'cf-pages-hk',
      name: 'Cloudflare Pages HK-01',
      provider: 'Cloudflare Pages',
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

// Site Config KV / Storage API
export async function fetchAppConfig(): Promise<{ config: Partial<AppConfig>; storageType?: string; envSearxngInstances?: string[] } | null> {
  try {
    const resp = await fetch('/api/config');
    if (resp.ok) {
      const text = await resp.text();
      const data = JSON.parse(text);
      if (data.config && typeof data.config === 'object') {
        return { 
          config: data.config, 
          storageType: data.storageType,
          envSearxngInstances: data.envSearxngInstances 
        };
      }
    }
  } catch (e) {
    console.warn('Failed to fetch config from /api/config:', e);
  }
  return null;
}

export async function saveAppConfig(config: Partial<AppConfig>): Promise<{ success: boolean; storageType?: string }> {
  // If the user hasn't specified an admin secret, do not call the global server config endpoint.
  // This prevents unauthenticated 401/403 console errors and saves request overhead.
  if (!config.adminSecret) {
    return { success: true, storageType: 'local_storage' };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.adminSecret) {
      headers['Authorization'] = `Bearer ${config.adminSecret}`;
    }

    // Security check: Delete sensitive fields from the payload before sending to global KV
    const payload = { ...config };
    delete payload.adminSecret;
    delete payload.openrouterApiKey;

    const resp = await fetch('/api/config', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (resp.ok) {
      const text = await resp.text();
      const data = JSON.parse(text);
      return { success: true, storageType: data.storageType };
    } else {
      const errorData = await resp.json().catch(() => ({ error: 'Unknown server error' }));
      console.warn('Failed to persist global configuration:', errorData.error);
    }
  } catch (e) {
    console.warn('Failed to save config to /api/config:', e);
  }
  return { success: false };
}

export async function pingSearxngInstances(urls: string[]): Promise<{ url: string; latency: number | null }[]> {
  try {
    const resp = await fetch('/api/searxng/ping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ urls })
    });
    if (resp.ok) {
      const data = await resp.json();
      const serverResults: { url: string; latency: number | null }[] = data.results || [];

      // For any instance where backend ping timed out or was blocked, attempt client-side browser probe
      const finalResults = await Promise.all(
        serverResults.map(async (item) => {
          if (item.latency !== null && item.latency > 0) {
            return item;
          }
          const clientLatency = await clientSidePing(item.url);
          return { url: item.url, latency: clientLatency };
        })
      );
      return finalResults;
    }
  } catch (e) {
    console.warn('Failed to ping instances via API, attempting client-side fallback:', e);
  }

  // Fallback: Client-side probe for all instances if API call fails
  return Promise.all(
    urls.map(async (url) => ({
      url,
      latency: await clientSidePing(url)
    }))
  );
}

async function clientSidePing(url: string, timeoutMs = 3000): Promise<number | null> {
  const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(`${cleanUrl}/`, { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
    clearTimeout(timer);
    return Math.round(performance.now() - start);
  } catch (err) {
    clearTimeout(timer);
    const startGet = performance.now();
    const controllerGet = new AbortController();
    const timerGet = setTimeout(() => controllerGet.abort(), timeoutMs);
    try {
      await fetch(`${cleanUrl}/`, { method: 'GET', mode: 'no-cors', signal: controllerGet.signal });
      clearTimeout(timerGet);
      return Math.round(performance.now() - startGet);
    } catch (e2) {
      clearTimeout(timerGet);
      return null;
    }
  }
}


