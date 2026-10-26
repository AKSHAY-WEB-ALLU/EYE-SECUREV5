# EYE SECURE Quotation Builder V4 — Supabase + Vercel

This cloud edition keeps the original V4 HTML/CSS, quotation editor, live preview, object arranging, editable preview text, dark/light mode, customer/product library, history, analytics, GST/discount logic and print/PDF workflow. The original local JSON server has been replaced with a Supabase-backed API adapter.

## Hosting
- Frontend: Vercel static deployment from this repository root.
- Database and authentication: Supabase project `eye-secure-v4`.
- Source control: GitHub repository `AKSHAY-WEB-ALLU/eye-secure-v4`.

## Supabase setup
The cloud project already has the `shared_records` table migration applied. For a new Supabase project, run `supabase/migrations/20261026_shared_records.sql` in the SQL editor.

The browser config is in `supabase-config.js` and contains only the project URL and publishable key. A publishable key is safe to use in browser code when Row Level Security is enabled. Never put a Supabase service-role key in this file.

## Authentication and shared data
Users must sign up with email/password and confirm their email if Supabase email confirmation is enabled. Signed-in users can read, add, edit and delete shared quotations, bills, customers and products. These records are shared between authenticated users, as requested. Do not use this policy if each account should have private records instead.

## Deploy to Vercel
1. Import `AKSHAY-WEB-ALLU/eye-secure-v4` from GitHub in Vercel.
2. Set the root directory to the repository root.
3. Framework preset: **Other**; build command: `npm run build`; output directory: `public`. The included `vercel.json` also defines these settings.
4. Deploy. Future pushes to `main` will trigger a new deployment.

## Local preview
Because the app uses the Supabase CDN and a public config file, serve the folder with any static web server (for example `npx serve .`). Do not open `index.html` as a `file://` URL.

## Important
- Keep the `supabase-config.js` project URL and publishable key public; do not add service-role keys or passwords.
- Supabase Auth and row-level security protect database access. Only signed-in users can access shared records.
- The `data/` JSON files and `server.js` from the LAN build are intentionally not used in the cloud deployment.
