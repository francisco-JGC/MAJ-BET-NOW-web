# MajbetNow — Client Web (Admin)

React + TypeScript app for the admin panel. This document explains **how the
project is organized and how to add new features**. If you follow these rules,
the codebase stays predictable at any size.

## 1. Stack

| Concern                | Choice                              |
| ---------------------- | ----------------------------------- |
| Bundler / dev server   | Vite                                |
| UI                     | React 19 + TypeScript strict        |
| Routing                | react-router-dom v7                 |
| Server state           | @tanstack/react-query               |
| Client / UI state      | zustand (persisted for auth)        |
| HTTP client            | axios (single instance)             |
| Styles                 | Tailwind CSS v4 (via `@theme`)      |
| Component primitives   | shadcn/ui (added on demand)         |
| Forms                  | react-hook-form + zod               |
| Icons                  | lucide-react                        |
| Notifications          | sonner                              |
| Path alias             | `@/*` → `src/*`                     |

## 2. Folder structure

```
src/
├── app/                          # Composition root
│   ├── providers/                # React context providers (query, theme...)
│   │   └── query-provider.tsx
│   ├── router/                   # Router config + guards
│   │   ├── index.tsx
│   │   ├── protected-route.tsx
│   │   └── role-gate.tsx
│   └── layout/                   # Shell(s) shared by admin pages
│       └── admin-shell.tsx
│
├── features/                     # One folder per bounded context
│   ├── auth/
│   │   ├── api/                  # Pure HTTP calls, thin wrappers over axios
│   │   ├── hooks/                # useQuery / useMutation + local hooks
│   │   ├── store/                # Zustand stores (only when needed)
│   │   ├── components/           # Feature-owned UI components
│   │   ├── pages/                # Route entry points
│   │   └── types/                # Feature domain types
│   ├── games/
│   ├── schedules/
│   ├── draw-results/
│   ├── sale-points/
│   ├── users/
│   └── tickets/
│
├── shared/                       # Reusable, feature-agnostic building blocks
│   ├── api/                      # http client, error mapper
│   ├── ui/                       # shadcn/ui components (Button, Dialog, …)
│   ├── hooks/                    # useDebounce, usePagination, …
│   ├── lib/                      # utils (cn, dates, currency, …)
│   ├── types/                    # ApiError, Paginated<T>, …
│   └── constants/                # routes, env vars, roles
│
├── App.tsx                       # Top-level composition
├── main.tsx                      # ReactDOM entry
└── index.css                     # Tailwind + theme tokens
```

### Rules

- **Feature-first.** Business modules live in `features/`. A feature owns its
  data, hooks, components and pages. It never reaches into another feature's
  internals.
- **Shared is dependency-free of features.** `shared/*` must not import from
  `features/*`. Features may import from `shared/*` and from `app/*` (rarely).
- **`app/` composes the app.** Only providers, router and shells go here. Not
  business logic.

## 3. Layering inside a feature

Each feature is split by responsibility:

| Layer            | Rule of thumb                                              |
| ---------------- | ---------------------------------------------------------- |
| `types/`         | Domain types (entities, DTOs). Zero React.                 |
| `api/`           | Functions that call the backend. Return typed data. Zero React. |
| `hooks/`         | React hooks: `useQuery`, `useMutation`, orchestration.     |
| `store/`         | Zustand stores for **UI/session state** (not server data). |
| `components/`    | Presentational. Receive props, render UI, no data fetching. |
| `pages/`         | Route entry. Compose components + hooks. Almost no JSX logic. |

### Import direction (top-down only)

```
pages → components → hooks → api → types
                       ↘  store (allowed)
```

- `components/` never call `useQuery` directly — they receive already-loaded
  data through props. Container components (in `pages/`) do the fetching.
- `api/` never imports React.
- `store/` may be read from any layer; **only hooks or pages should mutate it**.

## 4. Server state vs client state

This is the single most important call in the app.

- **Server state (React Query).** Anything owned by the backend: `games`,
  `tickets`, `users`, etc. Cached, revalidated, invalidated per key. Never
  copy this data into Zustand.
- **Client state (Zustand).** Data the server does not know about: auth
  session (JWT + user), current UI filters, open dialogs. Small and scoped.

If you catch yourself keeping a list of `games` in Zustand *and* fetching them
with `useQuery`, you are duplicating truth. Delete the Zustand slice.

