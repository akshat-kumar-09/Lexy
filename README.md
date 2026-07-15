# Lexy

Personal vocabulary app (Next.js). Sign in with [Clerk](https://clerk.com) to sync your lexicon; the app runs on a single shared Anthropic key configured by the deployer — no user ever needs their own key.

## Quick start

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with an `ANTHROPIC_API_KEY` (powers Morning Scribble, Metaphors, and Deep Dive for everyone), Clerk keys from the [Clerk dashboard](https://dashboard.clerk.com), and (for cloud sync) a [Neon](https://neon.tech) `DATABASE_URL`. In Neon’s SQL editor, run `scripts/neon-schema.sql` once.

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
   - `ANTHROPIC_API_KEY` (the one shared key — never exposed to the browser)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `DATABASE_URL` (Neon pooled connection string)
3. In [Clerk](https://dashboard.clerk.com) → your application → **Domains**, add your Vercel URL (e.g. `https://your-app.vercel.app`) so sign-in and redirects work in production.
4. Deploy. You get a `*.vercel.app` URL; a custom domain is optional.

## Data & privacy

- **Lexicon (signed in):** Stored per Clerk user in your Postgres database (payload JSON).
- **Claude key:** One `ANTHROPIC_API_KEY` set on the server. It never reaches the browser — the client calls Lexy’s same-origin `/api/claude/chat` proxy, which attaches the shared key server-side on every request.
- **Exports:** Use **Download .txt** / **Download .json backup** on My Lexy, or **Import lexicon JSON** in Settings.
