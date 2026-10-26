/**
 * SmartFarm Dashboard Analysis Utilities
 * Authoritative implementations according to Specification Sections 9, 10, and 12.
 */

/**
 * Returns available crop names from the sensor feed that are not yet registered as Crop Cards.
 * @param {Array} readings - Array of sensor reading objects
 * @param {Array} crops - Array of Crop Card objects
 * @returns {Array<string>} List of available unique crop names
 */
export function getAvailableCropNames(readings = [], crops = []) {
  if (!Array.isArray(readings)) return [];
  const uniqueCropNames = Array.from(new Set(readings.map(r => r.crop_name).filter(Boolean)));
  const existingCropNames = new Set((crops || []).map(c => c.crop_name));
  return uniqueCropNames.filter(name => !existingCropNames.has(name));
}

/**
 * Selects the latest reading for a given crop_name using greatest ISO timestamp string comparison.
 * Exact case-sensitive matching.
 * @param {string} cropName - Crop name to match
 * @param {Array} readings - Array of sensor readings
 * @returns {Object|null} Latest reading object or null
 */
export function getLatestReading(cropName, readings = []) {
  if (!cropName || !Array.isArray(readings)) return null;
  const matches = readings.filter(r => r.crop_name === cropName);
  if (matches.length === 0) return null;

  return [...matches].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0] || null;
}

/**
 * Analyses a Crop Card against a sensor reading according to the Dashboard Decision Table.
 * @param {Object} cropCard - The Crop Card record
 * @param {Object|null} reading - The sensor reading record
 * @returns {Object} Analysis result
 */
export function analyseCrop(cropCard, reading) {
  if (!cropCard) return null;

  // If no reading is provided or available
  if (!reading) {
    return {
      condition: 'N/A',
      recommended_water: 'N/A',
      alerts: ['No sensor data'],
      action: 'N/A',
      invalid_field: null
    };
  }

  // Priority 1: sensor_status is Offline or Faulty
  if (reading.sensor_status === 'Offline' || reading.sensor_status === 'Faulty') {
    return {
      condition: 'Sensor Problem',
      recommended_water: 'N/A',
      alerts: ['Check sensor'],
      action: 'Check sensor',
      invalid_field: null
    };
  }

  // Priority 2: Online reading with out-of-range numeric values
  // Moisture outside 0-100, temperature outside 0-50, or rainfall outside 0-50
  const invalidFields = [];
  if (reading.soil_moisture < 0 || reading.soil_moisture > 100) invalidFields.push('soil_moisture');
  if (reading.temperature < 0 || reading.temperature > 50) invalidFields.push('temperature');
  if (reading.rainfall < 0 || reading.rainfall > 50) invalidFields.push('rainfall');

  if (invalidFields.length > 0) {
    return {
      condition: 'Invalid Data',
      recommended_water: 'N/A',
      alerts: [`Check reading (${invalidFields.join(', ')})`],
      action: 'Check reading',
      invalid_field: invalidFields[0]
    };
  }

  // Main conditions (Valid Online Reading)
  let condition = '';
  let recommended_water = '';
  let action = '';

  // Priority 3: soil_moisture < target_min
  if (reading.soil_moisture < cropCard.target_min) {
    condition = 'Dry';
    recommended_water = `${cropCard.normal_water} L`;
    action = 'Water crop';
  }
  // Priority 4: target_min <= soil_moisture <= target_max
  else if (reading.soil_moisture <= cropCard.target_max) {
    condition = 'Healthy';
    recommended_water = '0 L';
    action = 'Monitor';
  }
  // Priority 5: soil_moisture > target_max
  else {
    condition = 'Too Wet';
    recommended_water = '0 L';
    action = 'Stop watering';
  }

  // Additional alerts checked only for valid Online readings
  const alerts = [];
  // Temperature > 35 C (35 C exactly is NOT high)
  if (reading.temperature > 35) {
    alerts.push('High temperature');
  }
  // Rainfall >= 5 mm (5 mm exactly adds Rain detected)
  if (reading.rainfall >= 5) {
    alerts.push('Rain detected');
  }

  return {
    condition,
    recommended_water,
    alerts,
    action,
    invalid_field: null
  };
}

/**
 * Calculates the Overall Farm Status based on current card results and feed availability.
 * Priority:
 * 1. No Crops (if cards list is empty)
 * 2. Sensor Feed Unavailable (if at least one card, but no successful sensor data loaded)
 * 3. Critical (if any card is Sensor Problem or Invalid Data)
 * 4. Watch (otherwise, if any card is Dry, Too Wet, or has High temperature)
 * 5. Normal (otherwise)
 * @param {Array} cardResults - Array of analysed card result objects
 * @param {boolean} isFeedAvailable - Whether sensor feed has successfully loaded at least once
 * @returns {string} Overall Farm Status
 */
export function calculateFarmStatus(cardResults = [], isFeedAvailable = true) {
  if (!cardResults || cardResults.length === 0) {
    return 'No Crops';
  }

  if (!isFeedAvailable) {
    return 'Sensor Feed Unavailable';
  }

  // Check Critical: any card is Sensor Problem or Invalid Data
  const hasCritical = cardResults.some(
    item => item.condition === 'Sensor Problem' || item.condition === 'Invalid Data'
  );
  if (hasCritical) {
    return 'Critical';
  }

  // Check Watch: any card is Dry, Too Wet, or has High temperature
  const hasWatch = cardResults.some(item => {
    const isDryOrWet = item.condition === 'Dry' || item.condition === 'Too Wet';
    const hasHighTemp = Array.isArray(item.alerts) && item.alerts.includes('High temperature');
    return isDryOrWet || hasHighTemp;
  });

  if (hasWatch) {
    return 'Watch';
  }

  return 'Normal';
}
