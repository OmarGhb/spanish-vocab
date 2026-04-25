@AGENTS.md

# Spanish Vocab — Codebase Guide

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4
Supabase (Postgres + Auth) · ts-fsrs · Anthropic API · Vercel

## Architecture rules

**Server Components by default.**
Add `'use client'` only when you need browser APIs, event handlers, or React hooks.

**Anthropic and FSRS logic is server-side only.**
Never import `lib/anthropic.ts` or `lib/fsrs.ts` from a Client Component.

**Supabase clients:**
- `lib/supabase/server.ts` → Server Components, API Route Handlers, middleware
- `lib/supabase/client.ts` → Client Components only

**RLS is the auth boundary.**
All three tables have row-level security. You do not need to manually filter
by `user_id` in queries — Supabase enforces it automatically.

**Route Handlers over Server Actions for data endpoints.**
Use `app/api/**/route.ts` for word creation and review submission.
Server Actions are fine for simple form mutations (e.g., login).

**Protected routes** live under `app/(app)/`.
`app/(app)/layout.tsx` redirects unauthenticated users to `/login`.
`middleware.ts` refreshes the Supabase session cookie on every request.

## Next.js 16 notes
- `publicRuntimeConfig` is removed — use `NEXT_PUBLIC_` env vars for client-accessible config.
- Route Handlers use the Web API: `return Response.json(data)`, not `res.json(data)`.
- Read `node_modules/next/dist/docs/` before using any Next.js feature not listed above.

## When in doubt
- Ambiguous product decision (UX, naming, scope) → ask before coding.
- Ambiguous technical decision (library choice, file location) → propose 2 options, recommend one, wait for me.
- Clear technical execution → just do it.
