import { getAvailableCropNames, getLatestReading, analyseCrop, calculateFarmStatus } from './analysis.js';
import assert from 'assert';

console.log('Testing analysis.js utility functions...');

// Test 1: getAvailableCropNames
const mockReadings = [
  { crop_name: 'Tomato' },
  { crop_name: 'Tomato' },
  { crop_name: 'Lettuce' },
  { crop_name: 'Wheat' },
  { crop_name: 'Maize' }
];
const mockCrops = [
  { crop_name: 'Tomato' },
  { crop_name: 'Lettuce' },
  { crop_name: 'Wheat' }
];
const available = getAvailableCropNames(mockReadings, mockCrops);
assert.deepStrictEqual(available, ['Maize']);
console.log('✓ getAvailableCropNames passed');

// Test 2: getLatestReading exact case-sensitive matching & timestamp ordering
const unsortedReadings = [
  { crop_name: 'Maize', timestamp: '2026-08-02T10:00:00' },
  { crop_name: 'Maize', timestamp: '2026-08-06T09:00:00' },
  { crop_name: 'Maize', timestamp: '2026-08-04T12:00:00' },
  { crop_name: 'maize', timestamp: '2026-08-09T00:00:00' } // lowercase must not match
];
const latestMaize = getLatestReading('Maize', unsortedReadings);
assert.strictEqual(latestMaize.timestamp, '2026-08-06T09:00:00');
console.log('✓ getLatestReading passed');

// Test 3: Priority 1 - Sensor Problem: Faulty with invalid moisture still produces Sensor Problem
const cardMaize = { crop_name: 'Maize', target_min: 50, target_max: 70, normal_water: 600 };
const faultyReading = {
  crop_name: 'Maize',
  timestamp: '2026-08-06T09:00:00',
  soil_moisture: 120, // out of range, but status is Faulty
  temperature: 27,
  rainfall: 0,
  sensor_status: 'Faulty'
};
const resFaulty = analyseCrop(cardMaize, faultyReading);
assert.strictEqual(resFaulty.condition, 'Sensor Problem');
assert.strictEqual(resFaulty.recommended_water, 'N/A');
assert.strictEqual(resFaulty.action, 'Check sensor');
console.log('✓ Priority 1 (Sensor Problem) passed');

// Test 4: Priority 2 - Invalid Data: Online reading with out-of-range numeric value
const cardWheat = { crop_name: 'Wheat', target_min: 35, target_max: 55, normal_water: 300 };
const invalidReading = {
  crop_name: 'Wheat',
  timestamp: '2026-08-01T09:00:00',
  soil_moisture: 120,
  temperature: 25,
  rainfall: 0,
  sensor_status: 'Online'
};
const resInvalid = analyseCrop(cardWheat, invalidReading);
assert.strictEqual(resInvalid.condition, 'Invalid Data');
assert.strictEqual(resInvalid.recommended_water, 'N/A');
assert.strictEqual(resInvalid.invalid_field, 'soil_moisture');
assert.strictEqual(resInvalid.action, 'Check reading');
console.log('✓ Priority 2 (Invalid Data) passed');

// Test 5: Dry Tomato with High temperature alert (> 35 C)
const cardTomato = { crop_name: 'Tomato', target_min: 55, target_max: 75, normal_water: 500 };
const dryTomatoReading = {
  crop_name: 'Tomato',
  timestamp: '2026-08-05T09:00:00',
  soil_moisture: 42,
  temperature: 38,
  rainfall: 0,
  sensor_status: 'Online'
};
const resTomato = analyseCrop(cardTomato, dryTomatoReading);
assert.strictEqual(resTomato.condition, 'Dry');
assert.strictEqual(resTomato.recommended_water, '500 L');
assert.ok(resTomato.alerts.includes('High temperature'));
assert.strictEqual(resTomato.action, 'Water crop');
console.log('✓ Dry + High temperature alert passed');

// Test 6: Boundary - Exactly 35 C is NOT high temperature
const tomato35Reading = {
  crop_name: 'Tomato',
  timestamp: '2026-08-05T09:00:00',
  soil_moisture: 60,
  temperature: 35,
  rainfall: 0,
  sensor_status: 'Online'
};
const resTomato35 = analyseCrop(cardTomato, tomato35Reading);
assert.strictEqual(resTomato35.condition, 'Healthy');
assert.ok(!resTomato35.alerts.includes('High temperature'), '35 C exactly should NOT trigger high temp alert');
console.log('✓ Boundary: 35 C not high temperature passed');

// Test 7: Boundary - Moisture equal to min/max is Healthy
const tomatoMin = analyseCrop(cardTomato, { ...tomato35Reading, soil_moisture: 55 });
const tomatoMax = analyseCrop(cardTomato, { ...tomato35Reading, soil_moisture: 75 });
assert.strictEqual(tomatoMin.condition, 'Healthy');
assert.strictEqual(tomatoMax.condition, 'Healthy');
console.log('✓ Boundary: target_min & target_max equal moisture is Healthy passed');

// Test 8: Too Wet Wheat with Rain detected alert (>= 5 mm)
const wetWheatReading = {
  crop_name: 'Wheat',
  timestamp: '2026-08-05T16:00:00',
  soil_moisture: 62,
  temperature: 22,
  rainfall: 5, // exactly 5 mm
  sensor_status: 'Online'
};
const resWetWheat = analyseCrop(cardWheat, wetWheatReading);
assert.strictEqual(resWetWheat.condition, 'Too Wet');
assert.strictEqual(resWetWheat.recommended_water, '0 L');
assert.ok(resWetWheat.alerts.includes('Rain detected'), '5 mm rainfall must trigger Rain detected alert');
assert.strictEqual(resWetWheat.action, 'Stop watering');
console.log('✓ Too Wet + 5 mm Rain detected passed');

// Test 9: calculateFarmStatus
// No crops
assert.strictEqual(calculateFarmStatus([], true), 'No Crops');
// Feed unavailable
assert.strictEqual(calculateFarmStatus([{ condition: 'Healthy' }], false), 'Sensor Feed Unavailable');
// Critical
assert.strictEqual(calculateFarmStatus([{ condition: 'Healthy' }, { condition: 'Sensor Problem' }], true), 'Critical');
// Watch (Dry or Too Wet or High temp)
assert.strictEqual(calculateFarmStatus([{ condition: 'Healthy' }, { condition: 'Dry' }], true), 'Watch');
assert.strictEqual(calculateFarmStatus([{ condition: 'Healthy', alerts: ['High temperature'] }], true), 'Watch');
// Rain alone does NOT change farm status to Watch!
assert.strictEqual(calculateFarmStatus([{ condition: 'Healthy', alerts: ['Rain detected'] }], true), 'Normal');
console.log('✓ calculateFarmStatus all rules passed');

console.log('\nALL ANALYSIS TESTS PASSED! 🎉');
