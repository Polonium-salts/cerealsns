// Cloudflare Pages Function for jsDelivr CDN Proxy
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const assetPath = (url.searchParams.get('path') || '').trim();

  if (!assetPath) {
    return new Response(JSON.stringify({ error: 'Missing path parameter' }), {
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
