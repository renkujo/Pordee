# State Management

## Current Reality

- No dedicated client-state library is installed.
- No global store folder exists.
- Server-owned route data comes from React Router loaders.
- Mutations happen through React Router actions.
- UI-only state uses local React state inside route or component owners.

Examples of local state currently include history filters, date picker open
state, bottom-nav more menu state, form preview overrides, and delete dialog
state.

## Client State Stores

Not established. Do not add Zustand, Redux, Context stores, or persisted stores
without a concrete cross-owner need.

## Server State vs Client State

- **Server state**: route loader data and action results
- **Client state**: local `useState`, `useMemo`, and component-owned UI state
- **Persisted state**: not established for finance UI
- **Auth state**: Better Auth session cookies, read through server helpers

## Usage

Keep route-local filters and temporary form state local:

```tsx
const [searchQuery, setSearchQuery] = useState("");
const [kindFilter, setKindFilter] = useState("all");
```

Use loader data for records:

```tsx
const { transactions, categories } = useLoaderData<typeof loader>();
```

## Creating a New Store

No store template is established. If a shared store is introduced later, document
the library, location, selector pattern, persistence policy, and verification
rules in this file in the same change.

## Async Actions

Do not put server writes into client-state stores. Use route actions and the db
repo boundary for finance mutations.

## Not Established Yet

- Shared client-state store layer
- Persisted UI preferences
- Server-state cache library
- Optimistic update policy

## Best Practices

1. Keep local UI state local.
2. Use route loaders for server-owned records.
3. Use route actions for server writes.
4. Use URL/search params only when state should be shareable or navigable.
5. Introduce shared state only when multiple unrelated owners need the same
   value.
