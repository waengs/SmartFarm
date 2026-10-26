-- SmartFarm Crop Database Schema
-- CSE3CWA / CSE5006 Assignment 2

CREATE TABLE IF NOT EXISTS crops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crop_name TEXT NOT NULL UNIQUE CHECK (crop_name IN ('Tomato', 'Lettuce', 'Wheat', 'Maize')),
  location TEXT NOT NULL,
  target_min REAL NOT NULL CHECK (target_min >= 0 AND target_min <= 100),
  target_max REAL NOT NULL CHECK (target_max >= 0 AND target_max <= 100),
  normal_water REAL NOT NULL CHECK (normal_water > 0 AND normal_water <= 10000),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (target_min < target_max)
);

-- Seed initial records only if not already present
INSERT OR IGNORE INTO crops (crop_name, location, target_min, target_max, normal_water, notes)
VALUES
  ('Tomato', 'Greenhouse A', 55, 75, 500, ''),
  ('Lettuce', 'Greenhouse B', 60, 80, 400, ''),
  ('Wheat', 'North Field', 35, 55, 300, '');

-- Note: Maize is deliberately NOT seeded so markers can test Crop Card creation immediately.
