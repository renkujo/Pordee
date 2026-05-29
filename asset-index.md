# Pordee Rebrand Asset Index

## Logo

| File | Role | Status |
| --- | --- | --- |
| `assets/logo/pordee-pd-logo-semiflat-v1.png` | Final selected semi-flat PD logo direction | Use across brand preview/mockup work; trace/vectorize before production |

## Mascots

| File | Role | Status |
| --- | --- | --- |
| `assets/mascots/pordee-mascot-normal.png` | Neutral helper | Use for brand preview/mockup trials |
| `assets/mascots/pordee-mascot-happy.png` | Success state | Use for brand preview/mockup trials |
| `assets/mascots/pordee-mascot-saving.png` | Saving/goals state | Use for brand preview/mockup trials |
| `assets/mascots/pordee-mascot-warning.png` | Warning/error state | Use for brand preview/mockup trials |
| `assets/mascots/pordee-mascot-thinking.png` | Tip/onboarding state | Use for brand preview/mockup trials |
| `assets/mascots/pordee-mascot-normal.svg` | Neutral helper vector | Use for brand preview and implementation trials |
| `assets/mascots/pordee-mascot-happy.svg` | Success state vector | Use for brand preview and implementation trials |
| `assets/mascots/pordee-mascot-saving.svg` | Saving/goals vector | Use for brand preview and implementation trials |
| `assets/mascots/pordee-mascot-warning.svg` | Warning/error vector | Use for brand preview and implementation trials |
| `assets/mascots/pordee-mascot-thinking.svg` | Tip/onboarding vector | Use for brand preview and implementation trials |

## Boards

| File | Role |
| --- | --- |
| `assets/boards/pordee-pd-generated-board-v2.png` | Best current logo-board reference |
| `assets/boards/pordee-pd-image-board-v1.png` | Earlier PD exploration board |
| `assets/boards/pordee-mascot-contact-sheet-v1.png` | Mascot direction board |

## Derived Assets (Phase 1)

Generated from `assets/logo/pordee-pd-logo-semiflat-v1.png` by
`app/scripts/build-icons.mjs`:

| File                                       | Role                         |
| ------------------------------------------ | ---------------------------- |
| `app/public/brand/icon-32.png`             | Browser icon                 |
| `app/public/brand/icon-180.png`            | apple-touch-icon             |
| `app/public/brand/icon-192.png`            | PWA manifest, `any`          |
| `app/public/brand/icon-512.png`            | PWA manifest, `any`          |
| `app/public/brand/icon-maskable-512.png`   | PWA manifest, `maskable`     |
| `app/public/favicon.ico`                   | Multi-size .ico (16/32/48)   |

Regenerate with `pnpm icons:build` whenever the source PNG changes.

## Source-of-Truth Notes

- This folder is the curated rebrand package.
- `source/rebrand-source/` remains the broader exploration archive.
- Do not delete old exploration files yet.
- App-runtime assets live under `app/public/brand/`. The selected source PNG
  in `assets/logo/` remains the upstream authority for the icon pipeline.
