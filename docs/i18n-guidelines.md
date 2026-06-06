# i18n Guidelines

## Current Reality

- The app is Thai-first.
- Lingui is installed with Thai (`th`) as the source locale and English (`en`)
  as the first secondary locale.
- `app/app/root.tsx` wraps the app in `PordeeI18nProvider`.
- `app/app/lib/i18n/messages.ts` currently owns the explicit message catalog
  for the app shell, navigation, and settings language slice.
- `app/app/lib/i18n/provider.tsx` stores the selected locale in localStorage
  under `pordee-locale` and syncs `<html lang>`.
- Most finance route copy is still written directly in route/component owners.
- Date and currency formatting uses Thai locale formatters such as `th-TH`.
- Locale routing is not established.

## Preferred Direction

- Keep render-bound, single-owner copy in the route or component that owns it.
- Keep Thai copy clear and product-specific instead of generic SaaS wording.
- Store shared user-facing shell copy through Lingui rather than plain shared
  strings. The current shell slice uses an explicit TS message map; future
  broader route slices can move into macro extraction and compiled catalogs.
- Translate at the render boundary. Avoid pre-translating route data in loaders.

## Working Rules

- Do not extract copy into shared constants only to shorten a component.
- Keep single-owner button labels, helper text, empty-state text, and validation
  copy near the owner.
- Shared config may hold stable non-user-facing identifiers and Lingui message
  IDs. Rendered labels/descriptions should be resolved through Lingui hooks.
- Keep locale-specific formatting in small helpers, as seen in
  `app/app/lib/format/` and `app/app/lib/date/`.
- Run `pnpm i18n:extract` and `pnpm i18n:compile` from `app/` when adopting
  Lingui macros/catalog files beyond the current explicit message map.

## Not Established Yet

- Full finance-route translation.
- Locale routing.
- Server-persisted language preference.
- Macro-based extraction across route files.
