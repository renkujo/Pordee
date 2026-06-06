# Pordee UI Direction

This document records the accepted UI direction for the first Pordee implementation.

## Visual Reference Status

Use these generated concepts as direction, not as exact implementation screenshots:

- Mobile dashboard v2: mobile-first base direction
- Desktop dashboard v2: primary desktop dashboard reference
- Add Transaction desktop v1: primary add-entry workflow reference
- Transaction History desktop v1: transaction table/filter reference
- Goals desktop v1: goal progress and contribution reference

## Product UI Principle

Pordee should feel like a calm daily money tracker, not a fintech analytics showcase.

The UI should prioritize:

- fast transaction entry
- easy scanning
- clear month status
- practical filtering and correction
- calm goal tracking
- mobile-first flows that expand into desktop dashboard layouts

## Design System Direction

Use shadcn/ui as the component base, customized for Pordee.

Preferred component feel:

- flat white surfaces
- 1px subtle borders
- restrained 10-16px radius
- minimal shadows or no shadows
- simple Lucide-style line icons
- clear dividers
- labels above inputs
- practical tables/lists
- readable Thai typography

Avoid using shadcn/ui in its default visual state. Apply Pordee tokens, spacing, typography, and interaction patterns.

## Brand Tokens

- Background sky: `#EAF7FF`
- Surface white: `#FFFFFF`
- Text charcoal: `#172026`
- Muted text: `#6C7D86`
- Coral action / expense: `#F76A5D`
- Teal income / positive: `#129C91`
- Pale lime milestone: `#D6E86F`

Lime should stay tiny. Do not let it become a primary UI color.

## Logo Usage

Use `app/public/logo/direct/pordee-logo-mark-direct-01.png` as the current shipped app UI logo mark.

In implementation:

- keep the logo small and practical in app chrome
- pair the mark with HTML text `พอดี` when needed
- do not use generated wordmark text as UI text
- keep favicon and install-icon rasters generated from the shipped logo mark
  with `pnpm icons:build`
- trace/vectorize the mark before trademark- or app-store-grade vector export

## Mascot Usage

Use mascot PNG assets from `app/public/brand/mascots/` only in supportive moments.

Do not place the mascot in the core dashboard chrome or primary logo area.

Good mascot moments:

- empty states
- success confirmations
- gentle warnings
- onboarding/tips

## Mobile Direction

Mobile is the primary product surface.

Use:

- bottom navigation
- single-column flows
- thumb-friendly controls
- fast transaction composer near the top
- list-card transaction history
- compact goal cards

The mobile dashboard should not become a landing page or a decorative hero screen.

## Desktop Direction

Desktop is a responsive dashboard shell for the same PWA.

Use:

- quiet left sidebar
- active nav as subtle sky-tinted row
- main dashboard content with wider scanning surfaces
- transaction workflow still central
- tables for transaction history
- progress rows/cards for goals

Desktop should expand mobile functionality, not replace it with unrelated analytics.

## Key Screens

### Dashboard

Purpose: show monthly status and keep add-entry workflow close.

Required elements:

- month overview header
- balance summary
- quick transaction composer
- income/expense compact stats
- recent transactions
- goal/progress strip
- category budget rows on desktop

Avoid flashy charts and gradient balance heroes.

### Add Transaction

Purpose: make adding money events fast and understandable.

Required elements:

- quick-entry input, e.g. `กาแฟ 65`
- examples/chips
- income/expense segmented control
- parsed preview
- editable fields for title, amount, category, date, note
- primary save button
- recent transactions and frequent categories as support content

Use copy like `ตรวจรายการก่อนบันทึก` rather than generic parser labels.

### Transaction History

Purpose: search, filter, inspect, and correct transactions.

Required elements:

- search
- date/month selector
- all/expense/income segmented control
- category filter
- compact summary strip
- desktop table
- mobile list cards
- row action menu

### Goals

Purpose: calm progress tracking, not gamification.

Required elements:

- goal summary strip
- goal cards/rows with thin progress bars
- add contribution panel
- contribution history
- planning note

Avoid trophies, confetti, badges, and overly playful reward visuals.

## Avoid

- Dribbble fintech gradients
- glassmorphism
- glowing cards
- fake complex analytics
- wallet, piggybank, coin-stack, or bank icons
- mascot in dashboard chrome
- emoji, flags, weather icons
- decorative blobs
- neon colors
- purple/blue startup palette
- huge shadows
- pill overload
- tiny unreadable text
- marketing copy inside app screens
- enterprise SaaS cosplay

## Implementation Notes

- Use solid coral buttons, not gradients.
- Use line icons in muted colors; avoid colorful category icon bubbles unless they have clear product value.
- Keep transaction entry central on both mobile and desktop.
- Use Postgres-backed data shapes that map cleanly to mobile cards and desktop tables.
- Keep responsive behavior mobile-first, then progressively enhance for desktop.
