CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NULL,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);
CREATE UNIQUE INDEX uq_bookmark_user_dataset ON bookmarks(user_id, dataset_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX uq_bookmark_device_dataset ON bookmarks(device_id, dataset_id) WHERE device_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feed_health') THEN
    CREATE TYPE feed_health AS ENUM ('healthy','degraded','down');
  END IF;
END
$$;
CREATE TABLE feed_status (
  dataset_id UUID PRIMARY KEY REFERENCES datasets(id) ON DELETE CASCADE,
  last_checked TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status feed_health NOT NULL DEFAULT 'healthy',
  latency_ms INT NOT NULL DEFAULT 0,
  error_message TEXT NULL
);
