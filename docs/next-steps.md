# Pordee Rebrand Next Steps

## 1. Final Logo Direction

Use `app/public/logo/direct/pordee-logo-mark-direct-01.png` as the shipped app UI logo mark:

- app header
- mobile home screen
- login/onboarding screen
- favicon/app-icon test

Decision: use this direct-generated semi-flat PD mark as the current app UI logo asset.
The favicon and install-icon rasters are generated from the same direct logo
asset by `pnpm icons:build`; PWA and apple-touch outputs use a sky-background
tile, while the maskable icon keeps extra safe area.

## 2. Prepare Production Logo Asset

Done in Phase 1 for raster output:

- multi-size icon pipeline at `app/scripts/build-icons.mjs` (sharp + png-to-ico)
- `app/public/brand/icon-{32,180,192,512}.png` and `icon-maskable-512.png`
- `app/public/favicon.ico` (16/32/48 multi-size)

Still to do (hand work):

- production SVG trace that preserves the semi-flat proportions
- simplified curves for sub-32px rendering

## 3. Trace Production Vector

After tracing:

- export light and dark variants
- export app icon tile variants
- replace the raster icon pipeline source with the traced SVG and re-run
  `pnpm icons:build`

## 4. Apply Brand To App UI

Phase 0 + Phase 1 progress:

- React Router v7 + Vite + Tailwind v4 in `app/`
- LINE Seed Sans TH/EN wired via self-hosted WOFF2 files
- App shell uses Pordee tokens (sky background, coral primary, teal accent)
- Header renders `PordeeLogo` (direct transparent PNG mark + Thai wordmark)
- Mascots are integrated into supportive dashboard, wallet, goal, and auth moments.

Still to do:

- Keep app-store and PWA install PNGs regenerated with `pnpm icons:build`
  whenever the approved logo source changes.

## 5. Update Docs After Implementation

- `logo-direction.md` — updated to reflect the shipped direct PNG logo rollout and
  remaining install-icon raster pipeline.
- `design-system.md` — does not exist yet; introduce once UI features
  ship in Phase 2 so it documents real components, not aspirations.
- `AGENTS.md` — does not exist in this repo yet; introduce when a contributor
  workflow is needed.

## 6. Dev/QA Scaffolding (Phase 2 — done)

Test, lint, format, e2e, and CI now run locally and in GitHub Actions:

- **Vitest + Testing Library** — `pnpm test`, `pnpm test:watch`,
  `pnpm test:coverage`. Setup at `app/vitest.config.ts` + `app/tests/setup.ts`.
  Sample coverage: `app/tests/unit/validators.test.ts`,
  `app/tests/unit/mock-repo.test.ts`.
- **ESLint flat config** — `app/eslint.config.js` (typescript-eslint +
  react/hooks/refresh + jsx-a11y). `pnpm lint`, `pnpm lint:fix`.
- **Prettier + tailwindcss plugin** — `app/.prettierrc.json`. `pnpm format`,
  `pnpm format:check`.
- **Playwright smoke** — `app/playwright.config.ts` +
  `app/tests/e2e/smoke.spec.ts` (chromium). `pnpm e2e`, `pnpm e2e:ui`.
  First-time browser install: `pnpm e2e:install`.
- **GitHub Actions CI** — `.github/workflows/ci.yml` runs typecheck, lint,
  format:check, test, build on every PR/push. Separate `e2e` job runs
  Playwright with browser caching.

CI is active once the repo is pushed to GitHub. Deploy still goes through
Dokploy (independent of CI).

## 7. Add Transaction Flow (Phase 3 — done)

- `app/lib/parse/quick-entry.ts` — pure quick-parse engine.
  Extracts trailing amount, infers `kind` from Thai income keywords
  (เงินเดือน, งานเสริม, …), maps category by keyword (ข้าว/กาแฟ →
  cat-food, รถ/แท็กซี่/grab → cat-transport, บิล/ค่าน้ำ/ค่าไฟ →
  cat-bills, …). 10 unit tests in `tests/unit/quick-entry.test.ts`.
- `app/routes/add.tsx` — `loader` returns categories, `action` validates
  with Zod and writes through `repo.createTransaction`, then redirects
  to `/history`. UI shows live preview + editable kind toggle + category
  select (filtered by effective kind). Field errors land via
  `useActionData`.
- `app/routes/history.tsx` — `loader` reads from `repo.listTransactions`
  and renders the list (badge by kind, Thai date, category label).
  Empty state keeps the existing `MascotState`.
- E2E (`tests/e2e/add-transaction.spec.ts`):
  - quick-parse "กาแฟ 65" → submit → land on `/history` with the row.
  - kind override flips category options to income set.

> Note: `app/lib/dev/react-grab.client.tsx` was renamed to
> `react-grab.tsx`. Under React Router v7 framework mode the
> `.client.tsx` suffix interferes with SSR and produced a 500 (Element
> type undefined). Keep dev-only helpers without the suffix.

## 8. Dashboard real data (Phase 4 — done)

- `app/lib/date/month-range.ts` — `getMonthRange(d)` returns ISO from/to
  bounds for the calendar month (UTC). Used by the dashboard loader so
  `repo.listTransactions({ from, to })` returns only the current month.
- `app/lib/format/baht.ts` — `fmtBaht` and `fmtSignedBaht` (signed
  prefix for income/expense badges). Reused by `dashboard.tsx` and
  `history.tsx`.
- `app/routes/dashboard.tsx` — loader fetches month transactions +
  goals + categories. Renders: balance/income/expense badges, recent
  list (top 5), goal list with progress bars, "สัญญาณที่ควรดู" panel
  that swaps between three `MascotState`s depending on income/expense
  ratio.
- E2E (`tests/e2e/dashboard.spec.ts`) — seeds via `/add` flow and
  asserts income badge, recent list rows, and a non-zero expense badge
  on `/`. Avoids exact totals because the in-memory store accumulates
  across parallel tests.

## 9. Edit/Delete Transaction (Phase 5 — done)

- `PordeeRepo` gained `getTransaction(id)`, `updateTransaction(id, input)`,
  `deleteTransaction(id)`. Mock impl preserves `id` + `createdAt` on
  update; returns `null`/`false` for unknown ids.
- `updateTransactionSchema` (validators/transaction.ts) mirrors create
  but requires `occurredAt` (no default — we keep the original).
- `app/routes/history.$id.tsx` — loader 404s on missing id, action
  dispatches on `intent` (`delete` → `deleteTransaction`, default →
  `updateTransaction`). Form has title/amount/kind toggle/category/note
  fields plus a separate delete card.
- `app/routes/history.tsx` — list rows are now full-width `Link`s to
  `/history/:id` with hover state.
- E2E (`tests/e2e/edit-delete.spec.ts`): seed → click row → edit amount
  → assert updated value; seed → click row → delete → assert row gone.

Playwright config notes:

- Switched to `workers: 1` + `fullyParallel: false` because all e2e
  tests share the in-memory mockRepo store; parallel runs were racing.
- Added `await page.waitForLoadState("networkidle")` after every
  navigation that immediately calls `fill()`. Without it, Playwright's
  `fill()` raced React 19 hydration and the controlled `#amount` input
  stuck at empty.

Backlog after Phase 5:

- Goals flow (create + add contribution forms on `/goals`).
- Postgres + Drizzle swap behind `repo`.
- Production polish: real meta/OG, loading states during navigation,
  a11y/keyboard pass.
