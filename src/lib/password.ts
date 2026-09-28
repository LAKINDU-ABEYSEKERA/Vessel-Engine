import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
}

/**
 * Minimum policy for the MVP: 8+ chars, at least one letter and one number.
 * Returns null on success, error message on failure.
 */
export function validatePassword(password: string): string | null {
    if (password.length < 8) {
        return 'Password must be at least 8 characters.';
    }
    if (password.length > 128) {
        return 'Password must be at most 128 characters.';
    }
    if (!/[a-zA-Z]/.test(password)) {
        return 'Password must contain at least one letter.';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least one number.';
    }
    return null;
}