import React from 'react';
import { analyseCrop } from '../utils/analysis';

export default function SensorHistoryModal({
  isOpen,
  crop,
  readings = [],
  onClose
}) {
  if (!isOpen || !crop) return null;

  // Filter readings matching this crop (exact case-sensitive match) and sort newest first
  const matchingReadings = [...readings]
    .filter((r) => r.crop_name === crop.crop_name)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '720px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">📊 Sensor History: {crop.crop_name}</h2>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Showing {matchingReadings.length} historical readings sorted newest first
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          {matchingReadings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No sensor readings available for {crop.crop_name}.
            </div>
          ) : (
            <div className="history-list">
              {matchingReadings.map((reading, index) => {
                const analysis = analyseCrop(crop, reading);
                const isInvalid = analysis.condition === 'Invalid Data';
                const isProblem = analysis.condition === 'Sensor Problem';

                return (
                  <div
                    key={reading.timestamp || index}
                    className={`history-item ${isInvalid ? 'invalid' : ''}`}
                  >
                    <div className="history-item-header">
                      <span className="history-time">
                        {index === 0 && '⭐ (Latest) '}
                        {reading.timestamp}
                      </span>
                      <span className={`condition-pill ${getConditionClass(analysis.condition)}`}>
                        {analysis.condition}
                      </span>
                    </div>

                    <div className="history-grid">
                      <div>
                        <div className="history-field-label">Moisture</div>
                        <div
                          className={`history-field-val ${
                            analysis.invalid_field === 'soil_moisture' ? 'error-highlight' : ''
                          }`}
                        >
                          {reading.soil_moisture}%
                          {analysis.invalid_field === 'soil_moisture' && ' ⚠️'}
                        </div>
                      </div>

                      <div>
                        <div className="history-field-label">Temperature</div>
                        <div
                          className={`history-field-val ${
                            analysis.invalid_field === 'temperature' ? 'error-highlight' : ''
                          }`}
                        >
                          {reading.temperature} °C
                          {analysis.invalid_field === 'temperature' && ' ⚠️'}
                        </div>
                      </div>

                      <div>
                        <div className="history-field-label">Rainfall</div>
                        <div
                          className={`history-field-val ${
                            analysis.invalid_field === 'rainfall' ? 'error-highlight' : ''
                          }`}
                        >
                          {reading.rainfall} mm
                          {analysis.invalid_field === 'rainfall' && ' ⚠️'}
                        </div>
                      </div>

                      <div>
                        <div className="history-field-label">Sensor Status</div>
                        <div
                          className="history-field-val"
                          style={{
                            color:
                              reading.sensor_status === 'Online'
                                ? '#34d399'
                                : reading.sensor_status === 'Faulty'
                                ? '#f87171'
                                : '#fbbf24'
                          }}
                        >
                          {reading.sensor_status}
                        </div>
                      </div>
                    </div>

                    <div className="history-analysis">
                      <div>
                        <span style={{ color: 'var(--text-dim)', marginRight: '0.4rem' }}>
                          Water Rec:
                        </span>
                        <strong style={{ color: 'var(--text-main)' }}>
                          {analysis.recommended_water}
                        </strong>
                        <span
                          style={{
                            color: 'var(--text-dim)',
                            margin: '0 0.5rem'
                          }}
                        >
                          |
                        </span>
                        <span style={{ color: 'var(--text-dim)', marginRight: '0.4rem' }}>
                          Action:
                        </span>
                        <strong style={{ color: '#38bdf8' }}>{analysis.action}</strong>
                      </div>

                      {analysis.alerts && analysis.alerts.length > 0 && (
                        <div className="alerts-container">
                          {analysis.alerts.map((al, aIdx) => (
                            <span key={aIdx} className="alert-chip warning">
                              {al}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {reading.notes && (
                      <div
                        style={{
                          marginTop: '0.5rem',
                          fontSize: '0.75rem',
                          color: 'var(--text-dim)',
                          fontStyle: 'italic'
                        }}
                      >
                        Notes: {reading.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
