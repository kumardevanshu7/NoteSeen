const encoder = new TextEncoder();

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Normalize answers so " Dog " and "dog" match. */
export function normalizeVaultAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function hashVaultAnswer(answer: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(normalizeVaultAnswer(answer)));
  return bytesToHex(digest);
}

export async function verifyVaultAnswer(answer: string, expectedHash: string): Promise<boolean> {
  const hash = await hashVaultAnswer(answer);
  return hash === expectedHash;
}
