# Styling

## Current Reality

- Tailwind CSS v4 is imported in `app/app/app.css`.
- Theme tokens live in `@theme` inside `app/app/app.css`.
- The app uses self-hosted LINE Seed Sans TH/EN font files from
  `app/public/fonts/line-seed-sans/`.
- Light/dark/system mode is implemented with `data-theme` on `<html>`,
  semantic token overrides in `app/app/app.css`, and
  `app/app/components/shell/theme-toggle.tsx`.
- UI primitives live in `app/app/components/ui/` and use Tailwind classes.
- Components often accept `className` and merge with `cn()` from `~/lib/cn`.
- Radix primitives are used under local UI wrappers.
- `prettier-plugin-tailwindcss` is configured to sort Tailwind classes.

## Tokens

Default light color tokens:

- `sky`: `#EAF7FF`
- `surface`: `#FFFFFF`
- `ink`: `#172026`
- `muted`: `#6C7D86`
- `coral`: `#F76A5D`
- `coral-strong`: `#FF5C4D`
- `teal`: `#129C91`
- `teal-strong`: `#18A999`
- `lime`: `#D6E86F`
- `lime-strong`: `#B7F34A`
- `line`: `#DDE7EC`

Current radius tokens:

- `xs`: `10px`
- `sm`: `12px`
- `md`: `14px`
- `lg`: `16px`

## Preferred Direction

- Keep both light and dark mode calm, matching the Pordee product tone.
- Use semantic tokens before raw arbitrary color values.
- Keep lime as a small accent, not a primary UI color.
- Use solid coral for primary actions.
- Use teal for income/positive states.
- Keep surfaces flat with subtle borders and minimal shadows.
- Keep mascot usage to supportive moments such as auth, empty states, warnings,
  and confirmations.

## Not Established Yet

- No separate Tailwind config file is established; tokens are in CSS.
- No full variant system is established beyond local primitives and CVA usage.
- No server-backed theme preference is established. Theme choice is remembered
  per device in `localStorage`.

## Working Rules

- Put global tokens in `app/app/app.css`.
- Put reusable primitive behavior in `app/app/components/ui/`.
- Keep route-specific layouts and copy in route owners.
- Use `cn()` when combining base classes with caller-provided `className`.
- Let Prettier sort Tailwind classes instead of hand-ordering them.
- Do not use generated wordmark text as UI text; pair the logo mark with HTML
  text when needed.
- Do not create marketing-style hero layouts for app screens.
