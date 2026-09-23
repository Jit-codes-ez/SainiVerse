import { GoogleGenAI } from '@google/genai';

// In local Node environments, ensure .env.local is loaded if not already in process.env
if (!process.env.GEMINI_API_KEY && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env.local');
  } catch {
    // Ignore if running in production without .env.local file
  }
}

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
 * Serverless Gemini Vision Caption Generator
 *
 * Method: POST
 * Body: { imageBase64: string, mimeType?: string }
 * Response: { suggestions: string[] }
 */
export default async function handler(req, res) {
  // 1. Only accept POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method Not Allowed. Use POST.' });
  }

  try {
    // 2. Extract and validate imageBase64 and mimeType
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { imageBase64, mimeType } = body || {};

    if (!imageBase64) {
      return sendJson(res, 400, {
        error: 'Bad Request: "imageBase64" is required in request body.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not configured in environment or .env.local');
      return sendJson(res, 500, {
        error: 'Server configuration error: GEMINI_API_KEY is missing.',
      });
    }

    // Strip data URL scheme prefix if present (e.g., 'data:image/jpeg;base64,')
    const cleanedBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '').trim();
    const cleanMimeType = mimeType || 'image/jpeg';

    const promptText = `
You are an expert visual descriptive caption generator and bilingual curator.

Task:
Inspect the provided image and generate exactly 4 ultra-short, context-accurate captions directly anchored to visible visual details (clothing, exact colors, setting, mood, or objects).

Caption Styles (One of each):
1. Visual Breakdown: Short phrase noting the core visual subject, outfit, or color.
2. Conceptual Vibe: A snappy reflection on the atmosphere or mood of the scene.
3. Sassy / Creative: A playful, stylish one-liner matching the exact activity or pose.
4. Poetic Bengali Expression: A short line in Bengali script (বাংলা) followed by a short English translation in parentheses.

Strict Length & Grounding Rules:
- LENGTH: 5 to 6 words preferred. Maximum 10 words total per caption.
- Base every caption strictly on what is physically visible in the image.
- Include 1 to 2 fitting emojis at the end of each caption.
- Do NOT mention names like "Jit", "Saini", or "SainiVerse" unless visibly printed in the image.
- Do NOT force couple/romantic lines onto non-romantic images (logos, objects, slides, scenery).
- Return ONLY a valid JSON array of 4 strings. No markdown fences, backticks, or extra text.

Example Output:
[
  "Classic red saree, timeless grace. ✨",
  "Warm daylight and golden hour charm. ☀️💛",
  "Effortless elegance in every single frame. 💃✨",
  "এক চিলতে মিষ্টি হাসি আর আলো। (A sweet smile and gentle light.) 🌸"
]`

    const ai = new GoogleGenAI({ apiKey });

    // Primary model: gemini-3.5-flash-lite with fallback to gemini-2.5-flash
    let response;
    const contents = [
      {
        inlineData: {
          mimeType: cleanMimeType,
          data: cleanedBase64,
        },
      },
      {
        text: promptText,
      },
    ];

    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      });
    } catch (primaryErr) {
      console.warn('gemini-3.5-flash-lite failed, attempting fallback to gemini-2.5-flash:', primaryErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      });
    }

    const rawOutput = response?.text?.trim() || '';
    const cleanedJsonText = rawOutput
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let suggestions = [];
    try {
      const parsed = JSON.parse(cleanedJsonText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        suggestions = parsed.map((item) => (typeof item === 'string' ? item.trim() : String(item)));
      }
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output:', cleanedJsonText, parseErr);
      throw new Error('Gemini response could not be parsed as a valid caption array.');
    }

    if (!suggestions || suggestions.length === 0) {
      throw new Error('Gemini returned an empty caption suggestions list.');
    }

    return sendJson(res, 200, { suggestions });
  } catch (error) {
    console.error('Gemini Caption Suggestion API Error:', error);
    return sendJson(res, 500, {
      error: error?.message || 'Failed to generate AI captions with Gemini.',
    });
  }
}