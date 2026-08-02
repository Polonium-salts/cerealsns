// Cloudflare Pages Function for Search Autocomplete
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();

  if (!q || q.length < 2) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const resp = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data.length >= 2 && Array.isArray(data[1])) {
        return new Response(JSON.stringify(data[1].slice(0, 8)), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (Array.isArray(data)) {
        const suggestions = data.map((item) => (typeof item === 'string' ? item : item.phrase)).filter(Boolean);
        return new Response(JSON.stringify(suggestions.slice(0, 8)), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  } catch {}

  // Fallback suggestions
  const fallbackSuggestions = [
    `${q} 核心原理解析`,
    `${q} 最新进展`,
    `${q} 最佳实践`,
    `${q} 优缺点对比`,
    `${q} 官方文档`
  ];

  return new Response(JSON.stringify(fallbackSuggestions), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
