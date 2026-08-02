// Cloudflare Pages Function for Site Configuration stored in Cloudflare KV or Fallback
let memoryConfigStore = null;

function getKvNamespace(env) {
  if (!env) return null;
  return (
    env.NEXUS_CONFIG_KV ||
    env.CONFIG_KV ||
    env.NEXUS_KV ||
    env.SITE_CONFIG_KV ||
    env.KV ||
    null
  );
}

export async function onRequestGet(context) {
  const { env } = context;
  const kv = getKvNamespace(env);

  let config = {};

  if (kv) {
    try {
      const stored = await kv.get('site_config', { type: 'json' });
      if (stored) {
        config = stored;
      }
    } catch (e) {
      console.warn('Failed to read config from Cloudflare KV:', e);
    }
  } else if (memoryConfigStore) {
    config = memoryConfigStore;
  }

  return new Response(
    JSON.stringify({
      storageType: kv ? 'cloudflare_kv' : 'memory',
      config,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    }
  );
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const kv = getKvNamespace(env);

  let body = {};
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (kv) {
    try {
      const existing = (await kv.get('site_config', { type: 'json' })) || {};
      const updated = { ...existing, ...body, updatedAt: new Date().toISOString() };
      await kv.put('site_config', JSON.stringify(updated));
      return new Response(
        JSON.stringify({
          success: true,
          storageType: 'cloudflare_kv',
          config: updated,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (e) {
      console.error('Failed to write config to Cloudflare KV:', e);
      return new Response(
        JSON.stringify({ error: 'Failed to save config to Cloudflare KV: ' + e.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } else {
    memoryConfigStore = { ...memoryConfigStore, ...body, updatedAt: new Date().toISOString() };
    return new Response(
      JSON.stringify({
        success: true,
        storageType: 'memory',
        config: memoryConfigStore,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}
