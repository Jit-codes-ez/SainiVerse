import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, BUCKET_NAME } from './_r2.js';
import { verifyAuthorization } from './_auth.js';

/**
 * Serverless Endpoint: Partitioned Image Streaming from Cloudflare R2
 * Supports both Public_Memory/ and Private_Memory/ folders in the saini-verse bucket.
 *
 * Security Model:
 * 1. Private_Memory/ photos strictly require valid Firebase ID token & couple whitelist (401/403)
 * 2. Public_Memory/ photos allow public streaming (or authorized streaming if token provided)
 * 3. Never exposes raw bucket credentials or storage URLs
 * 4. Sets zero-cache response headers for private photos
 *
 * Method: GET
 * Query: ?key=<object-key>
 */
export default async function handler(req, res) {
  // 1. Only accept GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    if (typeof res.status === 'function') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  // 2. Extract key from req.query (with fallback to URL search params if needed)
  let key = req.query?.key;
  if (!key && req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      key = parsedUrl.searchParams.get('key');
    } catch {
      // Ignore URL parsing fallback failure
    }
  }

  if (!key) {
    const errorMsg = 'Bad Request: "key" query parameter is required.';
    if (typeof res.status === 'function') {
      return res.status(400).json({ error: errorMsg });
    }
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: errorMsg }));
  }

  // Normalize key
  key = decodeURIComponent(key).trim();

  // 3. Authorization Check
  const isPrivateRequest = key.startsWith('Private_Memory/') || key.startsWith('Private_Memories/');
  const authHeader = req.headers?.authorization || req.headers?.Authorization;

  if (isPrivateRequest || (authHeader && authHeader.startsWith('Bearer '))) {
    const authResult = await verifyAuthorization(req);
    if (!authResult.authorized) {
      // If requesting private photo and auth failed, reject immediately
      if (isPrivateRequest) {
        if (typeof res.status === 'function') {
          return res.status(authResult.statusCode || 401).json({ error: authResult.error });
        }
        res.statusCode = authResult.statusCode || 401;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: authResult.error }));
      }
    }
  }

  // 4. Determine keys to try in Cloudflare R2
  const keysToTry = [key];
  const isKeyPrefixed =
    key.startsWith('Public_Memory/') ||
    key.startsWith('Public_Memories/') ||
    key.startsWith('Private_Memory/') ||
    key.startsWith('Private_Memories/') ||
    key.startsWith('Memories/');

  if (!isKeyPrefixed) {
    keysToTry.push(`Public_Memories/${key}`);
    keysToTry.push(`Public_Memory/${key}`);
    keysToTry.push(`Private_Memories/${key}`);
    keysToTry.push(`Private_Memory/${key}`);
    keysToTry.push(`Memories/${key}`);
  } else if (key.startsWith('Memories/')) {
    keysToTry.push(key.replace(/^Memories\//i, ''));
  }

  let data = null;
  let lastError = null;
  let matchedKey = null;

  const targetBucket = BUCKET_NAME || 'saini-verse';

  for (const tryKey of keysToTry) {
    // If the matched key turns out to be in Private folder and caller isn't authorized, block it
    if (tryKey.startsWith('Private_Memory/') || tryKey.startsWith('Private_Memories/')) {
      const authResult = await verifyAuthorization(req);
      if (!authResult.authorized) {
        continue; // Skip trying private key if unauthenticated
      }
    }

    try {
      const command = new GetObjectCommand({
        Bucket: targetBucket,
        Key: tryKey,
      });
      data = await r2Client.send(command);
      if (data) {
        matchedKey = tryKey;
        break;
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (!data) {
    console.error('Error fetching photo from Cloudflare R2:', lastError?.message || lastError);
    const isNotFound =
      lastError?.name === 'NoSuchKey' ||
      lastError?.Code === 'NoSuchKey' ||
      lastError?.$metadata?.httpStatusCode === 404;

    if (isNotFound) {
      const notFoundMsg = 'Photo not found in vault.';
      if (typeof res.status === 'function') {
        return res.status(404).json({ error: notFoundMsg });
      }
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: notFoundMsg }));
    }

    if (typeof res.status === 'function') {
      return res.status(500).json({ error: 'Internal Server Error', message: lastError?.message });
    }
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Internal Server Error', message: lastError?.message }));
  }

  try {
    // 5. Response headers
    res.setHeader('Content-Type', data.ContentType || 'image/jpeg');

    if (matchedKey && matchedKey.startsWith('Private_Memory/')) {
      res.setHeader('Cache-Control', 'private, no-store, no-cache, max-age=0, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200');
    }

    res.setHeader('Content-Disposition', 'inline');

    if (data.ContentLength) {
      res.setHeader('Content-Length', data.ContentLength);
    }

    // 6. Pipe binary stream directly to client
    if (data.Body && typeof data.Body.pipe === 'function') {
      data.Body.on('error', (streamErr) => {
        console.error('Stream error while piping photo from R2:', streamErr);
        if (!res.headersSent) {
          if (typeof res.status === 'function') {
            res.status(500).json({ error: 'Error streaming photo from storage.' });
          } else {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Error streaming photo from storage.' }));
          }
        }
      });

      return data.Body.pipe(res);
    } else {
      // Fallback for non-stream bodies (e.g. byte array / buffer)
      const bytes = await data.Body.transformToByteArray();
      return res.end(Buffer.from(bytes));
    }
  } catch (error) {
    console.error('Error streaming photo from Cloudflare R2:', error);
    if (!res.headersSent) {
      if (typeof res.status === 'function') {
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
      }
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Internal Server Error', message: error.message }));
    }
  }
}
