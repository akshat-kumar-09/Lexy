# Lexy

Personal vocabulary app (Next.js). Sign in with [Clerk](https://clerk.com) to sync your lexicon; your OpenAI API key stays in the browser only.

## Quick start

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with Clerk keys from the [Clerk dashboard](https://dashboard.clerk.com) and (for cloud sync) a [Neon](https://neon.tech) `DATABASE_URL`. In Neon’s SQL editor, run `scripts/neon-schema.sql` once.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Git & GitHub

This folder is a git repo on branch `main`. Do not commit `.env.local` — it is ignored.

Create a new empty repository on [GitHub](https://github.com/new), then:

```bash
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

## Deploy (e.g. Vercel)

1. Push the repo and **Import** it in the [Vercel dashboard](https://vercel.com/new).
2. **Environment variables** (Project → Settings → Environment Variables), for Production (and Preview if you use Clerk there too):
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `DATABASE_URL` (Neon pooled connection string)
3. In [Clerk](https://dashboard.clerk.com) → your application → **Domains**, add your Vercel URL (e.g. `https://your-app.vercel.app`) so sign-in and redirects work in production.
4. Deploy. You get a `*.vercel.app` URL; a custom domain is optional.

## Data & privacy

- **Lexicon (signed in):** Stored per Clerk user in your Postgres database (payload JSON).
- **OpenAI key:** Stored in `localStorage` on the device only; not sent to Lexy’s backend.
- **Exports:** Use **Download .txt** / **Download .json backup** on My Lexy, or **Import lexicon JSON** in Settings.
