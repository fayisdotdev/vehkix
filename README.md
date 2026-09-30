# Vehkix

Vehkix manages each signed-in user's private vehicle collection with React, Vite, and Supabase. The interface only reads `user_vehicles`; it has no public vehicle section and no local data fallback.

## Supabase setup

1. Run or re-run [`supabase/user-accounts.sql`](supabase/user-accounts.sql) to add unique usernames, Auth signup handling, the private `user_vehicles` table, and the private `user-vehicle-images` Storage bucket with per-user policies.
2. Supabase Auth enforces unique email addresses; the profiles index makes usernames unique regardless of case. Row-level security restricts each user's vehicle records and images to that user.
3. `supabase/setup.sql` is legacy demo data only; it drops and recreates `public.vehicles`, which this interface no longer reads. It is not needed for the private collection app.
4. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the project URL and publishable/anon key. Never expose a `service_role` key in browser code or GitHub Pages settings.

## GitHub Pages

The built site is published from the `gh-pages` branch at `https://fayisdotdev.github.io/vehkix/`. GitHub Actions is not used.

1. In the repository's **Settings > Pages**, set **Source** to **Deploy from a branch**, choose `gh-pages`, and choose `/(root)`.
2. Commit and push source changes to `main`, then run `npm run deploy`. It builds `docs/` and publishes it to `gh-pages`; the first run creates that branch.
3. Keep `.env` local and ignored. The Supabase URL and anon/publishable key are embedded in the built browser app, so only use the anon key protected by row-level security. Never use a `service_role` key.

## Local development

```sh
npm install
npm run dev
```

Build and lint with `npm run build` and `npm run lint`.
