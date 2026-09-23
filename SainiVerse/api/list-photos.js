import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { r2Client, BUCKET_NAME } from './_r2.js';
import { verifyAuthorization } from './_auth.js';

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
 * Serverless Endpoint: List Photos directly from Cloudflare R2
 * Supports querying 'public' (Public_Memories/ & Public_Memory/)
 * and 'private' (Private_Memories/ & Private_Memory/) folders.
 *
 * Method: GET
 * Query: ?folder=public | private
 * Headers: Authorization: Bearer <FirebaseIdToken> (Required for private folder)
 * Response: { photos: Array<{ id, storageKey, fileName, size, lastModified, visibility, url }> }
 */
export default async function handler(req, res) {
  // 1. Only accept GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  // 2. Extract folder parameter
  let folder = req.query?.folder;
  if (!folder && req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      folder = parsedUrl.searchParams.get('folder');
    } catch {
      // Ignore URL parse error
    }
  }

  const normalizedFolder = (folder || 'public').toLowerCase().trim();

  // 3. Authorization check for private folder
  if (normalizedFolder === 'private') {
    const authResult = await verifyAuthorization(req);
    if (!authResult.authorized) {
      return sendJson(res, authResult.statusCode || 401, {
        error: authResult.error || 'Unauthorized: Valid Firebase session token required for Private Vault.',
      });
    }
  }

  const targetBucket = BUCKET_NAME || 'saini-verse';

  // 4. Define prefix candidates for the requested visibility
  const prefixesToQuery =
    normalizedFolder === 'private'
      ? ['Private_Memories/', 'Private_Memory/']
      : ['Public_Memories/', 'Public_Memory/'];

  const photosMap = new Map();

  try {
    for (const prefix of prefixesToQuery) {
      try {
        const command = new ListObjectsV2Command({
          Bucket: targetBucket,
          Prefix: prefix,
          MaxKeys: 1000,
        });

        const response = await r2Client.send(command);

        if (Array.isArray(response.Contents)) {
          for (const item of response.Contents) {
            // Ignore directory markers or 0-byte placeholders
            if (!item.Key || item.Key.endsWith('/') || item.Size === 0) {
              continue;
            }

            // Verify it is an image file by extension
            const isImage = /\.(jpe?g|png|webp|gif|heic|avif)$/i.test(item.Key);
            if (!isImage) {
              continue;
            }

            if (!photosMap.has(item.Key)) {
              const fullKey = item.Key;
              const rawFileName = fullKey.split('/').pop() || fullKey;
              // Clean filename by stripping prepended uuid if present
              const cleanFileName = rawFileName.replace(/^[a-f0-9-]{36}_/, '').replace(/^\d+_\d+_/, '');

              photosMap.set(fullKey, {
                id: `r2_${fullKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
                storageKey: fullKey,
                fileName: cleanFileName,
                size: item.Size,
                lastModified: item.LastModified ? item.LastModified.toISOString() : new Date().toISOString(),
                visibility: normalizedFolder === 'private' ? 'private' : 'public',
                url: `/api/get-photo?key=${encodeURIComponent(fullKey)}`,
              });
            }
          }
        }
      } catch (err) {
        console.warn(`[Cloudflare R2] Prefix query note for "${prefix}":`, err?.message || err);
      }
    }

    const photos = Array.from(photosMap.values()).sort((a, b) => {
      const dateA = new Date(a.lastModified).getTime();
      const dateB = new Date(b.lastModified).getTime();
      return dateB - dateA;
    });

    // Zero-cache headers to ensure immediate reflection of uploads and deletions without manual refresh
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return sendJson(res, 200, {
      folder: normalizedFolder,
      count: photos.length,
      photos,
    });
  } catch (err) {
    console.error('[Cloudflare R2] List photos error:', err);
    return sendJson(res, 200, {
      folder: normalizedFolder,
      count: 0,
      photos: [],
      warning: err?.message || 'Failed listing R2 bucket',
    });
  }
}
