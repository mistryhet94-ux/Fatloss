# Fat Loss Plan Tracker

A static, no-build web app: 6-day machine-only workout tracker, weight log with trend chart, and a calorie/deficit calculator. All data is stored in your browser (`localStorage`) — nothing is sent to a server.

## Files

- `index.html` — page shell
- `style.css` — all styling
- `app.js` — all logic (workout plan data, weight log, calorie tracker, deficit calculation)
- `manifest.json` — lets you "Add to Home Screen" on your phone

## Deploy to GitHub

1. Create a new repository on GitHub (e.g. `fatloss-app`).
2. Upload these files to the repo root (or `git push` them).

## Publish with Cloudflare Pages

1. Go to the Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select your GitHub repo.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/` (root)
4. Click **Save and Deploy**. Cloudflare gives you a `*.pages.dev` URL — you can later attach a custom domain if you want.

## Notes for future edits

- Since data lives in `localStorage`, it's per-browser/device — no login, no sync between phone and laptop.
- Every push to the connected GitHub branch auto-redeploys on Cloudflare Pages, so updates go live within a minute or two.
- If you ever want data to sync across devices, that would need a small backend (e.g. Cloudflare Workers KV) — a bigger change, ask if you want that added later.
