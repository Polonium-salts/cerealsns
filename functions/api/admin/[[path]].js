let adminConfig = {
  globalRateLimitEnabled: true,
  globalRps: 500,
  corsAllowedOrigins: '*',
  requireApiKeyGlobal: false,
  searxngInstances: [
    { url: 'https://xka.cz', enabled: true, latencyMs: 28 },
    { url: 'https://searx.prvcy.eu', enabled: true, latencyMs: 45 },
    { url: 'https://searx.ro', enabled: true, latencyMs: 62 },
    { url: 'https://searx.info', enabled: true, latencyMs: 38 },
  ],
  logRetentionDays: 30,
  ipBlacklist: ['192.168.1.100'],
  jsDelivrCdnEnabled: true,
  jsDelivrCdnCacheTtlSec: 300,
  jsDelivrCdnMirrorRegion: 'global',
  jsDelivrPurgedAt: new Date().toISOString(),
};

let adminApiKeys = [];
let adminEndpoints = [
  { id: 'ep_1', path: '/api/search', method: 'GET', name: '元搜索引擎接口', description: '聚合 SearXNG 与 DuckDuckGo', enabled: true, rateLimitRpm: 1200, authRequired: false, totalRequests: 142, errorCount: 0, avgLatencyMs: 42 },
  { id: 'ep_2', path: '/api/summary/stream', method: 'POST', name: 'AI 实时流式总结接口', description: '基于 SSE 的大模型流式总结', enabled: true, rateLimitRpm: 300, authRequired: false, totalRequests: 85, errorCount: 0, avgLatencyMs: 120 },
  { id: 'ep_3', path: '/api/nodes/ping', method: 'GET', name: '边缘节点延迟监控接口', description: '边缘计算节点探测', enabled: true, rateLimitRpm: 2400, authRequired: false, totalRequests: 320, errorCount: 0, avgLatencyMs: 18 },
  { id: 'ep_4', path: '/api/openrouter/models', method: 'GET', name: '模型目录查询接口', description: '获取系统支持的大语言模型列表', enabled: true, rateLimitRpm: 600, authRequired: false, totalRequests: 65, errorCount: 0, avgLatencyMs: 15 },
  { id: 'ep_5', path: '/api/health', method: 'GET', name: '系统健康检查接口', description: '检查后端服务运行状态', enabled: true, rateLimitRpm: 3600, authRequired: false, totalRequests: 512, errorCount: 0, avgLatencyMs: 10 },
];

export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);
  const path = params.path ? params.path.join('/') : '';
  const method = request.method;

  if (path === 'stats' && method === 'GET') {
    return new Response(JSON.stringify({
      totalCallsToday: 1124,
      activeKeysCount: adminApiKeys.filter(k => k.status === 'active').length,
      avgLatencyMs: 28,
      successRate: 100.0,
      totalTokensUsed: 184500,
      systemStatus: 'healthy',
      hourlyRps: Array.from({ length: 12 }, (_, i) => ({
        hour: `${(new Date().getHours() - 11 + i + 24) % 24}:00`,
        requests: Math.floor(40 + Math.random() * 80),
        errors: 0
      })),
      jsDelivrStats: {
        totalAcceleratedRequests: 1240,
        cachedBandwidthSavedMb: 85.4,
        avgLatencyWithCdnMs: 12,
        hitRatioPercent: 94.2
      }
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (path === 'apikeys') {
    if (method === 'GET') {
      return new Response(JSON.stringify(adminApiKeys), { headers: { 'Content-Type': 'application/json' } });
    }
    if (method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const newKey = {
        id: 'key_' + Date.now(),
        name: (body.name || 'Cloudflare Key').trim(),
        key: 'sk_live_' + Math.random().toString(36).substring(2, 14),
        scopes: body.scopes || ['search:read'],
        rateLimitRps: Number(body.rateLimitRps) || 60,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        totalCalls: 0
      };
      adminApiKeys.unshift(newKey);
      return new Response(JSON.stringify(newKey), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (path.startsWith('apikeys/')) {
    const keyId = path.replace('apikeys/', '');
    if (method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      const k = adminApiKeys.find(item => item.id === keyId);
      if (k) {
        Object.assign(k, body);
        return new Response(JSON.stringify(k), { headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: 'Key not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    if (method === 'DELETE') {
      const idx = adminApiKeys.findIndex(item => item.id === keyId);
      if (idx !== -1) {
        adminApiKeys.splice(idx, 1);
        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: 'Key not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (path.startsWith('endpoints/')) {
    const epId = path.replace('endpoints/', '');
    if (method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      const ep = adminEndpoints.find(item => item.id === epId);
      if (ep) {
        Object.assign(ep, body);
        return new Response(JSON.stringify(ep), { headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: 'Endpoint not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (path === 'config') {
    if (method === 'GET') {
      return new Response(JSON.stringify(adminConfig), { headers: { 'Content-Type': 'application/json' } });
    }
    if (method === 'POST') {
      const body = await request.json().catch(() => ({}));
      adminConfig = { ...adminConfig, ...body };
      return new Response(JSON.stringify(adminConfig), { headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (path === 'searxng/ping-all' && method === 'POST') {
    const updated = await Promise.all(adminConfig.searxngInstances.map(async (inst) => {
      const start = Date.now();
      try {
        const resp = await fetch(`${inst.url}/search?q=ping&format=json`, { signal: AbortSignal.timeout(3000) });
        return { ...inst, latencyMs: Date.now() - start, status: resp.ok ? 'online' : 'degraded' };
      } catch {
        return { ...inst, latencyMs: Date.now() - start, status: 'offline' };
      }
    }));
    adminConfig.searxngInstances = updated;
    return new Response(JSON.stringify({ searxngInstances: updated }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ status: 'ok' }), { headers: { 'Content-Type': 'application/json' } });
}
