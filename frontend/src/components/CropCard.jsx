import React from 'react';

export default function CropCard({
  crop,
  latestReading,
  analysis,
  onEdit,
  onDelete,
  onViewHistory
}) {
  const condition = analysis ? analysis.condition : 'N/A';
  const recommendedWater = analysis ? analysis.recommended_water : 'N/A';
  const alerts = analysis && Array.isArray(analysis.alerts) ? analysis.alerts : [];
  const action = analysis ? analysis.action : 'N/A';

  const getConditionClass = (cond) => {
    switch (cond) {
      case 'Healthy':
        return 'healthy';
      case 'Dry':
        return 'dry';
      case 'Too Wet':
        return 'too-wet';
      case 'Sensor Problem':
        return 'sensor-problem';
      case 'Invalid Data':
        return 'invalid-data';
      default:
        return 'na';
    }
  };

  const cropSlug = crop.crop_name.toLowerCase().replace(/\s+/g, '-');

  return (
    <article
      id={`crop-card-${cropSlug}`}
      className={`crop-card condition-${getConditionClass(condition)}`}
    >
      <div className="card-header">
        <div>
          <h2 className="card-crop-name">
            {crop.crop_name}
          </h2>
          <div className="card-location">
            <span>📍</span> {crop.location}
          </div>
        </div>
        <span className={`condition-pill ${getConditionClass(condition)}`}>
          {condition}
        </span>
      </div>

      <div className="card-body">
        {/* Telemetry Box */}
        <div className="telemetry-box">
          <div className="telemetry-timestamp">
            <span>Latest:</span>
            <span>{latestReading ? latestReading.timestamp : 'N/A'}</span>
          </div>
          <div className="telemetry-timestamp">
            <span>Sensor status:</span>
            <span>{latestReading ? latestReading.sensor_status : 'N/A'}</span>
          </div>

          <div className="telemetry-grid">
            <div className="telemetry-item">
              <span className="telemetry-label">Moisture</span>
              <span
                className={`telemetry-val ${
                  analysis && analysis.invalid_field === 'soil_moisture' ? 'highlight-problem' : ''
                }`}
              >
                {latestReading && latestReading.soil_moisture !== undefined
                  ? `${latestReading.soil_moisture}%`
                  : 'N/A'}
              </span>
            </div>

            <div className="telemetry-item">
              <span className="telemetry-label">Temp</span>
              <span
                className={`telemetry-val ${
                  analysis && analysis.invalid_field === 'temperature' ? 'highlight-problem' : ''
                }`}
              >
                {latestReading && latestReading.temperature !== undefined
                  ? `${latestReading.temperature} °C`
                  : 'N/A'}
              </span>
            </div>

            <div className="telemetry-item">
              <span className="telemetry-label">Rainfall</span>
              <span
                className={`telemetry-val ${
                  analysis && analysis.invalid_field === 'rainfall' ? 'highlight-problem' : ''
                }`}
              >
                {latestReading && latestReading.rainfall !== undefined
                  ? `${latestReading.rainfall} mm`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Decision Results Box */}
        <div className="decision-box">
          <div className="decision-row">
            <span className="decision-label">Condition:</span>
            <span className="decision-val">{condition}</span>
          </div>

          <div className="decision-row">
            <span className="decision-label">Recommended Water:</span>
            <span className="decision-val">{recommendedWater}</span>
          </div>

          <div className="decision-row">
            <span className="decision-label">Alert:</span>
            {alerts.length > 0 ? (
              <div className="alerts-container">
                {alerts.map((alert, idx) => {
                  let alertClass = 'warning';
                  if (alert === 'High temperature') alertClass = 'high-temp';
                  else if (alert === 'Rain detected') alertClass = 'rain';
                  return (
                    <span key={idx} className={`alert-chip ${alertClass}`}>
                      {alert === 'High temperature' && '🔥 '}
                      {alert === 'Rain detected' && '🌧️ '}
                      {alert.startsWith('Check') && '⚠️ '}
                      {alert}
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="decision-val">None</span>
            )}
          </div>

          <div className="decision-row">
            <span className="decision-label">Action:</span>
            <span className="decision-val action">{action}</span>
          </div>
        </div>

        {/* Card Settings Summary */}
        <div className="card-settings-row">
          <span>Target: {crop.target_min}% – {crop.target_max}%</span>
          <span>Normal: {crop.normal_water} L</span>
        </div>

        {crop.notes && crop.notes.trim() !== '' && (
          <div className="card-notes">
            “{crop.notes}”
          </div>
        )}
      </div>

      <div className="card-actions">
        <button
          className="btn btn-secondary btn-icon"
          onClick={() => onEdit(crop)}
          id={`edit-crop-${cropSlug}`}
          title="Edit card location, targets, and normal water"
        >
          ✏️ Edit
        </button>

        <button
          className="btn btn-danger btn-icon"
          onClick={() => onDelete(crop)}
          id={`delete-crop-${cropSlug}`}
          title="Delete this Crop Card"
        >
          🗑️ Delete
        </button>

        <button
          className="btn btn-secondary btn-icon btn-history"
          onClick={() => onViewHistory(crop)}
          id={`history-crop-${cropSlug}`}
          title="View all sensor readings for this crop"
        >
          View Sensor History
        </button>
      </div>
    </article>
  );
}
