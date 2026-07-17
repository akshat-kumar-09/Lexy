-- Run once in the Neon SQL editor (or any Postgres connected to DATABASE_URL).
CREATE TABLE IF NOT EXISTS lexicon_snapshots (
  user_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lexicon_snapshots_updated_at_idx ON lexicon_snapshots (updated_at DESC);

-- Periodic checkpoints of each user's lexicon, so a bad sync/merge/device mixup
-- can be rolled back from Settings instead of being unrecoverable.
CREATE TABLE IF NOT EXISTS lexicon_history (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lexicon_history_user_created_idx ON lexicon_history (user_id, created_at DESC);
