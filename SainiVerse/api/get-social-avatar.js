// In-memory cache for avatars to avoid repeated scraping and rate limits
const avatarCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours cache

export default async function handler(req, res) {
  // Support both req.query and URL search params
  let platform = req.query?.platform;
  let handle = req.query?.handle;
  let id = req.query?.id;

  if (!platform && req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      platform = parsedUrl.searchParams.get('platform');
      handle = parsedUrl.searchParams.get('handle');
      id = parsedUrl.searchParams.get('id');
    } catch {
      // ignore
    }
  }

  // Set long-lived cache headers so browsers and CDNs don't constantly re-fetch
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200');

  const cacheKey = `${platform}:${handle || id}`;
  const cached = avatarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    res.setHeader('Content-Type', cached.contentType);
    if (typeof res.status === 'function') {
      res.status(200);
    } else {
      res.statusCode = 200;
    }
    return res.end(cached.buffer);
  }

  try {
    let targetUrl = '';
    if (platform === 'instagram') {
      const cleanHandle = (handle || id || '').replace(/^@/, '').trim();
      if (!cleanHandle) {
        res.statusCode = 400;
        return res.end('Handle is required');
      }
      targetUrl = `https://www.instagram.com/${cleanHandle}/`;
    } else if (platform === 'facebook') {
      const cleanId = (id || handle || '').trim();
      if (!cleanId) {
        res.statusCode = 400;
        return res.end('ID is required');
      }
      targetUrl = `https://www.facebook.com/${cleanId}`;
    } else {
      res.statusCode = 400;
      return res.end('Invalid platform');
    }

    // Twitterbot User-Agent reliably triggers Meta/Instagram/Facebook to serve the OpenGraph meta tags containing the public profile picture
    const pageRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Twitterbot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!pageRes.ok) {
      res.statusCode = pageRes.status;
      return res.end(`Failed to fetch profile: ${pageRes.statusText}`);
    }

    const html = await pageRes.text();

    // Extract the og:image content tag
    const match =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

    const avatarUrl = match ? match[1].replace(/&amp;/g, '&') : null;

    if (!avatarUrl) {
      res.statusCode = 404;
      return res.end('Avatar not found');
    }

    // Pipe the image directly to avoid browser CORS/Referrer blocks
    const imgRes = await fetch(avatarUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: platform === 'instagram' ? 'https://www.instagram.com/' : 'https://www.facebook.com/',
      },
    });

    if (!imgRes.ok) {
      res.statusCode = imgRes.status;
      return res.end('Failed to fetch image binary');
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    // Cache in-memory for instant subsequent requests
    avatarCache.set(cacheKey, {
      buffer,
      contentType,
      timestamp: Date.now(),
    });

    res.setHeader('Content-Type', contentType);
    if (typeof res.status === 'function') {
      res.status(200);
    } else {
      res.statusCode = 200;
    }
    return res.end(buffer);
  } catch (error) {
    console.error('Error fetching social avatar:', error);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: error.message }));
  }
}