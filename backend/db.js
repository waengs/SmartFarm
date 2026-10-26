const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'smartfarm.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency
db.pragma('journal_mode = WAL');

function initDb() {
  const schema = `
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
  `;
  db.exec(schema);

  const countStmt = db.prepare('SELECT COUNT(*) AS count FROM crops');
  const { count } = countStmt.get();

  // Seed only when the table is empty
  if (count === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO crops (crop_name, location, target_min, target_max, normal_water, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const seedCards = [
      {
        crop_name: 'Tomato',
        location: 'Greenhouse A',
        target_min: 55,
        target_max: 75,
        normal_water: 500,
        notes: ''
      },
      {
        crop_name: 'Lettuce',
        location: 'Greenhouse B',
        target_min: 60,
        target_max: 80,
        normal_water: 400,
        notes: ''
      },
      {
        crop_name: 'Wheat',
        location: 'North Field',
        target_min: 35,
        target_max: 55,
        normal_water: 300,
        notes: ''
      }
    ];

    const insertMany = db.transaction((cards) => {
      for (const card of cards) {
        insertStmt.run(
          card.crop_name,
          card.location,
          card.target_min,
          card.target_max,
          card.normal_water,
          card.notes
        );
      }
    });

    insertMany(seedCards);
    console.log('Database seeded with initial Crop Cards: Tomato, Lettuce, Wheat.');
  }
}

initDb();

module.exports = db;
