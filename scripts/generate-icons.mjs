import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "icons",
);

/**
 * `inset` controls how much breathing room the glyph gets. Maskable icons are
 * cropped to a circle by some launchers, so they need a much larger margin.
 */
function iconSvg({ size, inset, radius }) {
  const glyph = size - inset * 2;
  const scale = glyph / 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#17171c" />
  <g transform="translate(${inset} ${inset}) scale(${scale})" fill="none" stroke="#ffffff"
     stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 27V6.5A2.5 2.5 0 0 1 7.5 4H19l8 8v15" />
    <path d="M5 27h22" />
    <path d="M10.5 15.5h11M10.5 20.5h7" />
  </g>
</svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192, inset: 26, radius: 42 },
  { file: "icon-512.png", size: 512, inset: 70, radius: 112 },
  { file: "maskable-512.png", size: 512, inset: 128, radius: 0 },
];

await mkdir(outDir, { recursive: true });

for (const target of targets) {
  const svg = iconSvg(target);
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(path.join(outDir, target.file), png);
  console.log(`wrote icons/${target.file}`);
}
