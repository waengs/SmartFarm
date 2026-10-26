# SmartFarm Crop IoT Dashboard

**CSE3CWA / CSE5006 Semester 2, 2026 — Assignment 2**  
*Full-Stack Application: React + Node.js/Express + SQLite + IoT Sensor JSON Integration*

---

## 1. Overview & System URLs

The **SmartFarm Crop IoT Dashboard** is a full-stack web application designed for farm staff at GreenFields Farm. It bridges two distinct data domains:
1. **User-managed Crop Cards** stored in a persistent SQLite database (`crops` table), supporting complete CRUD operations (Create, Read, Update, Delete).
2. **Read-only simulated IoT sensor readings** served via an Express API from `backend/data/sensor-readings.json`.

The React frontend joins these data sources by an exact, case-sensitive `crop_name` key, identifies the latest reading by timestamp for each crop, and presents an interactive, aesthetic dashboard reflecting real-time crop conditions, irrigation recommendations, and farm-wide status.

### Application URLs
- **Frontend URL:** [http://localhost:5173](http://localhost:5173)
- **Backend API URL:** [http://localhost:3001](http://localhost:3001)

---

## 2. Installation & Run Instructions

### Prerequisites
- **Node.js:** v18.0.0 or later (Tested on Node v24.19.0)
- **npm:** v9.0.0 or later (Tested on npm 11.17.0)

### Quick Start

1. **Install dependencies for both frontend and backend:**
   ```bash
   # From project root:
   npm run install:all
   ```
   *(Or individually: `cd backend && npm install`, then `cd ../frontend && npm install`)*

2. **Run the Express Backend:**
   ```bash
   # Option A (from root):
   npm run start:backend

   # Option B (from backend directory):
   cd backend
   npm start
   ```
   The backend will start at `http://localhost:3001`. On first run, it automatically initializes the SQLite database schema and seeds the three initial crop cards (Tomato, Lettuce, Wheat).

3. **Run the React Frontend:**
   ```bash
   # Option A (from root):
   npm run start:frontend

   # Option B (from frontend directory):
   cd frontend
   npm run dev
   ```
   The Vite dev server will launch at `http://localhost:5173`. Open your browser and navigate to `http://localhost:5173`.

4. **Run Automated Test Suites:**
   ```bash
   # Run all backend and frontend acceptance tests:
   npm test
   ```

---

## 3. Database Setup & Seeding

### SQLite Schema (`backend/db.js` / `backend/init.sql`)
The persistent SQLite database (`backend/smartfarm.db`) uses `better-sqlite3`. Only Crop Cards are stored in SQLite:

```sql
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
```

### Seeding Rules
- Seeding executes automatically on backend startup **only when the `crops` table is empty**.
- Three cards are seeded by default:
  - **Tomato:** Location: `Greenhouse A`, Target Min: `55`, Target Max: `75`, Normal Water: `500 L`
  - **Lettuce:** Location: `Greenhouse B`, Target Min: `60`, Target Max: `80`, Normal Water: `400 L`
  - **Wheat:** Location: `North Field`, Target Min: `35`, Target Max: `55`, Normal Water: `300 L`
- **Maize is deliberately NOT seeded** so that evaluators can immediately test the "+ Add Crop Card" workflow.
- Restarting the backend server does not duplicate records (`COUNT(*)` check prevents re-seeding).
- To reset the database to clean seed state at any time:
  ```bash
  # Delete smartfarm.db in the backend folder and restart backend
  rm backend/smartfarm.db*
  npm run start:backend
  ```

---

## 4. API Routes & Error Contract

All backend routes adhere to the REST error contract: every failed API response returns JSON containing the key `error`:
```json
{ "error": "Clear message describing the problem" }
```

| Method | Endpoint | Description | Success Response | Error Codes |
|---|---|---|---|---|
| `GET` | `/api/crops` | Return all user-configured Crop Cards from SQLite | `200 OK` + JSON Array | `500 Internal server error` |
| `GET` | `/api/crops/:id` | Return a specific Crop Card by numeric ID | `200 OK` + Crop Object | `404 Crop card not found` |
| `POST` | `/api/crops` | Create a new Crop Card | `201 Created` + Created Object | `400 Validation error`<br>`409 crop_name already exists`<br>`500 Server/Feed error` |
| `PUT` | `/api/crops/:id` | Update allowed fields (`location`, `target_min`, `target_max`, `normal_water`, `notes`). `crop_name` is immutable. | `200 OK` + Updated Object | `400 crop_name cannot be changed`<br>`400 Validation error`<br>`404 Crop card not found` |
| `DELETE` | `/api/crops/:id` | Delete a single Crop Card only. Sensor JSON feed remains untouched. | `200 OK` + `{"deleted":true,"id":number}` | `404 Crop card not found` |
| `GET` | `/api/readings` | Reads, structurally validates, and returns `sensor-readings.json` on every request. | `200 OK` + JSON Array (20 readings) | `500 Sensor data file is invalid` |

### Backend Request Validation Rules
- **Data Types:** `target_min`, `target_max`, and `normal_water` must be sent as JSON numbers. Numeric strings (e.g., `"55"`) are rejected with `HTTP 400`.
- **Feed Verification:** On `POST /api/crops`, the backend validates that `crop_name` actually exists in the valid sensor data feed before inserting.
- **Uniqueness & Immutability:** `crop_name` cannot be duplicated (`HTTP 409`). Attempts to modify `crop_name` on `PUT` are rejected with `HTTP 400 {"error": "crop_name cannot be changed"}`.

---

## 5. System Architecture & Data Ownership

| Domain | Storage Location | Change Permissions | Purpose |
|---|---|---|---|
| **Crop Cards** | SQLite `crops` table | Farm staff via CRUD | User settings: crop targets, location, irrigation dosage, notes |
| **Sensor Feed** | `backend/data/sensor-readings.json` | **Read-only** within the app | Simulated IoT readings (moisture, temp, rain, sensor status) |
| **Dashboard Results** | React component state | Computed dynamically | Joins cards with latest readings to determine conditions and farm status |

**Separation of Concerns:**
- The backend never stores conditions, water recommendations, or alerts in SQLite.
- The sensor JSON file is strictly read-only; no POST/PUT/DELETE routes exist for sensor readings.
- Card analysis is centralized in the frontend service `frontend/src/utils/analysis.js` so that dashboard cards and sensor history views utilize the identical decision table.

---

## 6. Joining Key & Latest-Timestamp Selection

1. **Exact Key Matching:**  
   `crop_name` is the single case-sensitive join key connecting a SQLite Crop Card to IoT sensor readings (`"Tomato"` matches `"Tomato"`, but not `"tomato"`).
2. **Latest Timestamp Selection (`getLatestReading`):**  
   Sensor readings in `sensor-readings.json` are intentionally ordered non-chronologically. The application does not assume the last array element is latest. Instead, it filters all readings matching `crop_name`, sorts them descending using ISO string comparison `b.timestamp.localeCompare(a.timestamp)`, and takes the element with the greatest timestamp:
   ```javascript
   export function getLatestReading(cropName, readings = []) {
     const matches = readings.filter(r => r.crop_name === cropName);
     if (matches.length === 0) return null;
     return [...matches].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0] || null;
   }
   ```

---

## 7. The One Dashboard Decision Table & Farm Status

### Decision Priority Order (Evaluated Top-to-Bottom, First Match Wins)

| Priority | Check | Condition | Recommended Water | Alert & Action |
|---|---|---|---|---|
| **1** | `sensor_status` is `'Offline'` or `'Faulty'` | **Sensor Problem** | `N/A` | Alert: `Check sensor`<br>Action: `Check sensor`<br>*(Stop further checks)* |
| **2** | Online reading with numeric value outside allowed range (moisture < 0 or > 100, temp < 0 or > 50, rain < 0 or > 50) | **Invalid Data** | `N/A` | Alert: `Check reading (<invalid_field>)`<br>Action: `Check reading`<br>*(Stop further checks)* |
| **3** | `soil_moisture < target_min` | **Dry** | `${cropCard.normal_water} L` | Action: `Water crop` |
| **4** | `target_min <= soil_moisture <= target_max` | **Healthy** | `0 L` | Action: `Monitor` |
| **5** | `soil_moisture > target_max` | **Too Wet** | `0 L` | Action: `Stop watering` |

### Additional Alerts (Checked for valid Online readings):
- **High Temperature:** `temperature > 35 °C` (boundary: exactly 35 °C is not high) &rarr; adds `'High temperature'` alert. Recommended water remains unchanged.
- **Rain Detected:** `rainfall >= 5 mm` (boundary: exactly 5 mm triggers alert) &rarr; adds `'Rain detected'` alert. Recommended water remains unchanged.

### Overall Farm Status Logic (`calculateFarmStatus`)
Evaluated hierarchically:
1. **`No Crops`**: If the Crop Card list in SQLite is empty.
2. **`Sensor Feed Unavailable`**: If Crop Cards exist, but the sensor feed failed to load on initial launch.
3. **`Critical`**: If **any** card has condition `Sensor Problem` or `Invalid Data`.
4. **`Watch`**: Otherwise, if **any** card has condition `Dry`, `Too Wet`, or has a `High temperature` alert.
5. **`Normal`**: Otherwise (all crops healthy and sensors online).  
*(Note: Rain detected by itself does not escalate farm status).*

---

## 8. Timing, Refresh & Recalculation Behavior

- **Initial Load:** Fetches `GET /api/crops` and `GET /api/readings` in parallel.
  - If crops request fails: Displays a persistent application error banner with a **Retry** button; cards/forms are not displayed until crops succeeds.
  - If first sensor request fails: Keeps Crop Cards visible, displays `Overall Farm Status = Sensor Feed Unavailable`, sensor values display `N/A`, `lastRefresh` displays `Never`, and "+ Add Crop Card" is disabled.
- **Sensor Refresh Button:**
  - On success: Overwrites sensor state, recalculates all cards and farm status, and updates `lastRefresh` to the current browser time (`HH:mm:ss`).
  - On failure: Preserves previous readings, card results, farm status, and `lastRefresh` timestamp while displaying an error banner.
- **CRUD State Sync:** Successful Create, Edit, or Delete immediately refreshes Crop Card state, dynamically updates the available crops dropdown, and recalculates the dashboard without requiring a page reload.

---

## 9. AI Development Reflection & Sensor Data Generation

### AI Tools Used
- **Google Antigravity IDE (Gemini 3.8 Flash)**: Full-stack architecture, React UI components, SQLite setup, backend validation, and test automation.

### Final AI Prompt for Sensor Readings Generation
The following prompt was used to generate `backend/data/sensor-readings.json`:
```text
Generate a valid JSON array containing exactly 20 simulated SmartFarm sensor readings.

Use these crop_name values exactly and create exactly 5 readings for each: 
Tomato, Lettuce, Wheat, Maize. 
Every object must contain exactly these fields: 
crop_name, timestamp, soil_moisture, temperature, rainfall, sensor_status, notes. 

Use timestamps in YYYY-MM-DDTHH:mm:ss format. Timestamps must be distinct within 
each crop. The same timestamp may be used by different crops. Mix the array order 
so the latest reading is not always the last object.
Use sensor_status only as Online, Offline or Faulty. Most numeric values must be 
realistic: soil_moisture 0-100, temperature 0-50, rainfall 0-50. Include exactly 
one structurally valid older reading with one deliberately out-of-range numeric 
value. That invalid reading must not be the latest reading for its crop. 

Make the latest readings produce these cases with the default Crop Card settings: 
* latest Tomato: Online, Dry, temperature above 35 C;
* latest Lettuce: Online and Healthy; 
* latest Wheat: Online, Too Wet, rainfall at least 5 mm; 
* latest Maize: sensor_status Faulty.
Return only the JSON array. Do not use Markdown or explanation.
```

### Problem Found and Corrected in AI Data & Code
1. **AI Output Weakness (Array Order & Timestamps):** In early generation runs, AI models tend to sort readings chronologically per crop. This was manually corrected by shuffling the order across crops so that the latest Tomato reading appears at index 8 and latest Wheat appears at index 1, proving that the code selects the latest reading purely by greatest ISO timestamp rather than array index.
2. **SQL Syntax Incompatibility:** The initial SQLite schema specification contained a spaced keyword `DEFAULT CURRENT TIMESTAMP`, which caused a `SqliteError: near "TIMESTAMP": syntax error`. This was identified through automated backend testing (`backend/test.js`) and resolved to the standard SQLite syntax `DEFAULT CURRENT_TIMESTAMP`.

### Verification Procedures
- **Uniqueness & Exact Matching:** Verified via `backend/test.js` Test 3 & 4 (ensuring case sensitivity and rejecting duplicate crop names with `HTTP 409`) and `frontend/src/utils/analysis.test.js` Test 2.
- **Greatest Timestamp Selection:** Verified in `frontend/src/utils/analysis.test.js` Test 2 by feeding out-of-order array objects and ensuring that `getLatestReading` always selects the greatest ISO string.
- **Authoritative Boundaries:** Automated tests in `frontend/src/utils/analysis.test.js` confirm that moisture equal to `target_min` or `target_max` evaluates to `Healthy`, temperature equal to exactly `35 °C` does not trigger high temperature, and rainfall equal to exactly `5 mm` triggers `Rain detected`.

### Implementation Decision
- **Unified Analysis Engine:** Rather than performing condition calculations separately inside the `CropCard` component and `SensorHistoryModal`, a single pure analytical function `analyseCrop(cropCard, reading)` in `analysis.js` is utilized everywhere. This guarantees 100% logic parity across card views and historical inspection, eliminating discrepancies and simplifying testing.

---

## 10. Known Project Limitation

- **Static Single-Node Sensor Storage:** Sensor data is simulated from a single static local file (`backend/data/sensor-readings.json`). In a commercial smart farming production environment, sensor telemetry arrives continuously through streaming protocols (such as MQTT or WebSockets) from physical edge nodes. Future revisions would replace static file reading with an append-only time-series data store and WebSocket subscriptions for live dashboard push updates.

---

## 11. Acceptance Checklist Summary

- [x] Initial load loads seeded cards (Tomato, Lettuce, Wheat) and leaves Maize available.
- [x] Create Maize works via UI modal and persists to SQLite.
- [x] Duplicate crop card is rejected with `HTTP 409` and clear UI error.
- [x] Editing location/targets updates SQLite and recalculates card instantly.
- [x] Editing `crop_name` is blocked on frontend (read-only) and rejected with `HTTP 400` on backend.
- [x] Deleting a card removes SQLite record without altering the sensor JSON file.
- [x] Greatest timestamp is selected regardless of array position.
- [x] Faulty Maize sensor produces `Sensor Problem` and escalates farm status to `Critical`.
- [x] Historical out-of-range Wheat reading produces `Invalid Data` with the invalid field highlighted in Sensor History.
- [x] Boundary rules: moisture equal to min/max is Healthy; 35 °C is not high; 5 mm adds Rain detected.
- [x] Failed refresh retains last successful readings and lastRefresh timestamp.
- [x] Empty cards state shows `No Crops` and clean empty state guidance.
