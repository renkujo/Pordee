# Development Commands

All commands below run from `app/`.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The dev server listens on `http://localhost:5173`.

## Building

```bash
# Production build
pnpm build

# Preview built output
pnpm start
```

`pnpm build` runs the React Router production build. `pnpm start` serves
`./build/server/index.js` with `react-router-serve`, normally on port `3000`.

## Linting & Formatting

```bash
# Lint
pnpm lint

# Auto-fix lint issues
pnpm lint:fix

# Check formatting
pnpm format:check

# Write formatting
pnpm format
```

Formatting is Prettier with `prettier-plugin-tailwindcss`. CI uses
`format:check`; run `format` locally when files drift.

## Type Checking

```bash
pnpm typecheck
```

This runs `react-router typegen` before `tsc`, so generated route types stay in
sync with `app/app/routes.ts`.

## Testing

```bash
# Unit tests
pnpm test

# Unit tests in watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# Playwright e2e
pnpm e2e

# First-time Playwright browser install
pnpm e2e:install
```

Playwright starts `pnpm dev` through `app/playwright.config.ts` unless a dev
server is already available.

## Assets

```bash
pnpm icons:build
```

This runs `app/scripts/build-icons.mjs` and regenerates app icon assets.

## Internationalization

```bash
# Extract Lingui messages
pnpm i18n:extract

# Compile Lingui catalogs
pnpm i18n:compile
```

Lingui uses Thai (`th`) as the source locale and English (`en`) as the first
secondary locale. The current translated slice is app shell/navigation and the
settings language control, loaded from `app/app/lib/i18n/messages.ts`. The
`app/locales/` catalogs are ready for macro-extracted route copy as the rollout
expands.

## Dependency Management

```bash
# Install dependencies
pnpm install

# Add runtime dependency
pnpm add <package>

# Add dev dependency
pnpm add -D <package>
```

Keep package changes inside `app/package.json` and `app/pnpm-lock.yaml`.

## Verification Cadence

For normal app changes, run:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
```

Also run `pnpm build` for routing, SSR, dependency, auth, deploy, or production
behavior changes. Run `pnpm e2e` when user flows or route actions change.
