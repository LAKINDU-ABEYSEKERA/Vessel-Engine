import { randomBytes, createHash } from 'crypto';

const TOKEN_BYTES = 32;
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * The raw token goes in the email. We store only its SHA-256 hash in the DB
 * so a database leak can't be used to reset anyone's password.
 */
export function generateResetToken(): string {
    return randomBytes(TOKEN_BYTES).toString('hex');
}

export function hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}