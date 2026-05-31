# File Organization

## Project Structure

```text
Pordee/
├── app/                         # App package, app source, tests, Dockerfile
├── docs/                        # Brand, product, and engineering docs
├── assets/                      # Brand/reference assets
├── source/                      # Rebrand exploration archive
├── .github/workflows/ci.yml     # CI using app/ as working directory
└── AGENTS.md                    # Repo policy and engineering rules
```

## App Directory Structure

```text
app/
├── app/
│   ├── app.css                  # Tailwind import and theme tokens
│   ├── root.tsx                 # document shell, meta, fonts, error boundary
│   ├── routes.ts                # React Router route registry
│   ├── routes/                  # route modules
│   ├── components/              # brand, shell, and UI primitives
│   └── lib/                     # auth, db, validators, format/date/parse utils
├── public/                      # runtime static assets
├── scripts/                     # icon generation and prompt notes
├── tests/                       # unit and e2e tests
├── Dockerfile                   # Dokploy build input
├── DEPLOY.md                    # deploy notes
└── package.json                 # app scripts and dependencies
```

## Route Structure

Routes are registered explicitly in `app/app/routes.ts`.

```text
routes/
├── api.auth.$.ts                # Better Auth catch-all endpoint
├── login.tsx                    # public auth route
├── logout.tsx                   # logout action
├── _shell.tsx                   # authenticated app shell and route guard
├── dashboard.tsx                # index route
├── wallet.tsx
├── add.tsx
├── history.tsx
├── history.$id.tsx
├── goals.tsx
└── settings.tsx
```

Route modules currently own loaders, actions, page UI, and small owner-local
helpers. Split owner-local partials only when a route becomes hard to scan.

## Data Ownership Structure

```text
app/app/lib/db/
├── README.md                    # Phase 0 contract and Phase 1 swap plan
├── index.ts                     # exports the current repo implementation
├── mock.ts                      # in-memory Phase 0 repo
└── types.ts                     # PordeeRepo and finance domain types
```

Routes should import `repo` and types from `~/lib/db`. Do not import `mockRepo`
from route code.

## File Naming Conventions

### Routes

- Use lower-case route filenames that match the URL.
- Use React Router dotted names for dynamic segments, such as
  `history.$id.tsx`.

### Components

- Component exports use PascalCase.
- Shared primitive filenames are lower-case, such as `button.tsx` and
  `date-picker.tsx`.

### Domain or Module Partials

Not established as a folder pattern yet. Keep route-specific helpers with the
route until extraction improves clarity.

### Hooks

No custom hooks layer is established. If introduced later, use standard `useX`
names and keep ownership local until several owners share the same behavior.

### Services

No general service layer is established. The current data boundary is the db
repository interface.

### Stores

No shared state store exists.

### Types

- Finance domain types live in `app/app/lib/db/types.ts`.
- Route-generated types come from `./+types/...`.
- Validator-derived types live beside their Zod schemas.

### Utilities

Small utilities live under `app/app/lib/<domain>/`, such as `date`, `format`,
and `parse`.

## Component Organization

```text
app/app/components/
├── brand/                       # logo, mascot, brand presentation helpers
├── shell/                       # app navigation shell
└── ui/                          # shared local primitives
```

Keep route-specific UI inside the route file or an owner-local extraction until
reuse crosses route ownership.

## Placement Rules

- Add route modules under `app/app/routes/` and register them in
  `app/app/routes.ts`.
- Add shared primitives to `components/ui` only when the component is
  domain-neutral.
- Add finance persistence behind `app/app/lib/db`, not directly inside routes.
- Add input validation under `app/app/lib/validators`.
- Keep brand/product direction in root `docs/`; keep runtime assets in
  `app/public/`.
- Add folders because they clarify ownership, not because a template implies
  they should exist.
