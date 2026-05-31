#!/usr/bin/env node
/**
 * Pordee icon pipeline (Phase 1).
 *
 * Reads the selected Option B PWA icon concept and emits the sized rasters that
 * `manifest.webmanifest`, apple-touch-icon, and the favicon need.
 *
 * Source:  ../../assets/logo/pordee-option-b-pwa-icon-concept.png
 * Output:  ../public/logo/pordee-pd-logo.png
 *          ../public/brand/icon-{32,180,192,512}.png
 *          ../public/brand/icon-maskable-512.png
 *          ../public/favicon.ico
 *
 * The source image is the approved imagegen PWA icon tile. All runtime icon
 * sizes are derived from this same image so app chrome, PWA, and favicon use
 * the same selected logo treatment.
 */
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const SOURCE = resolve(
  repoRoot,
  "assets",
  "logo",
  "pordee-option-b-pwa-icon-concept.png"
);
const SOURCE_PNG = resolve(here, "..", "public", "logo", "pordee-pd-logo.png");
const OUT_BRAND = resolve(here, "..", "public", "brand");
const OUT_FAVICON = resolve(here, "..", "public", "favicon.ico");

const sizes = [32, 180, 192, 512];
const sourceSize = 1254;

async function emitSourcePng() {
  await sharp(SOURCE)
    .resize(sourceSize, sourceSize, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(SOURCE_PNG);
  console.log(`  • ${SOURCE_PNG}`);
}

async function emitFlatSizes() {
  for (const size of sizes) {
    const out = resolve(OUT_BRAND, `icon-${size}.png`);
    await sharp(SOURCE_PNG)
      .resize(size, size, { fit: "cover" })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`  • ${out}`);
  }
}

async function emitMaskable() {
  const out = resolve(OUT_BRAND, "icon-maskable-512.png");
  await sharp(SOURCE_PNG)
    .resize(512, 512, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`  • ${out}`);
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
  await emitFlatSizes();
  await emitMaskable();
  await emitFavicon();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
