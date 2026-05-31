# Import Guidelines

## Import Order

No import-sorting tool is currently configured beyond ESLint and Prettier.
Prettier sorts Tailwind classes, not TypeScript imports.

Preferred order:

1. React and external libraries
2. React Router imports
3. Route-generated types
4. App alias imports through `~/`
5. Relative imports

```ts
import { useMemo, useState } from "react";
import { Form, redirect, useActionData } from "react-router";
import type { Route } from "./+types/add";
import { repo } from "~/lib/db";
import { createTransactionSchema } from "~/lib/validators/transaction";
```

## Type Imports

Use `type` for type-only imports.

```ts
import type { Route } from "./+types/settings";
import type { TransactionKind } from "~/lib/db";
```

## Path Aliases

Use `~/` for app-internal modules.

```ts
import { Button } from "~/components/ui/button";
import { requireUser } from "~/lib/auth.server";
import { fmtBaht } from "~/lib/format/baht";
```

Relative imports are normal for same-folder route generated types:

```ts
import type { Route } from "./+types/history";
```

## Relative Imports

Keep relative imports shallow.

```ts
// Preferred for app modules
import { repo } from "~/lib/db";

// Acceptable for same-folder generated route types
import type { Route } from "./+types/login";

// Avoid
import { repo } from "../../lib/db";
```

## Named vs Default Exports

### Routes

Route modules default-export the route component and named-export loaders,
actions, and meta functions.

```tsx
export async function loader() {}
export async function action() {}
export default function Settings() {}
```

### Components and Utilities

Use named exports for shared components and utilities unless a framework
requires a default export.

```ts
export function fmtBaht(amount: number) {}
export { Button, buttonVariants };
```

### Types

Export types explicitly.

```ts
export type { Transaction, TransactionKind } from "./types";
```

## Barrel Files

Use re-exports where they define a clear boundary. Current example:

```ts
// app/app/lib/db/index.ts
export const repo: PordeeRepo = mockRepo;
export type { PordeeRepo } from "./types";
```

Do not add barrels only to hide normal module paths.

## Side Effect Imports

Side effect imports are reserved for global CSS and font setup.

```ts
import "./app.css";
import "@fontsource/ibm-plex-sans-thai/400.css";
```

## Unused Imports

ESLint warns on unused variables and imports through TypeScript ESLint. Remove
unused imports before committing.

## Preferred Direction

- Prefer `~/` over deep relative imports.
- Keep route-generated types relative.
- Keep import groups readable; do not churn imports just for cosmetic ordering.
- Do not introduce paths that the repo does not use.
