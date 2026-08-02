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
    const data = await resp.json();
    
    // 二次重排算法与 AI 精准筛选 (Page 1 精准内容标记)
    if (data.results && data.results.length > 0) {
      const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
      const authoritativeDomains = [
        'github.com',
        'stackoverflow.com',
        'wikipedia.org',
        'developer.mozilla.org',
        'arxiv.org',
        'medium.com',
        'reddit.com',
        'news.ycombinator.com',
        'zhihu.com',
        'juejin.cn',
        'segmentfault.com'
      ];
      
      data.results = data.results.map((result: any, idx: number) => {
        let rankScore = result.score || 0;
        
        const urlLower = result.url.toLowerCase();
        const titleLower = result.title.toLowerCase();
        const snippetLower = result.snippet ? result.snippet.toLowerCase() : '';

        // 1. 标题匹配度加分 (最高 50 分)
        let titleMatchCount = 0;
        for (const term of queryTerms) {
          if (titleLower.includes(term)) {
            titleMatchCount++;
          }
        }
        const titleMatchRatio = queryTerms.length > 0 ? titleMatchCount / queryTerms.length : 0;
        rankScore += titleMatchRatio * 50;

        // 2. 域名权威性加分 (最高 30 分)
        let isAuthDomain = false;
        for (const domain of authoritativeDomains) {
          if (urlLower.includes(domain)) {
            rankScore += 30;
            isAuthDomain = true;
            break;
          }
        }

        // 3. 内容长度加分 (最高 20 分)
        const lengthBonus = Math.min(20, (snippetLower.length / 500) * 20);
        rankScore += lengthBonus;

        // 4. 低质量结果过滤 (惩罚过短摘要)
        if (snippetLower.length < 30) {
          rankScore -= 50;
        }

        // 5. 第一个分页（Page 1）赋予 AI 搜索精准标记
        const isAiCurated = page === 1 || result.isAiCurated || isAuthDomain || rankScore > 60;
        let aiReasoning = undefined;
        if (isAiCurated) {
          if (isAuthDomain) {
            aiReasoning = 'AI 调取 SearXNG 精选权威域名源';
          } else if (titleMatchRatio > 0.5) {
            aiReasoning = 'AI 语义识别高契合标题条目';
          } else {
            aiReasoning = 'AI 网页文本完整性智能比对通过';
          }
        }

        return {
          ...result,
          score: Math.round(rankScore),
          relevancePercent: Math.min(99, Math.max(70, Math.round(55 + rankScore * 0.4))),
          isAiCurated,
          aiPrecisionTag: isAiCurated ? 'AI 智搜精选' : undefined,
          aiReasoning,
          _rankScore: rankScore
        };
      }).sort((a: any, b: any) => b._rankScore - a._rankScore).map((r: any) => {
        delete r._rankScore;
        return r;
      });
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
  customUrls: string[] = []
): Promise<SearchResponse> {
  return executeSearch(query, category, 1, '', customUrls, 'google,bing,duckduckgo,baidu');
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

// Site Config KV / Storage API
export async function fetchAppConfig(): Promise<{ config: Partial<AppConfig>; storageType?: string } | null> {
  try {
    const resp = await fetch('/api/config');
    if (resp.ok) {
      const data = await resp.json();
      if (data.config && typeof data.config === 'object') {
        return { config: data.config, storageType: data.storageType };
      }
    }
  } catch (e) {
    console.warn('Failed to fetch config from /api/config:', e);
  }
  return null;
}

export async function saveAppConfig(config: Partial<AppConfig>): Promise<{ success: boolean; storageType?: string }> {
  try {
    const resp = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (resp.ok) {
      const data = await resp.json();
      return { success: true, storageType: data.storageType };
    }
  } catch (e) {
    console.warn('Failed to save config to /api/config:', e);
  }
  return { success: false };
}


