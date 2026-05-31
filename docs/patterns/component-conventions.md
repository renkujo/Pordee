# Component Conventions

This page reflects current component ownership and preferred direction. It does
not mean every current route has already been split into small components.

## Code Organization

### Current Reality

- Route modules often contain loader/action logic and page UI together.
- Shared primitives live in `app/app/components/ui/`.
- Shell navigation lives in `app/app/components/shell/`.
- Brand-specific presentation lives in `app/app/components/brand/`.
- Some route files are large while the product is still moving quickly.

### Preferred Direction

Use clear local sections when a component or route grows enough to need them.
Keep comments sparse and useful.

Suggested order for larger files:

1. Imports
2. Local types
3. Constants and formatters
4. Loader/action/meta
5. Main route component
6. Owner-local child components
7. Owner-local helpers

Inside large components, group state and derivations when it helps scanning:

- `_State`
- `_Memo`
- `_Event`
- `_Form`

Do not add section comments to small files.

## Template

Current repo prop types use plain interface names.

```tsx
interface TransactionRowProps {
  title: string;
  amount: string;
}

export function TransactionRow({ title, amount }: TransactionRowProps) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3">
      <span>{title}</span>
      <strong>{amount}</strong>
    </div>
  );
}
```

## Route Components

- Keep route modules aligned with React Router conventions.
- Use loaders for route reads.
- Use actions for form mutations.
- Keep route-specific filter state local unless URL state or shared ownership is
  needed.
- Extract owner-local components when JSX becomes hard to scan.

## Domain or Module Partials

No dedicated route-partial folder exists yet. If a route needs extraction, use
an owner-local pattern first before moving anything into shared UI.

## Owner-Local Data

Keep copy, nav items, badge labels, options, and placeholder arrays with the
owner when only one route/component uses them.

## Shared UI Rules

`components/ui` is for domain-neutral primitives:

- buttons
- inputs
- labels
- popovers
- select controls
- badges
- cards
- dialogs

Do not put transaction-specific, goal-specific, or wallet-specific behavior into
shared primitives.

## Preferred Direction

- Keep mobile-first route flows ergonomic before adding desktop-only structure.
- Use Lucide icons through components where icons are needed.
- Keep mascot assets supportive and contextual.
- Extract shared components after real cross-route reuse, not after a single
  similar-looking block.
