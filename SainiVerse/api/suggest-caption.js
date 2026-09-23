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
You are an expert visual descriptive caption generator.

Task:
Carefully inspect the image and generate 4 detailed, context-accurate captions based strictly on what is visually depicted.

Output 4 captions following these distinct styles:
1. Detailed Visual Breakdown: 1–2 descriptive sentences accurately detailing the core subject, layout, colors, shapes, symbols, and artistic elements in the image.
2. Conceptual & Metaphorical: An expressive reflection on the deeper meaning, design philosophy, or atmosphere conveyed by the image.
3. Creative & Contextual: A thoughtful caption tailored to the medium (e.g., if it is technical/graphic/branding art, highlight the analytical design and growth symbolism; if it is a photograph, capture the genuine atmosphere).
4. Poetic Bengali Expression: A natural, meaningful Bengali line (in Bengali script) capturing the essence of the visual subject, followed by a soft English translation in parentheses.

Strict Rules:
- Base the descriptions completely on what is actually shown in the image.
- Do NOT mention names like "Jit", "Saini", or "SainiVerse" unless those exact words are visibly written inside the graphic or text of the image.
- Do NOT invent or force romantic relationship narratives if the image is an emblem, graphic, logo, diagram, or object.
- Return ONLY a valid JSON array containing exactly 4 strings without markdown code blocks or backticks.
`;

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