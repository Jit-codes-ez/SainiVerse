import { DeleteObjectCommand } from '@aws-sdk/client-s3';
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
 * Serverless Endpoint: Delete Object from Cloudflare R2
 * Supports deleting images from Public_Memories/ & Private_Memories/ and songs from Music/.
 * Strictly forbids deleting from Navbar_Music/ to protect the romantic anthem.
 *
 * Method: POST or DELETE
 * Headers: Authorization: Bearer <FirebaseIdToken> (Recommended/required for private vault)
 * Body or Query: { key: string }
 */
export default async function handler(req, res) {
  // 1. Accept POST or DELETE
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    // 2. Extract key from body or query
    let key = req.query?.key;
    if (!key && req.body) {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }
      key = body?.key;
    }

    if (!key && req.url) {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        key = parsedUrl.searchParams.get('key');
      } catch {
        // Ignore fallback URL parsing
      }
    }

    if (!key || typeof key !== 'string') {
      return sendJson(res, 400, { error: 'Bad Request: "key" parameter is required.' });
    }

    key = decodeURIComponent(key).trim();

    // 3. Security checks: Prevent path traversal and protected folders
    if (key.includes('..') || key.startsWith('/')) {
      return sendJson(res, 400, { error: 'Bad Request: Invalid object key.' });
    }

    if (key.startsWith('Navbar_Music/') || key.startsWith('Navbar_Music')) {
      return sendJson(res, 403, { error: 'Forbidden: Navbar anthem cannot be deleted.' });
    }

    const isAllowedFolder =
      key.startsWith('Public_Memories/') ||
      key.startsWith('Public_Memory/') ||
      key.startsWith('Private_Memories/') ||
      key.startsWith('Private_Memory/') ||
      key.startsWith('Music/');

    if (!isAllowedFolder) {
      return sendJson(res, 403, {
        error: 'Forbidden: Target folder is not eligible for deletion.',
      });
    }

    // 4. Authorization check for private files or if authorization header is provided
    const isPrivate =
      key.startsWith('Private_Memories/') ||
      key.startsWith('Private_Memory/') ||
      key.startsWith('Music/');

    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const authResult = await verifyAuthorization(req);
      if (!authResult.authorized) {
        return sendJson(res, authResult.statusCode || 401, {
          error: authResult.error || 'Unauthorized: Valid Firebase session token required.',
        });
      }
    } else if (isPrivate) {
      // In production, strictly enforce token for private assets. In dev mode, allow testing.
      if (process.env.NODE_ENV === 'production') {
        const authResult = await verifyAuthorization(req);
        if (!authResult.authorized) {
          return sendJson(res, authResult.statusCode || 401, {
            error: authResult.error || 'Unauthorized: Session token required to delete private file.',
          });
        }
      } else {
        console.log(`[api/delete-file] Dev mode: proceeding with deletion of ${key} without token.`);
      }
    }

    // 5. Execute DeleteObjectCommand in Cloudflare R2
    const targetBucket = BUCKET_NAME || 'saini-verse';
    const deleteCmd = new DeleteObjectCommand({
      Bucket: targetBucket,
      Key: key,
    });

    await r2Client.send(deleteCmd);
    console.log(`[api/delete-file] Successfully deleted from Cloudflare R2: ${key}`);

    return sendJson(res, 200, {
      success: true,
      message: 'File deleted from Cloudflare R2',
      key,
    });
  } catch (err) {
    console.error('[api/delete-file] Error deleting object from Cloudflare R2:', err);
    return sendJson(res, 500, {
      error: 'Failed to delete file from Cloudflare R2: ' + (err.message || err),
    });
  }
}
