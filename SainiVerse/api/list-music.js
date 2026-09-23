import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { r2Client, BUCKET_NAME } from './_r2.js';

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
 * Serverless Endpoint: List Music directly from Cloudflare R2
 * Strictly queries ONLY the `Music/` folder in the saini-verse R2 bucket.
 * Does NOT query Navbar_Music. If empty or folder missing, returns an empty list.
 *
 * Method: GET
 * Endpoint: /api/list-music
 * Response: { songs: Array<{ id, storageKey, fileName, title, size, lastModified, url }> }
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const targetBucket = BUCKET_NAME || 'saini-verse';
  const songsMap = new Map();

  try {
    const command = new ListObjectsV2Command({
      Bucket: targetBucket,
      Prefix: 'Music/',
      MaxKeys: 1000,
    });

    const response = await r2Client.send(command);

    if (Array.isArray(response.Contents)) {
      for (const item of response.Contents) {
        // Ignore directory markers or 0-byte placeholders
        if (!item.Key || item.Key.endsWith('/') || item.Size === 0) {
          continue;
        }

        // Verify it is an audio file by extension
        const isAudio = /\.(mp3|m4a|wav|ogg|flac|aac|webm)$/i.test(item.Key);
        if (!isAudio) {
          continue;
        }

        const fullKey = item.Key;
        const rawFileName = fullKey.split('/').pop() || fullKey;
        // Clean filename by stripping prepended uuid
        const cleanFileName = rawFileName
          .replace(/^[a-f0-9-]{36}_/, '')
          .replace(/^\d+_\d+_/, '');

        // Pretty title from filename
        const prettyTitle = cleanFileName
          .replace(/\.[^/.]+$/, '')
          .replace(/\s*\[.*?\]$/, '')
          .replace(/_/g, ' ')
          .trim();

        songsMap.set(fullKey, {
          id: `r2_${fullKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
          storageKey: fullKey,
          fileName: cleanFileName,
          title: prettyTitle || 'Untitled Track',
          artist: 'Vault Melody',
          dedication: 'Our celestial melody in endless orbit',
          size: item.Size,
          lastModified: item.LastModified ? item.LastModified.toISOString() : new Date().toISOString(),
          folder: 'Music',
          url: `/api/get-music?key=${encodeURIComponent(fullKey)}`,
        });
      }
    }

    const songs = Array.from(songsMap.values());
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return sendJson(res, 200, { songs, total: songs.length });
  } catch (error) {
    console.error('[list-music] Error querying Music/ folder:', error);
    return sendJson(res, 200, { songs: [], total: 0 });
  }
}
