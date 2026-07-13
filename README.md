# Fat Loss Plan Tracker

A static, no-build web app: 6-day machine-only workout tracker, weight log with trend chart, and a calorie/deficit calculator. Data is stored in Supabase, tied to an anonymous device session — so it's yours as long as you use the same browser/device (see notes below).

## Files

- `index.html` — page shell (loads the Supabase JS SDK + app.js)
- `style.css` — all styling
- `app.js` — all logic (workout plan data, weight log, calorie tracker, deficit calculation)
- `manifest.json` — lets you "Add to Home Screen" on your phone
- `supabase-schema.sql` — run this once in your Supabase project to create the tables and security rules

## 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → create a free project.
2. **Dashboard → SQL Editor → New query** → paste the entire contents of `supabase-schema.sql` → **Run**.
3. **Dashboard → Authentication → Providers → Anonymous Sign-Ins** → toggle **ON**. This lets the app create a private, login-free identity for your data — no email/password needed.
4. **Dashboard → Settings → API** → copy your **Project URL** and **anon public key**.
5. Open `app.js` and replace the two placeholders near the top:
   ```js
   const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```
   The anon key is safe to commit/publish — it only works within the Row Level Security rules the SQL script sets up. **Never use or share the `service_role` key** — that one bypasses all security.

## 2. Deploy to GitHub

1. Create a new repository (e.g. `fatloss-app`).
2. Upload all files in this folder to the repo root.

## 3. Publish with Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select your GitHub repo.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/` (root)
4. **Save and Deploy**. You'll get a `*.pages.dev` URL.

## Notes

- Anonymous auth creates an identity stored in the browser's local session — if you clear site data, switch browsers, or use a different device, you'll get a *new* anonymous identity with no history. To make data follow you across devices, add real login (e.g. Supabase email magic link) — ask if you want that added.
- Every push to the connected GitHub branch auto-redeploys on Cloudflare Pages, live within a minute or two.
