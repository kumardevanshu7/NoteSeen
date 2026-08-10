/**
 * Turn near-black baked backgrounds into real alpha on UI logo marks.
 * OS / maskable icons (android-chrome-*) intentionally keep a solid fill.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

async function knockout(input, output, threshold = 28) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 8) continue;
    if (r <= threshold && g <= threshold && b <= threshold) {
      data[i + 3] = 0;
      continue;
    }
    const maxc = Math.max(r, g, b);
    if (maxc < threshold * 2.2) {
      const t = (maxc - threshold) / (threshold * 1.2);
      const fade = Math.max(0, Math.min(1, t));
      data[i + 3] = Math.round(a * fade);
    }
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(output);
  console.log("wrote", path.relative(root, output));
}

const noteSrc = path.join(root, "noteseen-mark.png");
const ariSrc = existsSync(path.join(root, "arigato-single-logo.png"))
  ? path.join(root, "arigato-single-logo.png")
  : path.join(root, "arigato-mark.png");

await knockout(noteSrc, path.join(root, "noteseen-mark.png"));
await knockout(ariSrc, path.join(root, "arigato-mark.png"));
