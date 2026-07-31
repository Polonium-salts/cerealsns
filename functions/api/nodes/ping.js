const EDGE_NODES = [
  { id: 'edgeone-hk', name: 'EdgeOne HK-01', provider: 'EdgeOne', location: 'Hong Kong, China', city: 'Hong Kong', countryCode: 'HK', latencyMs: 18, status: 'optimal', cacheHitRatio: 0.88, concurrentRequests: 142 },
  { id: 'cf-worker-tyo', name: 'Cloudflare Worker TYO', provider: 'Cloudflare Worker', location: 'Tokyo, Japan', city: 'Tokyo', countryCode: 'JP', latencyMs: 24, status: 'optimal', cacheHitRatio: 0.91, concurrentRequests: 188 },
  { id: 'edgeone-sg', name: 'EdgeOne SG-02', provider: 'EdgeOne', location: 'Singapore', city: 'Singapore', countryCode: 'SG', latencyMs: 32, status: 'active', cacheHitRatio: 0.84, concurrentRequests: 95 },
  { id: 'cf-worker-fra', name: 'Cloudflare Worker FRA', provider: 'Cloudflare Worker', location: 'Frankfurt, Germany', city: 'Frankfurt', countryCode: 'DE', latencyMs: 85, status: 'active', cacheHitRatio: 0.79, concurrentRequests: 120 },
  { id: 'cf-worker-sfo', name: 'Cloudflare Worker SFO', provider: 'Cloudflare Worker', location: 'Silicon Valley, USA', city: 'San Jose', countryCode: 'US', latencyMs: 110, status: 'standby', cacheHitRatio: 0.82, concurrentRequests: 74 },
];

export async function onRequestGet() {
  const updatedNodes = EDGE_NODES.map(node => ({
    ...node,
    latencyMs: Math.max(12, node.latencyMs + Math.floor((Math.random() - 0.5) * 6)),
    concurrentRequests: node.concurrentRequests + Math.floor((Math.random() - 0.5) * 10),
  }));

  const optimalNode = updatedNodes.reduce((min, n) => n.latencyMs < min.latencyMs ? n : min, updatedNodes[0]);

  return new Response(JSON.stringify({
    nodes: updatedNodes,
    optimalRoute: optimalNode,
    totalNodes: updatedNodes.length,
    activeProvider: 'Cloudflare Pages Functions + Edge CDN',
    timestamp: Date.now()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
