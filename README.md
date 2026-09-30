# Vehkix

Vehicle register built with React, Vite, and Supabase. Public and personal vehicles load only from Supabase; connection or schema problems are shown in the interface, with no local data fallback.

## Supabase setup

1. Run [`supabase/setup.sql`](supabase/setup.sql) only to reset and reseed the public vehicle table. It drops and recreates `public.vehicles`.
2. Run or re-run [`supabase/user-accounts.sql`](supabase/user-accounts.sql) to add unique usernames, Auth signup handling, the private `user_vehicles` table, and the private `user-vehicle-images` Storage bucket with per-user policies.
3. Supabase Auth enforces unique email addresses; the profiles index makes usernames unique regardless of case. Public vehicle rows are readable by everyone, while personal rows are private to their owner.
4. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the project URL and publishable/anon key. Never expose a `service_role` key in browser code or GitHub Pages settings.

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` deploys the `main` branch to `https://fayisdotdev.github.io/vehkix/`.

1. In the repository's **Settings > Secrets and variables > Actions**, add the `VITE_SUPABASE_URL` repository variable and `VITE_SUPABASE_ANON_KEY` repository secret.
2. In **Settings > Pages**, choose **GitHub Actions** as the build and deployment source.
3. Push to `main` or manually run **Deploy to GitHub Pages** in the Actions tab.

## Local development

```sh
npm install
npm run dev
```

Build and lint with `npm run build` and `npm run lint`.
