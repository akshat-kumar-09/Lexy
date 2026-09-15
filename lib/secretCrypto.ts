import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "v1:";
const SALT = "lexy-openai-key-v1";

function deriveKey(): Buffer | null {
  const secret = process.env.OPENAI_KEY_ENCRYPTION_SECRET?.trim();
  if (!secret) return null;
  return scryptSync(secret, SALT, 32);
}

/** Encrypt an OpenAI key for Postgres storage. Falls back to plaintext when secret unset (local dev). */
export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  if (!key) return plaintext;

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

/** Decrypt a stored key. Plaintext legacy rows pass through unchanged. */
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;

  const key = deriveKey();
  if (!key) {
    throw new Error("OPENAI_KEY_ENCRYPTION_SECRET is required to read encrypted keys");
  }

  const buf = Buffer.from(stored.slice(PREFIX.length), "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
