# Best Practices

This page combines current repo behavior with preferred direction for new work.
Treat `Current Reality` as repo fact and `Preferred Direction` as guidance for
the next changes.

## Code Quality

### Always Run Verification Commands

Run from `app/`.

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
```

Add `pnpm build` for route, SSR, auth, dependency, deploy, or production
behavior changes. Add `pnpm e2e` for end-to-end user-flow changes.

### Type Exports

Current repo types use plain descriptive names, not an `I` prefix.

```ts
export interface PordeeRepo {
  listTransactions(): Promise<Transaction[]>;
}

export type { PordeeRepo };
```

Prefer exporting types from the same module or existing boundary that owns the
implementation, such as `app/app/lib/db/index.ts`.

### Avoid `any`

Prefer `unknown`, inferred schema types, or domain types.

```ts
// Avoid
const payload: any = Object.fromEntries(form);

// Better
const parsed = createTransactionSchema.safeParse(Object.fromEntries(form));
```

## Component Best Practices

### Keep Components Small Enough To Review

Some current route files are intentionally doing several jobs while the app is
young. When a route starts mixing loader/action logic, filters, tables, dialogs,
and forms, extract owner-local helpers or partial components before creating a
shared abstraction.

### Prefer Composition

Shared UI should stay domain-neutral. Use `components/ui` for primitives and
compose product-specific layout in route or shell owners.

```tsx
<Button type="submit">บันทึก</Button>
```

Do not move Pordee-specific copy, transaction behavior, or goal behavior into a
generic UI primitive.

### Keep Shared UI Conservative

Repetition alone is not enough to justify a shared component, variant helper, or
styling abstraction.

- Prefer owner-local composition, styling, and small local helpers first.
- Extract shared UI only after the same need appears across real owners and the
  boundary is clearly domain-neutral.
- If reuse is confined to one route cluster, keep it local.

## Data Best Practices

### Keep Finance Data Behind `PordeeRepo`

```ts
import { repo } from "~/lib/db";

export async function loader() {
  const transactions = await repo.listTransactions();
  return { transactions };
}
```

Route code should not import `mockRepo` directly. Phase 1 DB work should swap
the implementation behind `app/app/lib/db/index.ts`.

### Validate Before Writes

```ts
const parsed = createTransactionSchema.safeParse(Object.fromEntries(form));
if (!parsed.success) {
  return data({ ok: false, errors: parsed.error.issues }, { status: 400 });
}

await repo.createTransaction(parsed.data);
```

Keep Zod schemas in `app/app/lib/validators/`.

## Auth Best Practices

- Use `requireUser()` in authenticated loaders.
- Use `getAuthUser()` when a route should redirect away if already logged in.
- Let `routes/api.auth.$.ts` proxy Better Auth endpoint handling.
- Preserve auth cookies with the helpers in `auth.server.ts`; do not hand-roll
  cookie forwarding in individual routes.

## Styling Best Practices

### Use `cn()` for Class Merging

```tsx
import { cn } from "~/lib/cn";

<button className={cn("rounded-sm px-3", className)} />;
```

### Use Semantic Tokens

```tsx
// Prefer
<section className="bg-surface text-ink border-line border" />

// Avoid for app UI when a token exists
<section className="border-[#DDE7EC] bg-white text-[#172026]" />
```

## State Management Best Practices

### Current Reality

- Server data is loaded by React Router loaders.
- Mutations run through React Router actions.
- Client state is local `useState` and `useMemo`.
- No TanStack Query, Zustand, Redux, or Context state layer is established.

### Preferred Direction

Keep local state local. Add a shared state layer only when state crosses
unrelated owners and cannot be modeled through route data, form submissions, or
URL state.

## Development Workflow

1. Make the scoped change.
2. Run the verification commands that match the risk.
3. Run `pnpm format` only when formatting check fails or files need formatting.
4. Run `pnpm build` for production-facing changes.
5. Keep commits focused and avoid mixing unrelated dirty work.

## Common Pitfalls To Avoid

- Importing `mockRepo` from route code.
- Treating Postgres/Drizzle as current behavior before the DB implementation
  lands.
- Adding a `services/`, `hooks/`, or `stores/` folder because it is conventional
  rather than because this repo needs it.
- Moving Thai copy into plain shared string constants without an i18n plan.
- Putting mascot art into dashboard chrome instead of supportive states.

## Summary Checklist

Before committing:

- [ ] Ran the relevant verification commands from `app/`.
- [ ] Kept finance persistence behind `PordeeRepo`.
- [ ] Used Zod for route action input validation.
- [ ] Used `cn()` when merging caller-provided classes.
- [ ] Kept shared UI domain-neutral.
- [ ] Avoided unrelated dirty worktree changes.
