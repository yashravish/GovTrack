CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  indexed_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_records_dataset ON records(dataset_id);
CREATE INDEX idx_records_text_trgm ON records USING gin (indexed_text gin_trgm_ops);
