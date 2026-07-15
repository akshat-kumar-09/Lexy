-- Run once in the Neon SQL editor (or any Postgres connected to DATABASE_URL).
CREATE TABLE IF NOT EXISTS lexicon_snapshots (
  user_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lexicon_snapshots_updated_at_idx ON lexicon_snapshots (updated_at DESC);
