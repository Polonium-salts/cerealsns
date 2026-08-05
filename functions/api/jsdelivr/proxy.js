// Cloudflare Pages Function for jsDelivr CDN Proxy
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const assetPath = (url.searchParams.get('path') || '').trim();

  // 1. Basic existence check
  if (!assetPath) {
    return new Response(JSON.stringify({ error: 'Missing path parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. Prevent path traversal and special URL hacking sequences
  if (assetPath.includes('..') || assetPath.includes(':') || assetPath.includes('\\') || assetPath.includes('//')) {
    return new Response(JSON.stringify({ error: 'Security sequence traversal blocked' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 3. Strict character whitelist check for safe npm package format and asset paths
  const safePathRegex = /^[a-zA-Z0-9@_/.-]+$/;
  if (!safePathRegex.test(assetPath)) {
    return new Response(JSON.stringify({ error: 'Illegal characters in proxy path' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const targetUrl = `https://cdn.jsdelivr.net/${assetPath.replace(/^\//, '')}`;
  try {
    const resp = await fetch(targetUrl);
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'jsDelivr mirror fetch failed' }), {
        status: resp.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const contentType = resp.headers.get('content-type') || 'application/octet-stream';
    return new Response(resp.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        'X-JsDelivr-Proxy': 'HIT'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'jsDelivr CDN proxy error', details: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
