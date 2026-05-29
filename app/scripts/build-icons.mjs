#!/usr/bin/env node
/**
 * Pordee icon pipeline (Phase 1).
 *
 * Reads the selected semi-flat PD mark and emits the sized rasters that
 * `manifest.webmanifest`, apple-touch-icon, and the favicon need.
 *
 * Source:  ../../assets/logo/pordee-pd-logo-semiflat-v1.png  (1254x1254, opaque sky bg)
 * Output:  ../public/brand/icon-{32,180,192,512}.png
 *          ../public/brand/icon-maskable-512.png
 *          ../public/favicon.ico
 *
 * The source PNG already includes the sky `#EAF7FF` tile, so straight resizes
 * preserve the brand-correct background. The maskable variant additionally
 * pads the mark into the inner safe zone (~80% of the icon) so launchers can
 * crop the outer ring without clipping the loop.
 */
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const SOURCE = resolve(repoRoot, "assets/logo/pordee-pd-logo-semiflat-v1.png");
const OUT_BRAND = resolve(here, "..", "public", "brand");
const OUT_FAVICON = resolve(here, "..", "public", "favicon.ico");

const SKY = { r: 0xea, g: 0xf7, b: 0xff, alpha: 1 };

const sizes = [32, 180, 192, 512];

async function emitFlatSizes() {
  for (const size of sizes) {
    const out = resolve(OUT_BRAND, `icon-${size}.png`);
    await sharp(SOURCE)
      .resize(size, size, { fit: "cover" })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`  • ${out}`);
  }
}

async function emitMaskable() {
  const total = 512;
  const inner = Math.round(total * 0.8);
  const offset = Math.round((total - inner) / 2);
  const mark = await sharp(SOURCE)
    .resize(inner, inner, { fit: "cover" })
    .toBuffer();
  const out = resolve(OUT_BRAND, "icon-maskable-512.png");
  await sharp({
    create: {
      width: total,
      height: total,
      channels: 4,
      background: SKY,
    },
  })
    .composite([{ input: mark, left: offset, top: offset }])
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`  • ${out}`);
}

async function emitFavicon() {
  // 16/32/48 inside a single .ico for crisp browser-tab rendering.
  const buffers = await Promise.all(
    [16, 32, 48].map((size) =>
      sharp(SOURCE).resize(size, size, { fit: "cover" }).png().toBuffer()
    )
  );
  const ico = await pngToIco(buffers);
  await writeFile(OUT_FAVICON, ico);
  console.log(`  • ${OUT_FAVICON}`);
}

async function main() {
  await mkdir(OUT_BRAND, { recursive: true });
  console.log("Generating Pordee icons from", SOURCE);
  await emitFlatSizes();
  await emitMaskable();
  await emitFavicon();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
