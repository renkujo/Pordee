# Formatting (Prettier)

## Current Reality

- **Formatter**: Prettier 3.8.3
- **Config file**: `app/.prettierrc.json`
- **Tailwind class sorting**: `prettier-plugin-tailwindcss`
- **Auto-run posture**: manual locally, checked in CI through `pnpm format:check`
- **Lint config**: `app/eslint.config.js`

## Formatting Commands

Run from `app/`.

```bash
# Check formatting
pnpm format:check

# Auto-fix formatting
pnpm format

# Check linting
pnpm lint

# Auto-fix linting issues
pnpm lint:fix
```

## Core Rules

### Indentation & Spacing

- **Indent width**: 2
- **Indent style**: spaces
- **Trailing whitespace**: handled by Prettier

### Quotes & Semicolons

- **JavaScript/TypeScript quotes**: double
- **JSX quotes**: double
- **Semicolons**: always

### Line Width & Wrapping

- **Maximum width**: 80
- **Wrap behavior**: Prettier default

### Trailing Commas

- **JavaScript/TypeScript**: ES5
- **JSON**: none

### Brackets & Attributes

- **Bracket spacing**: Prettier default
- **Closing bracket placement**: Prettier default
- **Multi-line attributes or props**: Prettier default

### Arrow Functions

Prettier keeps parentheses around arrow params.

```ts
// Preferred
items.map((item) => item.id);
```

## Repo-Faithful Example

```tsx
import type { Route } from "./+types/settings";
import { Button } from "~/components/ui/button";

export async function loader({ request }: Route.LoaderArgs) {
  return { pathname: new URL(request.url).pathname };
}

export default function Settings() {
  return (
    <section className="bg-surface border-line rounded-sm border p-4">
      <Button type="button">บันทึก</Button>
    </section>
  );
}
```

## Ignore and Override Syntax

No local formatter-ignore convention is established. Prefer reshaping code so
Prettier can format it normally.

## Preferred Direction

- Let Prettier and the Tailwind plugin own formatting.
- Keep formatting-only changes separate from behavioral changes when practical.
- Run `pnpm format` before commit when `format:check` fails.
