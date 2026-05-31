# Git Commit Guide

This repo does not currently enforce commit formatting with commitlint or git
hooks. This guide reflects recent history and a conservative local baseline.

## Commit Message Format

```text
<type>: <short imperative subject>
```

Recent examples:

- `feat: add auth flow and dokploy config`
- `fix: pin auth dependency for dokploy build`
- `feat: improve finance flows and history UX`
- `Improve goals tablet layout`

History is mostly concise and descriptive, with several conventional
`type: subject` commits. Prefer that format for new commits.

## Commit Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **refactor**: Code restructuring without feature change
- **test**: Test changes
- **build**: Build or tooling changes
- **chore**: Maintenance changes

## Subject Line Rules

- Keep the subject concise.
- Use present tense and imperative mood when practical.
- Do not end with a period.
- Use English unless the change is explicitly documentation/copy work that is
  clearer in Thai.

## Valid Examples

```bash
git commit -m "docs: add repo onboarding guide"
git commit -m "feat: add postgres-backed transaction repo"
git commit -m "fix: clear auth cookie on logout"
git commit -m "test: cover history filters"
```

## Body and Footer

Use the body when the reason is not obvious from the diff, especially for
architecture, deploy, dependency, or data migration changes.

No issue-linking or breaking-change footer convention is established yet.

## Checks Before Commit

Run from `app/`.

- `pnpm typecheck`
- `pnpm lint`
- `pnpm format:check`
- `pnpm test`

Add `pnpm build` for production-facing changes and `pnpm e2e` for user-flow
changes.

## Tips for Good Commits

1. Keep one logical change per commit.
2. Keep docs commits separate when practical.
3. Align with recent history so `git log` stays easy to scan.
4. Avoid staging unrelated dirty files.

## Important Note

If the project later adds commitlint or hook enforcement, update this guide to
match the enforced rules.
