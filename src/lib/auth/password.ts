// ====================================================================
// ORGANA — Secure Password Hashing & Verification
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password using bcrypt
 */
export async function hashPassword(plainText: string): Promise<string> {
  if (!plainText) return '';
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

/**
 * Verify a plain text password against a hash or legacy password
 */
export async function verifyPassword(plainText: string, storedHashOrPassword?: string | null): Promise<boolean> {
  if (!plainText || !storedHashOrPassword) return false;

  // If it's a bcrypt hash (starts with $2a$ or $2b$ or $2y$)
  if (storedHashOrPassword.startsWith('$2')) {
    try {
      return await bcrypt.compare(plainText, storedHashOrPassword);
    } catch {
      return false;
    }
  }

  // Fallback for legacy plain text passwords during transition
  return plainText === storedHashOrPassword;
}
