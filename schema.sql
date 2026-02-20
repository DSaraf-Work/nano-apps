-- Remindly D1 schema
-- Stores reminders created via iOS Shortcuts, pending sync to the PWA

CREATE TABLE IF NOT EXISTS reminders (
  id          TEXT    PRIMARY KEY,
  title       TEXT    NOT NULL,
  description TEXT    DEFAULT '',
  next_fire_at INTEGER NOT NULL,          -- Unix ms timestamp
  repeat      TEXT    DEFAULT 'none',     -- none | daily | weekly | hourly | interval
  interval_ms  INTEGER DEFAULT 0,
  follow_ups   TEXT    DEFAULT '[]',      -- JSON array
  synced      INTEGER DEFAULT 0,          -- 0 = pending pull, 1 = pulled by PWA
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_synced ON reminders (synced, created_at);
