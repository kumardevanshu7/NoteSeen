const encoder = new TextEncoder();

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomVaultSaltHex(bytes = 16): string {
  const salt = crypto.getRandomValues(new Uint8Array(bytes));
  return bytesToHex(salt.buffer);
}

/** Normalize answers so " Dog " and "dog" match. */
export function normalizeVaultAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Hash vault answer. If saltHex is provided, uses `${saltHex}:${normalizedAnswer}`.
 * If omitted, hashes normalizedAnswer directly (for backwards compatibility).
 */
export async function hashVaultAnswer(answer: string, saltHex?: string): Promise<string> {
  const normalized = normalizeVaultAnswer(answer);
  const input = saltHex ? `${saltHex}:${normalized}` : normalized;
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return bytesToHex(digest);
}

/**
 * Verifies vault answer against expected hash. Supports both salted and legacy unsalted hashes.
 */
export async function verifyVaultAnswer(
  answer: string,
  expectedHash: string,
  saltHex?: string,
): Promise<boolean> {
  if (saltHex) {
    const hash = await hashVaultAnswer(answer, saltHex);
    return hash === expectedHash;
  }
  const hash = await hashVaultAnswer(answer);
  return hash === expectedHash;
}
