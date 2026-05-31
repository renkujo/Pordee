# Codex Prompt — Inline SVG `PordeeLogoMark`

Hand this prompt to Codex (or any code-gen agent). It is fully self-contained.

---

## Context (do not skip)

You are adding a **hand-coded, inline SVG** React component for the Pordee
(`พอดี`) brand mark. Pordee is a Thai-first personal-finance PWA. The current
final visual direction is a **semi-flat `P + D` loop monogram** with a teal
balance smile and a small lime milestone dot, sitting on a calm sky tile.

There is already a raster reference at
`app/public/logo/pordee-pd-logo.png` (1254×1254, opaque sky background).
**Do not auto-trace it.** Hand-author the SVG so the proportions match the
brand spec below, not the raster's anti-aliased edges.

The component is meant for UI chrome at small sizes (16–64 px) where the PNG
raster gets blurry — header, sidebar, splash, inline mentions.

## File to create

`app/app/components/brand/logo-mark.tsx`

## Component API (must match exactly)

```ts
export type LogoVariant = "light" | "dark";

export interface PordeeLogoMarkProps {
  size?: number; // px, default 32, sets both width and height
  variant?: LogoVariant; // default "light"
  withTile?: boolean; // default true — draws the sky tile behind the mark
  title?: string; // default "พอดี" — used for <title> a11y label
  className?: string;
}

export function PordeeLogoMark(props: PordeeLogoMarkProps): JSX.Element;
```

Export a **named export** `PordeeLogoMark`. Do not default-export.

## Brand spec (authoritative)

Colors — use these hex values exactly, no near-matches:

| Token            | Hex       | Where it goes                              |
| ---------------- | --------- | ------------------------------------------ |
| Coral            | `#FF6B5A` | `P` loop stroke + `D` curve (main energy)  |
| Teal             | `#18A999` | Balance smile beneath the monogram         |
| Lime             | `#B7F34A` | Single milestone dot, lower-right          |
| Sky              | `#EAF7FF` | Tile background (when `withTile`)          |
| Ink (light)      | `#172026` | Reserved — not used inside the mark itself |
| Ink-dark surface | `#0E1418` | `dark` variant tile background             |
| Surface-dark ink | `#F4F7F9` | `dark` variant on-dark elements if needed  |

Geometric brief (read carefully):

- viewBox `0 0 64 64`. Everything fits inside a 64-unit tile.
- **Tile**: if `withTile`, a rounded square covering the full viewBox.
  - Radius: 14 (≈ 22% — matches our Tailwind `--radius-lg` scale).
  - Fill: sky `#EAF7FF` for `light`, dark surface `#0E1418` for `dark`.
- **P loop (left)**: a soft, slightly inflated `P` glyph stroked in coral.
  - Stem on the left, loop opens to the right, rounded ends.
  - Stroke width ≈ 6, `stroke-linecap="round"`, `stroke-linejoin="round"`.
  - Total height roughly 36–40 within the tile.
- **D curve (right)**: a soft `D` that interlocks with the `P` loop's right edge.
  - Same coral. Same stroke treatment.
  - The `D` and `P` should read as a connected monogram, not two separate
    glyphs. They may share an edge or kiss at a single point.
- **Teal smile**: a single open curve below the monogram, stroked teal.
  - Subtle upward curve (gentle, not a wide grin).
  - Same stroke width family as the monogram, no thicker.
  - Centered horizontally, with comfortable padding from the tile edges.
- **Lime dot**: one filled circle, lime `#B7F34A`, radius ≈ 2.5.
  - Position: lower-right quadrant, near (but not touching) the end of the
    teal smile.
  - This dot must stay small — never a dominant element.
- **Safe padding**: leave ≥ 6 viewBox units of breathing room around all
  visible elements so the icon survives ~10% mask cropping.

Visual character:

- Semi-flat. **No gradients, no gloss, no inner shadow, no 3D bevel.**
- One color per shape. Flat fills/strokes only.
- Rounded everything — caps, joins, tile corners.
- Friendly and calm. Avoid sharp corners.

Accessibility & semantics:

- Include `<title>{title}</title>` as the first child of the `<svg>`.
- Set `role="img"` and `aria-labelledby` pointing to the `<title>`'s id.
- Generate a stable id (e.g., `useId()` from React) for the title.
- The component must be deterministic in SSR (no random ids, no Date).

Implementation rules:

- React 19, TypeScript, strict.
- Use `useId()` for the title id.
- No external dependencies beyond `react` and `~/lib/cn` (already exists,
  re-exports `cn(...classes)` from `clsx + tailwind-merge`).
- Inline all geometry; do not load external SVG files.
- All numbers should be literals — no hard-to-read magic computations.
- Do not add comments inside the SVG markup unless they describe a
  non-obvious geometric decision.

Integration:

- After creating `logo-mark.tsx`, update
  `app/app/components/brand/logo.tsx` to render `<PordeeLogoMark size={size}
variant={variant} withTile />` instead of the current `<img>` tag, keeping
  the same outer `PordeeLogo` API (`size`, `withWordmark`, `variant`,
  `className`). The raster fallback can be removed.

## Definition of done

- `pnpm typecheck` passes.
- `pnpm build` passes.
- Visual check at 24, 32, 48, 64 px renders crisp on both `light` and `dark`
  tile variants in a Storybook-free smoke route (e.g. a temporary
  `/_dev/logo` page is acceptable but should be deleted before merge).
- All five required elements (tile, P loop, D curve, teal smile, lime dot)
  are present and identifiable at 32 px.
- Colors match the hex table above exactly (no off-by-one).

## Do not

- Do not auto-trace the PNG.
- Do not introduce gradients, glow, blur, or filter effects.
- Do not make lime a dominant color or a stroke.
- Do not use wallet, piggy bank, chart, bank, or coin symbols anywhere.
- Do not animate. Static mark only.
- Do not invent a wordmark — `พอดี` text stays in `PordeeLogo`, not in the SVG.
- Do not add a drop shadow to the tile.

## References (read these before coding)

- `docs/logo-direction.md` — selected direction, color usage, do-not list
- `docs/rebrand-direction.md` — App Mark and color rationale
- `docs/brief.md` — emotional promise and visual principles
- `docs/ui-direction.md` — calm-not-fintech principle
