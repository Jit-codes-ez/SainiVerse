import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, BUCKET_NAME } from './_r2.js';

const STATS_KEY = 'Public_Stats/love_meter.json';

/**
 * Helper to write JSON responses across Vercel serverless and Node HTTP
 */
function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(data));
}

/**
 * Serverless Endpoint: Global Love Meter Counter
 *
 * GET: Retrieves current global count from Cloudflare R2
 * POST: Increments global count by 1 and returns new count
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  // Prevent browser caching so every client gets real-time global counter
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const targetBucket = BUCKET_NAME || 'saini-verse';

  // Helper to read current count from R2
  async function readCount() {
    try {
      const getRes = await r2Client.send(
        new GetObjectCommand({
          Bucket: targetBucket,
          Key: STATS_KEY,
        })
      );
      const str = await getRes.Body.transformToString();
      const data = JSON.parse(str);
      if (typeof data.count === 'number' && !isNaN(data.count)) {
        return Math.max(0, data.count);
      }
    } catch {
      // NoSuchKey or parsing error defaults to 0
    }
    return 0;
  }

  // GET: Return current global count
  if (req.method === 'GET') {
    try {
      const count = await readCount();
      return sendJson(res, 200, { count });
    } catch (err) {
      console.error('[LoveMeter] GET error:', err);
      return sendJson(res, 200, { count: 0 });
    }
  }

  // POST: Increment global count by 1
  if (req.method === 'POST') {
    try {
      const currentCount = await readCount();
      const newCount = currentCount + 1;

      await r2Client.send(
        new PutObjectCommand({
          Bucket: targetBucket,
          Key: STATS_KEY,
          Body: JSON.stringify({
            count: newCount,
            updatedAt: new Date().toISOString(),
          }),
          ContentType: 'application/json',
        })
      );

      return sendJson(res, 200, { count: newCount, success: true });
    } catch (err) {
      console.error('[LoveMeter] POST error:', err);
      return sendJson(res, 500, { error: 'Failed to increment global counter' });
    }
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  return sendJson(res, 405, { error: 'Method Not Allowed' });
}
