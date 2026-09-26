import { S3Client } from '@aws-sdk/client-s3';

if (!process.env.S3_REGION) {
    throw new Error('Missing S3_REGION in environment variables.');
}
if (!process.env.S3_ENDPOINT) {
    throw new Error('Missing S3_ENDPOINT in environment variables.');
}
if (!process.env.S3_ACCESS_KEY_ID) {
    throw new Error('Missing S3_ACCESS_KEY_ID in environment variables.');
}
if (!process.env.S3_SECRET_ACCESS_KEY) {
    throw new Error('Missing S3_SECRET_ACCESS_KEY in environment variables.');
}
if (!process.env.S3_BUCKET_NAME) {
    throw new Error('Missing S3_BUCKET_NAME in environment variables.');
}
if (!process.env.NEXT_PUBLIC_S3_PUBLIC_URL) {
    throw new Error('Missing NEXT_PUBLIC_S3_PUBLIC_URL in environment variables.');
}

export const S3_BUCKET = process.env.S3_BUCKET_NAME;
export const S3_PUBLIC_URL = process.env.NEXT_PUBLIC_S3_PUBLIC_URL.replace(/\/$/, '');

export const s3 = new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
});