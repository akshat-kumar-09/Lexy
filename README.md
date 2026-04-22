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

## Git

From this folder:

```bash
git init
git add .
git commit -m "Initial commit"
```

Create a repository on GitHub (or similar), add `origin`, and push. Do not commit `.env.local` — it is already ignored.

## Deploy (e.g. Vercel)

1. Push the repo and import the project in [Vercel](https://vercel.com).
2. Set environment variables: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL` (same values as local).
3. Deploy. You get a `*.vercel.app` URL with no custom domain required.

## Data & privacy

- **Lexicon (signed in):** Stored per Clerk user in your Postgres database (payload JSON).
- **OpenAI key:** Stored in `localStorage` on the device only; not sent to Lexy’s backend.
- **Exports:** Use **Download .txt** / **Download .json backup** on My Lexy, or **Import lexicon JSON** in Settings.
