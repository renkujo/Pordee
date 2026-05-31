# i18n Guidelines

## Current Reality

- The app is Thai-first.
- `app/app/root.tsx` sets `<html lang="th">`.
- User-facing copy is written directly in route and component owners.
- Date and currency formatting uses Thai locale formatters such as `th-TH`.
- No i18n library, extraction command, locale routing, or translation catalog is
  established.

## Preferred Direction

- Keep render-bound, single-owner copy in the route or component that owns it.
- Keep Thai copy clear and product-specific instead of generic SaaS wording.
- If shared user-facing messages are introduced later, store them as
  translation-safe message descriptors rather than plain shared strings.
- Translate at the render boundary if an i18n library is introduced.

## Working Rules

- Do not extract copy into shared constants only to shorten a component.
- Keep single-owner button labels, helper text, empty-state text, and validation
  copy near the owner.
- Shared config may hold stable non-user-facing identifiers, but shared
  user-facing copy needs an i18n plan before extraction.
- Keep locale-specific formatting in small helpers, as seen in
  `app/app/lib/format/` and `app/app/lib/date/`.
- If Lingui or another i18n library lands later, update this page with the real
  extract/compile commands and render-bound translation pattern.

## Not Established Yet

- Locale switching.
- Translation catalogs.
- Message extraction.
- Shared message descriptor helpers.
