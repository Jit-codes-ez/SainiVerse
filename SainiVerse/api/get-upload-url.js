import crypto from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
 * Serverless Endpoint: Presigned Upload URL Generator
 * Generates a short-lived (60s) PUT URL for direct client-to-R2 uploads into partitioned folders.
 *
 * Method: POST
 * Headers: Authorization: Bearer <FirebaseIdToken>
 * Body: { folder: 'Public_Memory' | 'Private_Memory', filename: string, contentType?: string }
 * Response: { uploadUrl: string, key: string, uniqueId: string }
 */
export default async function handler(req, res) {
  // 1. Only accept POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  // 2. Strict Authorization Check: Require valid Firebase session token from couple whitelist
  const authResult = await verifyAuthorization(req);
  if (!authResult.authorized) {
    return sendJson(res, authResult.statusCode || 401, {
      error: authResult.error || 'Unauthorized: Valid Firebase session token required.',
    });
  }

  try {
    // 3. Extract and parse request body
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { folder, filename, contentType = 'image/jpeg' } = body || {};

    // 4. Validate folder strictly ('Public_Memories'/'Public_Memory', 'Private_Memories'/'Private_Memory', or 'Music')
    const allowedFolders = ['Public_Memories', 'Public_Memory', 'Private_Memories', 'Private_Memory', 'Music'];
    if (!allowedFolders.includes(folder)) {
      return sendJson(res, 400, {
        error: 'Bad Request: "folder" must be "Public_Memories", "Private_Memories", or "Music".',
      });
    }

    // 5. Validate filename
    if (!filename || typeof filename !== 'string' || !filename.trim()) {
      return sendJson(res, 400, {
        error: 'Bad Request: "filename" is required.',
      });
    }

    // 6. Generate collision-resistant unique R2 Key
    const uniqueId = crypto.randomUUID();
    const cleanName = filename.trim().replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${folder}/${uniqueId}_${cleanName}`;

    // 7. Create PutObjectCommand with bucket saini-verse and the computed key
    const targetBucket = BUCKET_NAME || 'saini-verse';
    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
      ContentType: contentType,
    });

    // 8. Presign with 60-second expiration
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 60 });

    // 9. Return JSON response
    return sendJson(res, 200, { uploadUrl, key, uniqueId });
  } catch (error) {
    console.error('Error generating presigned upload URL for Cloudflare R2:', error);
    return sendJson(res, 500, {
      error: 'Internal Server Error',
      message: error.message,
    });
  }
}
