import crypto from 'node:crypto';

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts = null;
let certsExpiry = 0;

/**
 * Fetches and caches Google's public x509 certificates used for verifying Firebase ID tokens.
 */
export async function getGooglePublicCerts() {
  const now = Date.now();
  if (cachedCerts && now < certsExpiry) {
    return cachedCerts;
  }
  const response = await fetch(GOOGLE_CERTS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Google public certs: ${response.status}`);
  }
  cachedCerts = await response.json();
  // Cache for 6 hours
  certsExpiry = now + 6 * 60 * 60 * 1000;
  return cachedCerts;
}

export const DEFAULT_ALLOWED_COUPLE_EMAILS = [
  'hers.jit@gmail.com',
  'his.saini.gulu@gmail.com',
  'jithazra00@gmail.com',
  'sainipaul000@gmail.com',
];

/**
 * Returns the unified couple whitelist (defaults + environment variables).
 */
export function getAllowedEmails() {
  const envEmails = [
    ...(process.env.ALLOWED_EMAILS ? process.env.ALLOWED_EMAILS.split(',') : []),
    ...(process.env.VITE_ALLOWED_EMAILS ? process.env.VITE_ALLOWED_EMAILS.split(',') : []),
  ];
  const all = [...DEFAULT_ALLOWED_COUPLE_EMAILS, ...envEmails]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(all));
}

/**
 * Verifies the incoming Authorization Bearer token:
 * 1. Checks structure and header (RS256)
 * 2. Validates project ID (aud) and Google issuer (iss)
 * 3. Validates expiration (exp)
 * 4. Verifies RSA-SHA256 signature against Google's public certs
 * 5. Strictly checks email against the couple whitelist
 */
export async function verifyAuthorization(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      statusCode: 401,
      error: 'Unauthorized: Missing or invalid Authorization Bearer token header.',
    };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return {
      authorized: false,
      statusCode: 401,
      error: 'Unauthorized: Empty Bearer token.',
    };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return {
      authorized: false,
      statusCode: 401,
      error: 'Unauthorized: Invalid JWT token format.',
    };
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  let header, payload;
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return {
      authorized: false,
      statusCode: 401,
      error: 'Unauthorized: Unable to parse token payload.',
    };
  }

  if (header.alg !== 'RS256' || !header.kid) {
    return {
      authorized: false,
      statusCode: 401,
      error: 'Unauthorized: Invalid JWT algorithm or missing kid.',
    };
  }

  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    'saini-verse';

  if (payload.aud !== projectId) {
    return {
      authorized: false,
      statusCode: 401,
      error: `Unauthorized: Token audience (${payload.aud}) does not match project ID.`,
    };
  }

  const expectedIssuer = `https://securetoken.google.com/${projectId}`;
  if (payload.iss !== expectedIssuer) {
    return {
      authorized: false,
      statusCode: 401,
      error: `Unauthorized: Token issuer (${payload.iss}) does not match expected issuer.`,
    };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowSec) {
    return {
      authorized: false,
      statusCode: 401,
      error: 'Unauthorized: Firebase ID token has expired.',
    };
  }

  // Verify RSA-SHA256 signature
  try {
    const certs = await getGooglePublicCerts();
    const cert = certs[header.kid];
    if (!cert) {
      return {
        authorized: false,
        statusCode: 401,
        error: `Unauthorized: Unknown key identifier (kid: ${header.kid}).`,
      };
    }

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    const sigBuffer = Buffer.from(signatureB64, 'base64url');
    const isValidSig = verifier.verify(cert, sigBuffer);

    if (!isValidSig) {
      return {
        authorized: false,
        statusCode: 401,
        error: 'Unauthorized: Token signature verification failed.',
      };
    }
  } catch (err) {
    console.error('[_auth.js] Cryptographic token verification error:', err);
    return {
      authorized: false,
      statusCode: 401,
      error: 'Unauthorized: Cryptographic signature verification failed.',
    };
  }

  // Verify email matches allowed couple whitelist
  const allowed = getAllowedEmails();
  const userEmail = (payload.email || '').trim().toLowerCase();

  if (!userEmail || !allowed.includes(userEmail)) {
    return {
      authorized: false,
      statusCode: 403,
      error: `Forbidden: Email '${userEmail || 'unknown'}' is not authorized to access private vault resources.`,
    };
  }

  return {
    authorized: true,
    user: {
      uid: payload.sub,
      email: userEmail,
    },
  };
}
