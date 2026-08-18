PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  role TEXT NOT NULL DEFAULT 'CUSTOMER',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_key TEXT NOT NULL UNIQUE,
  mt5_account TEXT UNIQUE,
  broker TEXT,
  symbol TEXT NOT NULL DEFAULT 'XAUUSD',
  status TEXT NOT NULL DEFAULT 'PENDING',
  activated_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  license_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(license_key) REFERENCES licenses(license_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mt5_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mt5_account TEXT NOT NULL UNIQUE,
  broker TEXT,
  mt5_password_enc TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monitor_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_key TEXT NOT NULL UNIQUE,
  mt5_account TEXT NOT NULL UNIQUE,
  monitor_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(license_key) REFERENCES licenses(license_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mt5_monitor (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_key TEXT NOT NULL UNIQUE,
  mt5_account TEXT NOT NULL,
  broker TEXT,
  server TEXT,
  balance REAL DEFAULT 0,
  equity REAL DEFAULT 0,
  margin REAL DEFAULT 0,
  free_margin REAL DEFAULT 0,
  margin_level REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  symbol TEXT DEFAULT 'XAUUSD',
  positions INTEGER DEFAULT 0,
  buy_positions INTEGER DEFAULT 0,
  sell_positions INTEGER DEFAULT 0,
  total_lots REAL DEFAULT 0,
  floating_profit REAL DEFAULT 0,
  swap REAL DEFAULT 0,
  ea_status TEXT,
  license_status TEXT,
  last_update TEXT,
  FOREIGN KEY(license_key) REFERENCES licenses(license_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS position_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket TEXT NOT NULL,
  license_key TEXT NOT NULL,
  mt5_account TEXT NOT NULL,
  symbol TEXT,
  position_type TEXT,
  volume REAL DEFAULT 0,
  open_price REAL DEFAULT 0,
  current_price REAL DEFAULT 0,
  sl REAL DEFAULT 0,
  tp REAL DEFAULT 0,
  profit REAL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ticket, license_key),
  FOREIGN KEY(license_key) REFERENCES licenses(license_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mt5_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket TEXT NOT NULL,
  license_key TEXT NOT NULL,
  mt5_account TEXT NOT NULL,
  symbol TEXT,
  position_type TEXT,
  volume REAL DEFAULT 0,
  open_price REAL DEFAULT 0,
  current_price REAL DEFAULT 0,
  sl REAL DEFAULT 0,
  tp REAL DEFAULT 0,
  profit REAL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ticket, license_key)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_user_licenses_user ON user_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_monitor_last_update ON mt5_monitor(last_update);
CREATE INDEX IF NOT EXISTS idx_positions_license ON position_details(license_key);

-- Optional smoke-test records. Uncomment only for local testing.
-- INSERT INTO licenses (license_key, mt5_account, broker, status, activated_at, expires_at)
-- VALUES ('GVX-SMOKE-TEST', '12345678', 'TEST-SERVER', 'ACTIVE', datetime('now'), datetime('now','+30 days'));
