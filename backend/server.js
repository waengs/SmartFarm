const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const SENSOR_FILE_PATH = path.join(__dirname, 'data', 'sensor-readings.json');

app.use(cors());
app.use(express.json());

function isValidSensorTimestamp(value) {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);

  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) {
    return false;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day &&
    parsed.getUTCHours() === hour &&
    parsed.getUTCMinutes() === minute &&
    parsed.getUTCSeconds() === second
  );
}

// Helper function to read and structurally validate the sensor-readings.json file
function readAndValidateSensorData() {
  if (!fs.existsSync(SENSOR_FILE_PATH)) {
    throw new Error('Sensor data file is invalid');
  }

  let content;
  try {
    content = fs.readFileSync(SENSOR_FILE_PATH, 'utf-8');
  } catch (err) {
    throw new Error('Sensor data file is invalid');
  }

  let data;
  try {
    data = JSON.parse(content);
  } catch (err) {
    throw new Error('Sensor data file is invalid');
  }

  // 1. Top-level value is an array containing exactly 20 objects
  if (!Array.isArray(data) || data.length !== 20) {
    throw new Error('Sensor data file is invalid');
  }

  const allowedCrops = ['Tomato', 'Lettuce', 'Wheat', 'Maize'];
  const allowedStatuses = ['Online', 'Offline', 'Faulty'];
  const cropCounts = { Tomato: 0, Lettuce: 0, Wheat: 0, Maize: 0 };
  const cropTimestamps = { Tomato: new Set(), Lettuce: new Set(), Wheat: new Set(), Maize: new Set() };
  let outOfRangeCount = 0;

  const requiredFields = [
    'crop_name',
    'timestamp',
    'soil_moisture',
    'temperature',
    'rainfall',
    'sensor_status',
    'notes'
  ];

  for (const item of data) {
    // Must be a non-null object and not an array
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Sensor data file is invalid');
    }

    // Every object contains exactly the seven required fields
    const keys = Object.keys(item);
    if (keys.length !== requiredFields.length) {
      throw new Error('Sensor data file is invalid');
    }

    for (const field of requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(item, field)) {
        throw new Error('Sensor data file is invalid');
      }
    }

    // Type validation
    if (typeof item.crop_name !== 'string' || !allowedCrops.includes(item.crop_name)) {
      throw new Error('Sensor data file is invalid');
    }
    if (typeof item.timestamp !== 'string') {
      throw new Error('Sensor data file is invalid');
    }
    if (typeof item.soil_moisture !== 'number' || Number.isNaN(item.soil_moisture)) {
      throw new Error('Sensor data file is invalid');
    }
    if (typeof item.temperature !== 'number' || Number.isNaN(item.temperature)) {
      throw new Error('Sensor data file is invalid');
    }
    if (typeof item.rainfall !== 'number' || Number.isNaN(item.rainfall)) {
      throw new Error('Sensor data file is invalid');
    }
    if (typeof item.sensor_status !== 'string' || !allowedStatuses.includes(item.sensor_status)) {
      throw new Error('Sensor data file is invalid');
    }
    if (typeof item.notes !== 'string') {
      throw new Error('Sensor data file is invalid');
    }

    // Timestamp must be a real calendar date-time in YYYY-MM-DDTHH:mm:ss.
    // Date.UTC rejects overflow such as 31 February or 29 February in a non-leap year.
    if (!isValidSensorTimestamp(item.timestamp)) {
      throw new Error('Sensor data file is invalid');
    }

    // Timestamps distinct within crop
    if (cropTimestamps[item.crop_name].has(item.timestamp)) {
      throw new Error('Sensor data file is invalid');
    }
    cropTimestamps[item.crop_name].add(item.timestamp);
    cropCounts[item.crop_name]++;

    // At most one reading may contain out-of-range numbers, and only one field on that reading.
    const outOfRangeFields = [
      item.soil_moisture < 0 || item.soil_moisture > 100,
      item.temperature < 0 || item.temperature > 50,
      item.rainfall < 0 || item.rainfall > 50
    ].filter(Boolean).length;

    if (outOfRangeFields > 1) {
      throw new Error('Sensor data file is invalid');
    }
    if (outOfRangeFields === 1) {
      outOfRangeCount++;
    }
  }

  // Exactly five readings per crop
  for (const crop of allowedCrops) {
    if (cropCounts[crop] !== 5) {
      throw new Error('Sensor data file is invalid');
    }
  }

  // Exactly one structurally valid reading may contain one out-of-range numeric value
  if (outOfRangeCount > 1) {
    throw new Error('Sensor data file is invalid');
  }

  return data;
}

