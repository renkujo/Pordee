# Pordee Logo Direction

This document records the current logo direction for the `พอดี / Pordee` rebrand.

Historical note: this repo was previously branded as `TangMod / ตังค์หมด`. Old TangMod logo files remain under `docs/images/logo-source/` as legacy source material.

## Selected Direction

Use the compact Option B semi-flat `P + D` loop mark as the primary logo
direction. This direction keeps the selected PD concept: coral loop monogram,
teal balance smile, and tiny lime milestone dot, but tightens the negative
space and app-icon silhouette.

![Pordee final semi-flat PD logo mark](../app/public/logo/direct/pordee-logo-mark-direct-01.png)

Current strategy and exploration:

- `rebrand-direction.md`
- `source/rebrand-source/pordee-brand-board.svg`
- `source/rebrand-source/pordee-mascot-contact-sheet-v1.png`

## Logo Principles

- The main app UI logo is the compact Option B semi-flat `P + D` loop mark in `app/public/logo/direct/pordee-logo-mark-direct-01.png`.
- `Pordee` is English support text for URLs, app stores, and bilingual contexts.
- The product UI font is `LINE Seed Sans`.
- The coral loop is the key action detail.
- The teal balance path is the positive-progress detail.
- The lime dot is a tiny milestone highlight only.
- Avoid returning to the earlier inflated 3D/glossy gel rendering.
- The logo should feel friendly, Thai-first, and practical.
- The mascot should not be the main logo.
- The app icon should use the square loop-and-balance mark.

## Color Usage

- Wordmark: charcoal `#172026`
- Primary accent: coral `#FF6B5A`
- Support accent: teal `#18A999`
- Tiny highlight only: lime `#B7F34A`
- Background: sky `#EAF7FF`
- Surface: white `#FFFFFF`

Coral is the primary accent. Lime must remain a small highlight, not the main logo color.

## Production Assets

Current final visual direction:

- `app/public/logo/direct/pordee-logo-mark-direct-01.png`
- `app/public/logo/direct/pordee-logo-mark-direct-01-source.png`
- `app/public/logo/pordee-pd-logo.png`

The direct PNG is the shipped app UI logo mark. It was generated as a
per-asset chroma-key source and extracted into a transparent PNG. The
install-icon and favicon pipeline now derives its outputs from this same direct
production logo asset.

Historical SVG candidates remain under `source/rebrand-source/production/`, but they are no longer the active logo direction.

Mascot production candidate SVG files:

- `source/rebrand-source/production/mascots/pordee-mascot-normal.svg`
- `source/rebrand-source/production/mascots/pordee-mascot-happy.svg`
- `source/rebrand-source/production/mascots/pordee-mascot-saving.svg`
- `source/rebrand-source/production/mascots/pordee-mascot-warning.svg`
- `source/rebrand-source/production/mascots/pordee-mascot-thinking.svg`

When the app needs stable public asset paths, use versioned files under
`app/public/logo/` and keep the source asset beside the shipped output when the
asset is generated or extracted.

Legacy TangMod files still exist in `docs/images/logo-source/` for historical comparison, but they should not be used for new Pordee implementation.

## Do Not Use

- Do not use the old glossy logo or raw generated board PNG as the final logo.
- Do not use previous PD SVG candidates as the active app UI logo.
- Do not use old TangMod traced logo files for new Pordee implementation.
- Do not make the mascot the primary logo.
- Do not use wallet, piggy bank, chart, or generic bank symbols.
- Do not return to cream, warm yellow, or dark forest green as the dominant logo palette.

## Implementation Status

Phase 1 progress (in `app/`):

- Sized rasters generated from the direct production logo asset via `app/scripts/build-icons.mjs`:
  - `app/public/brand/icon-32.png` (browser favicon companion)
  - `app/public/brand/icon-180.png` (apple-touch-icon)
  - `app/public/brand/icon-192.png`, `icon-512.png` (PWA manifest)
  - `app/public/brand/icon-maskable-512.png` (PWA maskable with extra safe area)
  - `app/public/favicon.ico` (16/32/48 multi-size)
- `vite.config.ts` PWA manifest references the sized PNG install icons.
  `root.tsx` exposes `favicon.ico`, `icon-32.png`, and the apple touch icon.
  Run `pnpm icons:build` after replacing the approved source image.
- `app/app/components/brand/logo.tsx` renders the direct transparent PNG
  through `PordeeLogoMark` with the Thai wordmark for app chrome.

Still on hold (requires hand work, not auto-generation):

- Trademark- and app-store-grade vector exports.

Phase 2 progress:

- Direct production PNG source is shipped at
  `app/public/logo/direct/pordee-logo-mark-direct-01-source.png`.
- Transparent extracted PNG is shipped at
  `app/public/logo/direct/pordee-logo-mark-direct-01.png`.
- `PordeeLogoMark` lives at `app/app/components/brand/logo-mark.tsx` and uses
  the direct PNG asset, not the placeholder install icon.