### Query keys

Keep them structured: `['games', 'list']`, `['games', 'detail', id]`. That way
`invalidateQueries({ queryKey: ['games'] })` refreshes everything under
`games`.

## 5. HTTP layer

- One `axios` instance in `shared/api/http.ts` with:
  - Request interceptor: attaches JWT from the auth store.
  - Response interceptor: on `401`, clears session and redirects to `/login`.
- All errors are normalized to `ApiError` (`shared/types/api.ts`) via
  `shared/api/error-mapper.ts` — the UI only handles that shape.
- Feature `api/*.ts` files import `http`, call an endpoint, return domain data.
  They never throw raw axios errors upward; components see `ApiError`.

## 6. Adding a new feature (recipe)

Suppose you want to add "Expenses" (Gastos).

1. **Create the folder** `features/expenses/` with `api/`, `hooks/`, `pages/`,
   `components/`, `types/`.
2. **Types**: `types/index.ts` — `Expense`, `CreateExpensePayload`, …
3. **API**: `api/expenses.api.ts` — `listExpenses()`, `createExpense(payload)`.
4. **Hooks**:
   - `hooks/use-expenses.ts` — wraps `useQuery({ queryKey: ['expenses', 'list', filters], queryFn: () => listExpenses(filters) })`.
   - `hooks/use-create-expense.ts` — `useMutation` that on success invalidates `['expenses']`.
5. **Components** (dumb): `ExpenseTable`, `ExpenseFormFields`.
6. **Page**: `pages/expenses-page.tsx` — composes hooks + components.
7. **Route**: add the path to `shared/constants/routes.ts` and register in
   `app/router/index.tsx`.
8. **Nav item**: add to the sidebar array in `app/layout/admin-shell.tsx`.

You never touch other features.

## 7. Custom hooks — when and how

Extract a hook when a component grows past ~100 lines or has any of:

- Local state that needs to be tested in isolation.
- More than one `useEffect` doing coordinated work.
- Non-trivial derivations from props/query data.

Naming: `useDoSomething()` (verb). File: `use-do-something.ts`. Return an
object with named fields, not a positional tuple, unless the hook has one
value.

## 8. Components — presentational, always

- Zero data fetching inside `components/`. They receive data via props.
- No `useState` for anything a parent needs to react to — lift it up.
- Prefer composition over prop drilling: expose `<Card><Card.Header/></Card>`
  style APIs when they help.
- No `default export` for reusable components (use named exports); pages may
  use `default export` if it improves DX with the router.

## 9. Styling

- Tailwind CSS v4 with tokens in `src/index.css` under `@theme`.
- The design language is dorado (`--color-primary`, `--color-accent`). Use
  Tailwind's `bg-primary`, `text-primary`, `bg-accent` etc.
- shadcn primitives live in `src/shared/ui/`. **Never edit** the generated
  files directly — extend via wrapper components in the feature that needs
  the tweak.

## 10. Naming conventions

| Thing                 | Case                       |
| --------------------- | -------------------------- |
| Files & folders       | `kebab-case`               |
| Components (exports)  | `PascalCase`               |
| Hooks                 | `useCamelCase`             |
| Types & interfaces    | `PascalCase`               |
| Constants             | `UPPER_SNAKE_CASE`         |
| Zustand stores        | `useThingStore`            |

## 11. Testing (later)

When we add tests we'll put them **next to the file** (`login-form.test.tsx`).
Run with Vitest + React Testing Library. Aim for hooks and pure functions
first; components only if the logic is meaningful.

## 12. Getting started

```bash
cd majbetnow-web
cp .env.example .env         # Point VITE_API_BASE_URL to your backend
npm install
npm run dev                  # http://localhost:5173
```

Login as `admin / admin123` against the backend at `VITE_API_BASE_URL`.

## 13. What to do next

The current codebase has the skeleton wired: auth store, http client, query
provider, router, protected & role-gated routes, admin shell with sidebar.
Everything under the shell is a placeholder — the next PRs will replace each
placeholder with the real page under its feature folder, in this order:

1. `draw-results/` — the most urgent (replaces the `curl` for daily results).
2. `games/` — CRUD + activate/deactivate.
3. `schedules/` — CRUD per game.
4. `sale-points/` — CRUD + assign owner.
5. `users/` — create sellers.
6. `tickets/` — read-only lookup + void.
