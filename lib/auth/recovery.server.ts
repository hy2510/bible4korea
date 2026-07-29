import "server-only";

import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { normalizeRecoveryAnswer } from "@/lib/auth/credentials";

const SCRYPT_KEY_LENGTH = 64;

function scrypt(value: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(value, salt, SCRYPT_KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}

export async function hashRecoveryAnswer(answer: string): Promise<{
  salt: string;
  hash: string;
}> {
  const salt = randomBytes(16);
  const hash = await scrypt(normalizeRecoveryAnswer(answer), salt);
  return {
    salt: salt.toString("base64"),
    hash: hash.toString("base64"),
  };
}

export async function verifyRecoveryAnswer(
  answer: string,
  encodedSalt: string,
  encodedHash: string,
): Promise<boolean> {
  try {
    const expected = Buffer.from(encodedHash, "base64");
    const actual = await scrypt(
      normalizeRecoveryAnswer(answer),
      Buffer.from(encodedSalt, "base64"),
    );
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function hashClientAddress(address: string): string {
  const secret =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "local-development-only";
  return createHmac("sha256", secret).update(address).digest("hex");
}

