import { S3Client } from '@aws-sdk/client-s3';

// In local Node environments, load environment variables from .env.local if not already defined
if (!process.env.R2_ACCOUNT_ID && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env.local');
  } catch {
    // Ignore error if running in an environment without .env.local
  }
}

/**
 * Shared Cloudflare R2 S3 Client
 * Initialized with credentials and S3-compatible R2 endpoint
 */
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export const s3Client = r2Client; // Alias for flexibility
export const BUCKET_NAME = process.env.R2_BUCKET_NAME || '';

export default r2Client;
