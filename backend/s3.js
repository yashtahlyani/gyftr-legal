// s3.js — draft file storage (replaces the Supabase Storage `legal-drafts` bucket)
//
// The bucket is private (no public access). The old code pattern was:
//   supabase.storage.from('legal-drafts').upload(path, file)
//   supabase.storage.from('legal-drafts').createSignedUrl(path, 3600)
// which becomes: upload the buffer directly (PutObject), and hand back a
// presigned GET URL valid for 1 hour — same shape, same 3600s expiry.

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = process.env.DRAFTS_BUCKET;
const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });

export async function uploadDraftFile(key, buffer, contentType) {
  if (!BUCKET) throw new Error('DRAFTS_BUCKET env var is not set');
  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: contentType || 'application/octet-stream',
  }));
  return key;
}

export async function getDraftSignedUrl(key, expiresInSeconds = 3600) {
  if (!BUCKET) throw new Error('DRAFTS_BUCKET env var is not set');
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}
