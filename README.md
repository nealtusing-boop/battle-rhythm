# Battle Rhythm

Battle Rhythm is a mobile-first platoon operations hub rebuilt from your Figma prototype into a fresh Next.js + Supabase + Vercel stack.

## 1. Create the app

Use the latest official Next.js starter with **no `src/` directory**:

```bash
npx create-next-app@latest battle-rhythm --ts --tailwind --eslint --app --use-npm --no-src-dir --import-alias "@/*"
```

Then replace the generated files with the contents of this project.

## 2. Install dependencies

```bash
npm install
```

## 3. Environment variables

Copy `.env.example` to `.env.local` and fill in the values.

## 4. Supabase

Run `supabase/schema.sql` in the SQL editor.

After that, create your first admin by signing up in the app, then run:

```sql
update public.profiles
set role = 'admin'
where full_name = 'Your Name Here';
```

## 5. VAPID keys for push notifications

Generate VAPID keys locally:

```bash
npx web-push generate-vapid-keys
```

Use the generated public/private keys in `.env.local` and in Vercel environment variables.

## 6. Run locally

```bash
npm run dev
```

## 7. Deploy to Vercel

- Push this repo to GitHub.
- Import the repo into Vercel.
- Add the same environment variables from `.env.local`.
- Deploy.

## Notes

- The app is protected behind Supabase auth.
- Only admins can open `/admin` or create/update data.
- Push notifications fire when an admin posts a new alert.
- The UI intentionally preserves the Figma premium maroon/white mobile-card feel while moving to a maintainable Next.js structure.