// ==================== CROP CARD ROUTES ====================

// GET /api/crops - Return all Crop Cards from SQLite
app.get('/api/crops', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM crops ORDER BY id ASC');
    const crops = stmt.all();
    res.json(crops);
  } catch (err) {
    console.error('Error fetching crops:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/crops/:id - Return one Crop Card
app.get('/api/crops/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(404).json({ error: 'Crop card not found' });
    }

    const stmt = db.prepare('SELECT * FROM crops WHERE id = ?');
    const crop = stmt.get(id);

    if (!crop) {
      return res.status(404).json({ error: 'Crop card not found' });
    }

    res.json(crop);
  } catch (err) {
    console.error('Error fetching crop by id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/crops - Create one Crop Card
app.post('/api/crops', (req, res) => {
  try {
    const { crop_name, location, target_min, target_max, normal_water, notes } = req.body;

    // Validate crop_name
    if (!crop_name || typeof crop_name !== 'string') {
      return res.status(400).json({ error: 'crop_name is required' });
    }

    // Validate against sensor feed
    let sensorData;
    try {
      sensorData = readAndValidateSensorData();
    } catch (err) {
      return res.status(500).json({ error: 'Sensor data file is invalid' });
    }

    const validCropsInFeed = new Set(sensorData.map(r => r.crop_name));
    if (!validCropsInFeed.has(crop_name)) {
      return res.status(400).json({ error: 'crop_name does not exist in sensor data' });
    }

    // Check duplicate crop_name
    const existingCrop = db.prepare('SELECT id FROM crops WHERE crop_name = ?').get(crop_name);
    if (existingCrop) {
      return res.status(409).json({ error: 'crop_name already exists' });
    }

    // Validate location
    if (typeof location !== 'string' || location.trim().length === 0) {
      return res.status(400).json({ error: 'location is required' });
    }
    if (location.trim().length > 100) {
      return res.status(400).json({ error: 'location must be 1 to 100 characters' });
    }

    // Validate target_min: must be JSON number
    if (typeof target_min !== 'number' || Number.isNaN(target_min) || target_min < 0 || target_min > 100) {
      return res.status(400).json({ error: 'target_min must be a number between 0 and 100' });
    }

    // Validate target_max: must be JSON number
    if (typeof target_max !== 'number' || Number.isNaN(target_max) || target_max < 0 || target_max > 100) {
      return res.status(400).json({ error: 'target_max must be a number between 0 and 100' });
    }

    if (target_min >= target_max) {
      return res.status(400).json({ error: 'target_min must be less than target_max' });
    }

    // Validate normal_water: must be JSON number
    if (typeof normal_water !== 'number' || Number.isNaN(normal_water) || normal_water <= 0 || normal_water > 10000) {
      return res.status(400).json({ error: 'normal_water must be a number greater than 0 and at most 10000' });
    }

    // Validate notes: optional string up to 500 characters
    let processedNotes = '';
    if (notes !== undefined && notes !== null) {
      if (typeof notes !== 'string' || notes.length > 500) {
        return res.status(400).json({ error: 'notes must be a string up to 500 characters' });
      }
      processedNotes = notes.trim();
    }

    const insertStmt = db.prepare(`
      INSERT INTO crops (crop_name, location, target_min, target_max, normal_water, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      crop_name,
      location.trim(),
      target_min,
      target_max,
      normal_water,
      processedNotes
    );

    const createdCrop = db.prepare('SELECT * FROM crops WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(createdCrop);
  } catch (err) {
    console.error('Error creating crop:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/crops/:id - Update allowed fields; crop_name must not change
app.put('/api/crops/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(404).json({ error: 'Crop card not found' });
    }

    const existingCrop = db.prepare('SELECT * FROM crops WHERE id = ?').get(id);
    if (!existingCrop) {
      return res.status(404).json({ error: 'Crop card not found' });
    }

    const { crop_name, location, target_min, target_max, normal_water, notes } = req.body;

    // Check if crop_name is being modified
    if (crop_name !== undefined && crop_name !== existingCrop.crop_name) {
      return res.status(400).json({ error: 'crop_name cannot be changed' });
    }

    // Validate location
    if (typeof location !== 'string' || location.trim().length === 0) {
      return res.status(400).json({ error: 'location is required' });
    }
    if (location.trim().length > 100) {
      return res.status(400).json({ error: 'location must be 1 to 100 characters' });
    }

    // Validate target_min: must be JSON number
    if (typeof target_min !== 'number' || Number.isNaN(target_min) || target_min < 0 || target_min > 100) {
      return res.status(400).json({ error: 'target_min must be a number between 0 and 100' });
    }

    // Validate target_max: must be JSON number
    if (typeof target_max !== 'number' || Number.isNaN(target_max) || target_max < 0 || target_max > 100) {
      return res.status(400).json({ error: 'target_max must be a number between 0 and 100' });
    }

    if (target_min >= target_max) {
      return res.status(400).json({ error: 'target_min must be less than target_max' });
    }

    // Validate normal_water: must be JSON number
    if (typeof normal_water !== 'number' || Number.isNaN(normal_water) || normal_water <= 0 || normal_water > 10000) {
      return res.status(400).json({ error: 'normal_water must be a number greater than 0 and at most 10000' });
    }

    // Validate notes
    let processedNotes = '';
    if (notes !== undefined && notes !== null) {
      if (typeof notes !== 'string' || notes.length > 500) {
        return res.status(400).json({ error: 'notes must be a string up to 500 characters' });
      }
      processedNotes = notes.trim();
    }

    const updateStmt = db.prepare(`
      UPDATE crops
      SET location = ?, target_min = ?, target_max = ?, normal_water = ?, notes = ?
      WHERE id = ?
    `);

    updateStmt.run(
      location.trim(),
      target_min,
      target_max,
      normal_water,
      processedNotes,
      id
    );

    const updatedCrop = db.prepare('SELECT * FROM crops WHERE id = ?').get(id);
    res.json(updatedCrop);
  } catch (err) {
    console.error('Error updating crop:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/crops/:id - Delete one Crop Card only
app.delete('/api/crops/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(404).json({ error: 'Crop card not found' });
    }

    const existingCrop = db.prepare('SELECT id FROM crops WHERE id = ?').get(id);
    if (!existingCrop) {
      return res.status(404).json({ error: 'Crop card not found' });
    }

    const deleteStmt = db.prepare('DELETE FROM crops WHERE id = ?');
    deleteStmt.run(id);

    res.json({ deleted: true, id });
  } catch (err) {
    console.error('Error deleting crop:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== SENSOR ROUTE ====================

// GET /api/readings - Read, structurally validate and return sensor-readings.json
app.get('/api/readings', (req, res) => {
  try {
    // File must be read and validated on EVERY request
    const readings = readAndValidateSensorData();
    res.json(readings);
  } catch (err) {
    console.error('Error validating sensor readings:', err.message);
    res.status(500).json({ error: 'Sensor data file is invalid' });
  }
});

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server if executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SmartFarm Express backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;
