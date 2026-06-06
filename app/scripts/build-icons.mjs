#!/usr/bin/env node
/**
 * Pordee icon pipeline (Phase 1).
 *
 * Reads the shipped production logo mark and emits the sized rasters that
 * `manifest.webmanifest`, apple-touch-icon, and the favicon need.
 *
 * Source:  ../public/logo/direct/pordee-logo-mark-direct-01.png
 * Output:  ../public/logo/pordee-pd-logo.png
 *          ../public/brand/icon-{32,180,192,512}.png
 *          ../public/brand/icon-maskable-512.png
 *          ../public/favicon.ico
 *
 * The source image is the approved direct production logo mark. PWA and apple
 * touch icons are emitted as sky-background tiles, while the favicon stays a
 * transparent multi-size browser icon.
 */
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(
  here,
  "..",
  "public",
  "logo",
  "direct",
  "pordee-logo-mark-direct-01.png"
);
const SOURCE_PNG = resolve(here, "..", "public", "logo", "pordee-pd-logo.png");
const OUT_BRAND = resolve(here, "..", "public", "brand");
const OUT_FAVICON = resolve(here, "..", "public", "favicon.ico");

const appIconSizes = [32, 180, 192, 512];
const appIconBackground = "#EAF7FF";
const sourceSize = 1254;

async function emitSourcePng() {
  await sharp(SOURCE)
    .resize(sourceSize, sourceSize, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(SOURCE_PNG);
  console.log(`  • ${SOURCE_PNG}`);
}

async function emitAppIconSizes() {
  for (const size of appIconSizes) {
    const out = resolve(OUT_BRAND, `icon-${size}.png`);
    await (await createIconTile(size, 0.76))
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`  • ${out}`);
  }
}

async function emitMaskable() {
  const out = resolve(OUT_BRAND, "icon-maskable-512.png");
  await (await createIconTile(512, 0.62))
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`  • ${out}`);
}

async function createIconTile(size, markScale) {
  const markSize = Math.round(size * markScale);
  const mark = await sharp(SOURCE_PNG)
    .resize(markSize, markSize, { fit: "inside" })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: appIconBackground,
    },
  }).composite([{ input: mark, gravity: "center" }]);
}

async function emitFavicon() {
  // 16/32/48 inside a single .ico for crisp browser-tab rendering.
  const buffers = await Promise.all(
    [16, 32, 48].map((size) =>
      sharp(SOURCE_PNG).resize(size, size, { fit: "cover" }).png().toBuffer()
    )
  );
  const ico = await pngToIco(buffers);
  await writeFile(OUT_FAVICON, ico);
  console.log(`  • ${OUT_FAVICON}`);
}

async function main() {
  await mkdir(OUT_BRAND, { recursive: true });
  console.log("Generating Pordee icons from", SOURCE);
  await emitSourcePng();
  await emitAppIconSizes();
  await emitMaskable();
  await emitFavicon();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
