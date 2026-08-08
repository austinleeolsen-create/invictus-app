# Invictus Hub

Next.js + TypeScript + Tailwind foundation with Supabase authentication/RLS and a server-only Stripe test reconciliation.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL and publishable/anon key.
3. Add the new restricted **test** Stripe key to `STRIPE_SECRET_KEY`. Never use a `NEXT_PUBLIC_` prefix for it.
4. Install dependencies with `pnpm install`, then run `pnpm dev`.

The reconciliation endpoint accepts only authenticated `owner_admin` users, reads Stripe subscriptions, and compares their IDs with `public.player_billing.stripe_subscription_id`. It does not mutate Stripe or Supabase.

## Vercel

Import the repository, choose `invictus-hub` as the Root Directory, then add all three environment variables in Project Settings → Environment Variables. Redeploy after adding or changing variables.
