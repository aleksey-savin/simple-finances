# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev                 # dev server on port 3000
pnpm build               # production build
pnpm test                # run vitest once (vitest run)
pnpm vitest <path>       # run a single test file or pattern
pnpm lint                # eslint
pnpm format              # prettier --check
pnpm check               # prettier --write + eslint --fix (run before committing)

pnpm db:generate         # generate Drizzle migration from schema changes
pnpm db:studio           # open Drizzle Studio
```

Use pnpm (not npm/yarn). Add shadcn/ui components with `pnpm dlx shadcn@latest add <name>`.

**Never run `pnpm db:migrate` or `pnpm db:push`** — migrations are applied manually by the user. Generate the migration with `db:generate` and stop there.

## Stack

TanStack Start (SSR React 19) + TanStack Router (file-based) + TanStack Query + Drizzle ORM (Postgres via `pg`) + better-auth + Tailwind v4 + zustand. Nitro is the server runtime. Domain is SMB budgeting/finance; UI strings are largely in Russian.

Path aliases `#/*` and `@/*` both map to `./src/*` and are used interchangeably.

## Architecture

### Server functions live in feature `actions.ts`

All `createServerFn` calls live in `actions.ts` inside the matching component feature folder (e.g. `src/components/accounts/actions.ts`). There are ~20 such files.

- Do NOT create `*.server.ts`, `actions.server.ts`, or route-level `action.ts`/`actions.ts` files. If a route needs server functions, put them in the matching feature `actions.ts` and import them.
- Plain async helpers called only from server handlers (e.g. `requireOwner`) also live in that feature `actions.ts` — no need to wrap them in `createServerFn`.
- Server-only modules import `'@tanstack/react-start/server-only'` at the top and access `db` via `#/db/index.server`.
- Auth in handlers: call `requireSession()` from `#/utils/session.server` (throws `'Не авторизован'` if no user).

### Types layering (strict)

- **Raw DB types** (`Select`/`Insert`/`Update`) go in `src/db/types.ts`, derived from the Drizzle table objects in `src/db/schema.ts`. Add these whenever you add an entity.
- **Domain/view types** (compose/extend/pick from DB types — e.g. add a `role` field, nested relations, picked subsets) go in `src/types.ts`. Do NOT put them in the store or in component files.

### Scoping model (multi-tenant)

The app partitions data by an **AppScope** (`personal` or a company), backed by `current_account` rows the user belongs to (`current_account_user`). The selected scope is stored in the `app_scope` cookie. `src/lib/company-scope.ts` is the source of truth:

- `resolveScopedAccountIds(userId, headers)` → the `accountIds` the current scope can see.
- `getScopedCounterpartyIds(userId, scope)` → counterparties visible in scope, resolved through junction tables.

Server functions that read/write tenant data must filter by the scoped account/counterparty IDs — global queries leak data across scopes (a class of bug already fixed in history).

### Auth

better-auth configured in `src/utils/auth.server.ts` (Drizzle adapter, email+password, email OTP, 2FA via `twoFactor`, admin plugin). Access-control roles are defined in `utils/permissions.ts`. `authMiddleware` (`src/utils/auth-middleware.ts`) is wired into `__root.tsx`: it redirects unauthenticated users to `/login` and unverified second-factor sessions to `/verify-email`. Public routes are whitelisted there.

### Scheduled tasks (Nitro)

Nitro tasks live in `server/tasks/` (`recurring`, `proxmox-vm-manager`, `invoice-reminders`) and are registered in `vite.config.ts` under `nitro.scheduledTasks` (cron `* * * * *`). In dev, the Nitro runtime does not reliably fire scheduled tasks, so `server/plugins/dev-task-scheduler.ts` runs them via croner as a dev-only fallback (skipped when `process.env.TEST` is set).

Recurring-rule logic lives in `src/lib/recurring.ts`. Note: stored `nextRunAt` does not line up with croner — project occurrences via `ruleOccurrencesInMonth` (anchored on `nextRunAt`), don't recompute it.

### Client state

zustand store in `src/store/app-store.ts` holds shared reference data (accounts, categories, counterparties) with selectors. TanStack Query handles server data fetching/caching; each feature exposes a query key from its `actions.ts`.

## Conventions

### File uploads

Use `<DocumentUploader>` from `src/components/ui/document-uploader.tsx` for any entity needing attachments. It owns all upload UI state; you provide `onUpload`/`onRemove`/`documents` callbacks. For a new entity, follow the `contract_document` join-table pattern: add a `{entity}_document` table, reuse/add `uploadDocument` + `resolveDocumentUrl` and `add{Entity}Document`/`remove{Entity}Document` in the feature `actions.ts`, load documents via the join table and flatten to `documents: { id, name, url }[]` on the domain type. S3 keys follow `{entity}/{prefix}_{datetime}.{ext}`; pass `pathPrefix`/`fileNamePrefix` to `uploadBase64FileToS3`. Open a stored doc via the popup pattern (`window.open('about:blank')` then `popup.location.replace(url)` with `resolveDocumentUrl`).

### Delete components

Take an `entityId` prop, not the whole entity object.

### UI styling

- **No rounded corners.** Avoid `rounded`, `rounded-*`, or any `border-radius` on UI elements.
- Design language is defined in `DESIGN.md` ("Architectural Ledger"): no 1px section borders (use tonal shifts + whitespace), `tabular-nums` for all financial figures, muted `error`/`tertiary` palettes for expense/income rather than alert red/green, `on-surface` instead of pure black.
- Tailwind v4: bare `w-[--var]` silently breaks — use `w-[var(--var)]` or `w-(--var)`.

## Testing

Vitest + Testing Library (jsdom) are configured; no test files exist yet. New tests run under `pnpm test`. Set `TEST` env to disable the dev task scheduler during test runs.
