# API and Data Fetching

## Current Reality

- React Router loaders load route data.
- React Router actions handle form mutations.
- Finance data goes through `repo` from `~/lib/db`.
- `app/app/lib/db/types.ts` defines the `PordeeRepo` contract.
- `app/app/lib/db/mock.ts` is the current Phase 0 in-memory implementation.
- Better Auth endpoints are handled by `routes/api.auth.$.ts`.
- Auth helpers and cookie forwarding live in `app/app/lib/auth.server.ts`.
- Form inputs are validated with Zod schemas in `app/app/lib/validators/`.

## Finance Data Boundary

Route modules should depend on the repository contract:

```ts
import { repo } from "~/lib/db";

export async function loader() {
  const categories = await repo.listCategories();
  return { categories };
}
```

Route modules should not import `mockRepo` directly. Phase 1 should replace the
implementation behind `app/app/lib/db/index.ts`.

## Mutation Boundary

Actions parse form data, validate with Zod, call the repo, and return route
data or redirects.

```ts
const parsed = createCategorySchema.safeParse(Object.fromEntries(form));
if (!parsed.success) {
  return zodFieldError("create", parsed.error.issues, form);
}

await repo.createCategory(parsed.data);
return redirect("/settings");
```

Keep validators separate from route UI when the same schema belongs to the
domain boundary.

## Auth Boundary

- `routes/api.auth.$.ts` forwards GET/POST requests to Better Auth.
- `login.tsx` uses Better Auth sign-in/sign-up APIs and forwards auth cookies.
- `logout.tsx` uses Better Auth sign-out through a POST action.
- `_shell.tsx` uses `requireUser()` to protect app routes.

Do not duplicate Better Auth cookie behavior in route files. Use helpers from
`auth.server.ts`.

## Preferred Direction

- Add Postgres and Drizzle behind `PordeeRepo`, not beside it.
- Preserve the route loader/action shape for the first DB phase.
- Scope finance records by authenticated user when durable persistence lands.
- Add migration scripts and deployment steps when the schema lands.
- Move Better Auth from SQLite to the shared durable DB only when the DB layer is
  established and migrations are reliable.

## Not Established Yet

- `DATABASE_URL`
- Drizzle schema and migration scripts
- Durable finance persistence
- Service layer outside the repo contract
- Server-state query cache
- API routes for finance data

## Working Rules

- Keep route loaders/actions as the current server boundary.
- Keep data types and repo contract in `app/app/lib/db/`.
- Keep route forms and validation explicit.
- Introduce services only if repeated transport/API logic appears across
  several owners.
- Keep direct DB implementation details out of route modules.
