import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

const scryptAsync = (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });

const KEY_LENGTH = 64;
const DEFAULT_N = 16384;
const DEFAULT_R = 8;
const DEFAULT_P = 1;

function maxmemFor(N: number, r: number): number {
  return 128 * N * r * 2;
}

/**
 * Password hashing with scrypt (node:crypto, maintained, no third-party deps).
 * Format: scrypt$N$r$p$saltB64$keyB64
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scryptAsync(
    password.normalize("NFKC"),
    salt,
    KEY_LENGTH,
    { N: DEFAULT_N, r: DEFAULT_R, p: DEFAULT_P, maxmem: maxmemFor(DEFAULT_N, DEFAULT_R) },
  )) as Buffer;
  return [
    "scrypt",
    DEFAULT_N,
    DEFAULT_R,
    DEFAULT_P,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifyPassword(
  storedHash: string,
  password: string,
): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const saltB64 = parts[4];
  const keyB64 = parts[5];
  if (
    !Number.isInteger(N) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    saltB64 === undefined ||
    keyB64 === undefined
  ) {
    return false;
  }

  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(keyB64, "base64");

  const key = (await scryptAsync(password.normalize("NFKC"), salt, expected.length, {
    N,
    r,
    p,
    maxmem: maxmemFor(N, r),
  })) as Buffer;

  return key.length === expected.length && timingSafeEqual(key, expected);
}
