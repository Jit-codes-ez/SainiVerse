import { GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { r2Client, BUCKET_NAME } from './_r2.js';

let cachedMusicKey = null;

/**
 * Serverless Endpoint: Navbar Music Streaming
 * Streams the couple's romantic background music uploaded to Cloudflare R2
 * under the `Navbar_Music/` folder with HTTP Range streaming support.
 *
 * Method: GET, HEAD
 * Endpoint: /api/get-music
 * Optional Query: ?info=true (returns track metadata in JSON)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    if (typeof res.status === 'function') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  try {
    // 1. Check if a specific track key is requested (e.g. ?key=Music/uuid_song.mp3)
    let requestedKey = req.query?.key;
    if (!requestedKey && req.url) {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        requestedKey = parsedUrl.searchParams.get('key');
      } catch {
        // ignore
      }
    }

    let musicKey = null;

    if (requestedKey) {
      requestedKey = decodeURIComponent(requestedKey).trim();
      musicKey = requestedKey;
    } else {
      // Stream navbar background music from Navbar_Music/ folder
      try {
        const listCommand = new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: 'Navbar_Music/',
          MaxKeys: 20,
        });
        const listData = await r2Client.send(listCommand);
        const musicObj = listData.Contents?.find(
          (item) => item.Key && /\.(mp3|m4a|wav|ogg|flac|aac)$/i.test(item.Key) && item.Size > 0
        );

        if (musicObj?.Key) {
          musicKey = musicObj.Key;
        }
      } catch (listErr) {
        console.warn('Could not list Navbar_Music/ folder:', listErr.message);
      }

      if (!musicKey) {
        // Fallback default key in Navbar_Music
        musicKey = 'Navbar_Music/Bhalobashar_Morshum.mp3';
      }
    }

    // 2. Return metadata if ?info=true is requested
    const url = new URL(req.url, 'http://localhost');
    if (url.searchParams.get('info') === 'true' || req.query?.info === 'true') {
      const cleanTitle = musicKey
        .replace(/^(Navbar_Music|Music)\//, '')
        .replace(/\.[^/.]+$/, '')
        .replace(/\s*\[.*?\]$/, '')
        .replace(/_/g, ' ')
        .trim();

      const infoData = {
        key: musicKey,
        title: cleanTitle || 'Bhalobashar Morshum (ভালবাসার মরশুম)',
        folder: musicKey.startsWith('Navbar_Music') ? 'Navbar_Music' : 'Music',
        streamUrl: '/api/get-music',
      };

      if (typeof res.status === 'function') {
        return res.status(200).json(infoData);
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
    }

    // 3. Support HTTP Range requests (crucial for smooth audio seeking and playback)
    const rangeHeader = req.headers?.range;
    const commandInput = {
      Bucket: BUCKET_NAME,
      Key: musicKey,
    };

    if (rangeHeader) {
      commandInput.Range = rangeHeader;
    }

    const data = await r2Client.send(new GetObjectCommand(commandInput));

    // 4. Set streaming headers
    res.setHeader('Content-Type', data.ContentType || 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');

    if (data.ContentRange) {
      res.statusCode = 206;
      res.setHeader('Content-Range', data.ContentRange);
    } else {
      res.statusCode = 200;
    }

    if (data.ContentLength) {
      res.setHeader('Content-Length', data.ContentLength);
    }

    // 5. Handle HEAD requests (headers only)
    if (req.method === 'HEAD') {
      return res.end();
    }

    // 6. Stream audio bytes directly to the client
    if (data.Body && typeof data.Body.pipe === 'function') {
      data.Body.on('error', (streamErr) => {
        console.error('Audio streaming error from R2:', streamErr);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end();
        }
      });

      return data.Body.pipe(res);
    } else if (data.Body) {
      const byteArray = await data.Body.transformToByteArray();
      return res.end(Buffer.from(byteArray));
    }

    res.statusCode = 404;
    return res.end();
  } catch (error) {
    console.error('Error in /api/get-music:', error);

    const isNotFound =
      error.name === 'NoSuchKey' ||
      error.Code === 'NoSuchKey' ||
      error.$metadata?.httpStatusCode === 404;

    if (isNotFound) {
      const notFoundPayload = { error: 'Music file not found in R2 bucket.' };
      if (typeof res.status === 'function') {
        return res.status(404).json(notFoundPayload);
      }
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(notFoundPayload));
    }

    const errorPayload = { error: 'Internal Server Error', message: error.message };
    if (typeof res.status === 'function') {
      return res.status(500).json(errorPayload);
    }
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(errorPayload));
  }
}
