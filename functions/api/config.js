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

  // Security Sanitization: Redact any sensitive properties (e.g. API keys) before returning to the public
  const sanitizedConfig = { ...config };
  if (sanitizedConfig.openrouterApiKey) {
    sanitizedConfig.openrouterApiKey = '';
  }
  if (sanitizedConfig.apiKey) {
    sanitizedConfig.apiKey = '';
  }

  return new Response(
    JSON.stringify({
      storageType: kv ? 'cloudflare_kv' : 'memory',
      config: sanitizedConfig,
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

  // Security Check: Enforce authentication using an Admin Secret token
  const adminSecret = env.ADMIN_SECRET || env.CONFIG_ADMIN_KEY;
  const authHeader = request.headers.get('Authorization') || request.headers.get('X-Admin-Token') || '';
  const clientToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (kv) {
    // In production with KV database bound, we MUST enforce authorization
    if (!adminSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Global configuration is locked. Please set ADMIN_SECRET in Pages Environment Variables.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (clientToken !== adminSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid Admin Secret key' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const existing = (await kv.get('site_config', { type: 'json' })) || {};
      // Never store empty api keys if user passes empty strings to reset
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
    // Local memory configuration store for development/testing
    if (adminSecret && clientToken !== adminSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid Admin Secret key' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

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
