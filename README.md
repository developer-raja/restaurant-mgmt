# 🍗 Chicken Nova

Phone-first restaurant manager. Menu, orders/billing, stock, sales — no paper, no pen.

**Stack:** Next.js (App Router) · Tailwind · Supabase (auth + Postgres) · Netlify hosting. All free tier.

---

## 1. Create the Supabase project (free)

1. Go to https://app.supabase.com → **New project**. Pick a name + DB password.
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), **Run**.
3. **Project Settings → API** → copy:
   - `Project URL`
   - `anon public` key
4. (Optional) **Authentication → Providers → Email**: turn **off** "Confirm email" while testing so signup logs you in instantly.

## 2. Add your keys

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 3. Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

Open the app → **Sign up** with your email/password (that's your owner account) → start adding your menu (Chicken Rice, Chicken 65…).

**Want demo data?** After signing up once, run [`supabase/sample_data.sql`](supabase/sample_data.sql) in the Supabase SQL Editor. Loads a starter menu, stock, and a week of orders so the dashboard + charts have something to show. Re-running it resets your data, so skip it once you're entering real orders.

## 4. Deploy to Netlify (free)

1. Push this folder to a GitHub repo.
2. Netlify → **Add new site → Import from GitHub** → pick the repo.
3. Build settings auto-detected (`npm run build`). Add the two env vars from step 2 under **Site settings → Environment variables**.
4. Deploy. Add the deployed URL to Supabase **Authentication → URL Configuration → Site URL**.

---

## What's inside

| Tab | Does |
|-----|------|
| 🏠 Home | Today's sales, order count, low-stock alerts, quick actions |
| 🍽️ Menu | Add/edit/delete dishes, price, availability toggle |
| ➕ Sell | Tap items → qty → cash/UPI/card → charge. Saves the order |
| 📦 Stock | Track items, quick +/− adjust, low-stock threshold |
| 📈 Sales | Today / 7d / 30d revenue, 7-day bar chart, top items |

Single owner login. Every row is scoped to you via Postgres Row-Level Security — your data stays private.

## Grow later

- More items: just add them in **Menu**.
- Staff logins: add accounts; RLS already scopes by `owner_id` (extend to a shared `restaurant_id` when you add a team).
- Categories, GST, receipts, KOT printing — all easy next steps.
