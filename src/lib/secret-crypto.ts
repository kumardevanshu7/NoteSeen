const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return [...view].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function randomSaltHex(bytes = 16): string {
  const salt = crypto.getRandomValues(new Uint8Array(bytes));
  return bytesToHex(salt);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(digest);
}

/** Hash for verifying the PIN without keeping it around. */
export async function hashSecretPin(pin: string, saltHex: string): Promise<string> {
  return sha256Hex(`${saltHex}:${pin}`);
}

export async function verifySecretPin(
  pin: string,
  saltHex: string,
  expectedHash: string,
): Promise<boolean> {
  if (!isValidPin(pin)) return false;
  const hash = await hashSecretPin(pin, saltHex);
  return hash === expectedHash;
}

async function deriveAesKey(pin: string, saltHex: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: hexToBytes(saltHex) as BufferSource,
      iterations: 120_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptSecretValue(
  plain: string,
  pin: string,
  saltHex: string,
): Promise<{ cipherHex: string; ivHex: string }> {
  const key = await deriveAesKey(pin, saltHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plain),
  );
  return { cipherHex: bytesToHex(cipher), ivHex: bytesToHex(iv) };
}

export async function decryptSecretValue(
  cipherHex: string,
  ivHex: string,
  pin: string,
  saltHex: string,
): Promise<string> {
  const key = await deriveAesKey(pin, saltHex);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: hexToBytes(ivHex) as BufferSource },
    key,
    hexToBytes(cipherHex) as BufferSource,
  );
  return decoder.decode(plain);
}
