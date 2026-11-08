/**
 * Generates the PWA icons from public/logo.png.
 *
 * Run with: node scripts/generate-icons.mjs
 * The generated files are committed so production builds do not need sharp.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SOURCE = "public/logo.png";
const OUT = "public/icons";
const BRAND = "#235823";

await mkdir(OUT, { recursive: true });

// Standard icons: transparent background, logo fills the square.
for (const size of [192, 512]) {
  await sharp(SOURCE)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(`${OUT}/icon-${size}.png`);
}

// Maskable icon: brand background with the logo inside the 80% safe zone.
const inset = Math.round(512 * 0.16);
const inner = 512 - inset * 2;
await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: BRAND,
  },
})
  .composite([
    {
      input: await sharp(SOURCE)
        .resize(inner, inner, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer(),
      top: inset,
      left: inset,
    },
  ])
  .png()
  .toFile(`${OUT}/icon-maskable-512.png`);

// iOS ignores transparent icons, so flatten onto the brand colour.
await sharp(SOURCE)
  .resize(180, 180, { fit: "contain", background: BRAND })
  .flatten({ background: BRAND })
  .png()
  .toFile(`${OUT}/apple-touch-icon.png`);

// eslint-disable-next-line no-console
console.log(`Wrote PWA icons to ${OUT}`);
