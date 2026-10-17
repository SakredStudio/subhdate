-- ShubhDate D1 schema. Apply: wrangler d1 execute shubhdate --file schema.sql
-- Privacy: no names, emails or phone numbers anywhere. Purchase tokens are stored as SHA-256 hashes.

CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,                     -- uuid
  sku TEXT NOT NULL,                       -- 'report_single' | 'family_annual'
  source TEXT NOT NULL DEFAULT 'play',
  device_id TEXT NOT NULL,                 -- anonymous UUID from the app
  purchase_token_hash TEXT NOT NULL UNIQUE,-- sha256(purchaseToken), base64url
  order_id TEXT,                           -- Play orderId (GPA.xxxx), for support
  expires_at INTEGER,                      -- unix seconds; NULL for consumables
  created_at INTEGER NOT NULL,
  revoked_at INTEGER                       -- refund / RTDN revocation
);
CREATE INDEX IF NOT EXISTS entitlements_device ON entitlements(device_id);

CREATE TABLE IF NOT EXISTS rtdn_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at INTEGER NOT NULL,
  message_id TEXT NOT NULL UNIQUE,         -- Pub/Sub messageId (idempotency)
  notification_type INTEGER,               -- Play notificationType (subscription or one-time)
  purchase_token_hash TEXT,
  raw TEXT NOT NULL                        -- the decoded DeveloperNotification JSON
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,                     -- uuid issued on subscribe
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  tz TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en',
  region TEXT NOT NULL DEFAULT 'north',
  topics TEXT NOT NULL DEFAULT 'festivals',-- comma list: festivals,ekadashi,saved
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders_sent (
  sub_id TEXT NOT NULL,
  key TEXT NOT NULL,                       -- e.g. 'diwali|2026-11-08'
  sent_at INTEGER NOT NULL,
  PRIMARY KEY (sub_id, key)
);
