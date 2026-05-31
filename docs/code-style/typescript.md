# TypeScript Guidelines

This page documents current TypeScript behavior first, then preferred direction
for new code.

## Configuration

- **Strict mode**: enabled
- **No implicit any**: enabled through `strict`
- **Strict null checks**: enabled through `strict`
- **Module resolution**: `bundler`
- **JSX**: `react-jsx`
- **No emit**: enabled

Base config lives in `app/tsconfig.json`.

## Naming Conventions

### Interfaces

Current repo interfaces do not use an `I` prefix.

```ts
export interface PordeeRepo {
  listTransactions(): Promise<Transaction[]>;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}
```

Preferred direction: keep this local convention unless the repo deliberately
adopts a different TypeScript naming standard.

### Types

Use PascalCase for type aliases.

```ts
export type TransactionKind = "expense" | "income";
export type Money = number;
```

### Route Action Results

Route files commonly define local result types near the action/component that
uses them.

```ts
interface ActionResult {
  ok: false;
  error: string;
}
```

Keep these local unless several routes share the exact same shape.

## Exports

### Type Exports

Use explicit type exports at module boundaries.

```ts
export const repo: PordeeRepo = mockRepo;
export type { PordeeRepo } from "./types";
```

### Barrels

Use barrel files when they define a real boundary. `app/app/lib/db/index.ts` is
the current example.

## Type Imports

Use `type` for type-only imports.

```ts
import type { Route } from "./+types/login";
import type { PordeeRepo } from "./types";
```

## Path Aliases

`app/tsconfig.json` maps:

```json
"~/*": ["./app/*"]
```

Use `~/` for app-internal imports.

```ts
import { repo } from "~/lib/db";
import { Button } from "~/components/ui/button";
```

## Common Patterns

### Domain Payloads

Use Zod inference for validator-owned payloads.

```ts
export const createGoalSchema = z.object({
  name: z.string().trim().min(1),
  target: z.coerce.number().positive(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
```

### Nullable Domain Fields

Use explicit nullable fields where the domain allows absence.

```ts
export interface Transaction {
  categoryId: string | null;
  note: string | null;
}
```

## Avoid `any`

```ts
// Avoid
function parse(value: any) {}

// Better
function parse(value: unknown) {}
```

Prefer schema parsing, domain interfaces, or generated route types.

## Preferred Direction

- Keep route-generated types from `./+types/...`.
- Keep domain types near their persistence boundary.
- Keep single-route result types local.
- Use `unknown` plus validation at untrusted boundaries.
- Do not add broad shared type folders before a real cross-owner need appears.
