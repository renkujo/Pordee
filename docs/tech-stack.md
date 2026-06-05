# Pordee Tech Stack

This document records the first implementation stack decision for the new standalone `พอดี / Pordee` app.

## Product Direction

Pordee will be a mobile-first PWA personal finance app.

Desktop is still a first-class responsive experience, but it should adapt into a dashboard shell rather than become a separate product. Mobile and desktop must share the same routes, business logic, data model, and feature set.

## Frontend

- React Router v7
- Vite
- TypeScript
- Tailwind CSS v4
- shadcn/ui as the component base
- LINE Seed Sans TH/EN as the primary UI font
- PWA support

Use shadcn/ui as owned component source, not as an untouched default theme. Components should be adapted to Pordee tokens, spacing, radius, typography, and interaction patterns.

## App Shell Direction

Mobile:

- bottom navigation
- single-column task flows
- fast transaction entry
- thumb-friendly controls
- PWA installability

Desktop:

- dashboard shell
- wider overview surfaces
- sidebar or top-level navigation when useful
- same feature set as mobile
- same route and data contracts as mobile

Responsive behavior should start from mobile and progressively enhance upward.

## Backend And Data

- Postgres as the primary database
- Drizzle ORM
- Zod for validation and typed boundaries
- React Router loaders/actions for the first server boundary

If backend complexity grows, introduce a dedicated API layer such as Hono later. Do not add it before there is enough route/API complexity to justify the extra boundary.

## Deployment

- Docker-first deployment
- Dokploy target
- Postgres deployed as a service with persistent storage
- Environment variables managed through Dokploy
- Database migrations should be part of the deploy/runbook flow

## Initial Architecture Bias

- Keep the app deployable as a single web service plus Postgres.
- Keep business logic shared between mobile and desktop views.
- Keep the UI mobile-first, but do not hide desktop functionality.
- Avoid making a marketing landing page as the first product screen.
- Prefer practical product screens: dashboard, transaction entry, history, categories, budgets, goals, and settings.
