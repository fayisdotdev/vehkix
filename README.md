# Vehkix

Vehkix manages each signed-in user's private vehicle collection with React, Vite, and Supabase. The interface only reads `user_vehicles`; it has no public vehicle section and no local data fallback.

## Supabase setup

1. Run or re-run [`supabase/user-accounts.sql`](supabase/user-accounts.sql) to add unique usernames, Auth signup handling, the private `user_vehicles` table, and the private `user-vehicle-images` Storage bucket with per-user policies.
2. Supabase Auth enforces unique email addresses; the profiles index makes usernames unique regardless of case. Row-level security restricts each user's vehicle records and images to that user.
3. `supabase/setup.sql` is legacy demo data only; it drops and recreates `public.vehicles`, which this interface no longer reads. It is not needed for the private collection app.
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
