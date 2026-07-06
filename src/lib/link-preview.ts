// Server-side link preview (Board Overhaul — media pipeline §"multiple preview strategies").
// Strategy order: 1) provider oEmbed/embed (YouTube, Vimeo, TikTok) → 2) Open Graph →
// 3) page image → 4) (manual upload handled elsewhere) → 5) clean link card.
// Respect platform terms — do not fetch private/protected content.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface LinkPreview {
  canonicalUrl: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  faviconUrl?: string;
  author?: string;
  sourceDomain?: string;
  embedUrl?: string;                       // playable iframe src, when the provider allows
  mediaKind?: 'image' | 'video' | 'link';  // drives the card's personality
  raw: Record<string, string>;
}

function decodeEntities(s?: string): string | undefined {
  if (!s) return s;
  return s
    .replace(/&amp;/g, '&').replace(/&#38;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#x2F;/gi, '/');
}

function metaTag(html: string, key: 'property' | 'name', value: string): string | undefined {
  const re = new RegExp(`<meta[^>]+${key}=["']${value}["'][^>]+content=["']([^"']*)["']`, 'i');
  const m = html.match(re) ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${key}=["']${value}["']`, 'i'));
  return decodeEntities(m?.[1]);
}

function absolutize(src: string | undefined, origin: string): string | undefined {
  if (!src) return undefined;
  if (src.startsWith('//')) return 'https:' + src;
  if (src.startsWith('/')) return origin + src;
  return src;
}

function youTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./, '');
    if (h === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (h.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return v;
      const m = u.pathname.match(/\/(embed|shorts|v)\/([^/?]+)/);
      if (m) return m[2];
    }
  } catch { /* ignore */ }
  return null;
}

async function oembed(endpoint: string): Promise<any | null> {
  try {
    const res = await fetch(endpoint, { headers: { 'user-agent': UA, accept: 'application/json' }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, '');

  // 1) Provider-specific (video) — gives us a real thumbnail + playable embed.
  const yt = youTubeId(url);
  if (yt) {
    const o = await oembed(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    return {
      canonicalUrl: url, title: o?.title, author: o?.author_name,
      imageUrl: o?.thumbnail_url ?? `https://img.youtube.com/vi/${yt}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${yt}`, mediaKind: 'video',
      faviconUrl: 'https://www.youtube.com/favicon.ico', sourceDomain: 'youtube.com', raw: {},
    };
  }
  if (host.includes('vimeo.com')) {
    const o = await oembed(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
    if (o?.thumbnail_url) {
      return {
        canonicalUrl: url, title: o.title, author: o.author_name, imageUrl: o.thumbnail_url,
        embedUrl: o.video_id ? `https://player.vimeo.com/video/${o.video_id}` : undefined, mediaKind: 'video',
        faviconUrl: 'https://vimeo.com/favicon.ico', sourceDomain: 'vimeo.com', raw: {},
      };
    }
  }
  if (host.includes('tiktok.com')) {
    const o = await oembed(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (o?.thumbnail_url) {
      return {
        canonicalUrl: url, title: o.title || o.author_name, author: o.author_name,
        imageUrl: o.thumbnail_url, mediaKind: 'video',
        faviconUrl: 'https://www.tiktok.com/favicon.ico', sourceDomain: 'tiktok.com', raw: {},
      };
    }
  }

  // 2) + 3) Open Graph / page image scrape.
  let html = '';
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'accept-language': 'en-US,en;q=0.9' },
      redirect: 'follow', signal: AbortSignal.timeout(8000),
    });
    html = (await res.text()).slice(0, 300_000);
  } catch { /* network/blocked — fall through to a clean link card */ }

  const raw: Record<string, string> = {};
  for (const k of ['og:title', 'og:description', 'og:image', 'og:image:secure_url', 'og:video', 'og:site_name', 'twitter:title', 'twitter:image', 'twitter:image:src', 'author']) {
    const v = metaTag(html, k.startsWith('og:') ? 'property' : 'name', k);
    if (v) raw[k] = v;
  }
  const imageSrc = decodeEntities(html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i)?.[1]);
  const firstImg = decodeEntities(html.match(/<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i)?.[1]);
  const titleTag = decodeEntities(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]);
  const image = raw['og:image'] ?? raw['og:image:secure_url'] ?? raw['twitter:image'] ?? raw['twitter:image:src'] ?? imageSrc ?? firstImg;
  const imageUrl = absolutize(image, u.origin);

  return {
    canonicalUrl: (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1]) ?? url,
    title: raw['og:title'] ?? raw['twitter:title'] ?? titleTag,
    description: raw['og:description'],
    imageUrl,
    faviconUrl: `${u.origin}/favicon.ico`,
    author: raw['author'],
    sourceDomain: host,
    mediaKind: imageUrl ? 'image' : 'link',
    raw,
  };
}

// Maps a domain to the richer board_item_type so the card renders correctly.
export function itemTypeForUrl(url: string): string {
  const h = new URL(url).hostname.replace(/^www\./, '');
  if (h.includes('pinterest')) return /\/pin\//.test(url) ? 'pinterest_pin' : 'pinterest_board';
  if (h.includes('tiktok')) return 'tiktok';
  if (h.includes('instagram')) return 'instagram';
  if (h.includes('youtube') || h.includes('youtu.be')) return 'youtube';
  return 'link';
}
