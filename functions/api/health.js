export async function onRequestGet(context) {
  const { env } = context;

  const data = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    platform: 'Cloudflare Pages Functions',
    edgeNodesOnline: 5,
    openrouterConfigured: Boolean(env.OPENROUTER_API_KEY),
  };

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
