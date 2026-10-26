import React from 'react';

export default function TopSummary({
  farmStatus,
  summaryState = 'ready',
  cropsCount,
  lastRefresh,
  isRefreshing,
  isFeedAvailable,
  availableCropsCount,
  onAddClick,
  onRefreshClick
}) {
  const getStatusClass = (status) => {
    switch (status) {
      case 'Normal':
        return 'normal';
      case 'Watch':
        return 'watch';
      case 'Critical':
        return 'critical';
      case 'Sensor Feed Unavailable':
        return 'unavailable';
      case 'No Crops':
      default:
        return 'no-crops';
    }
  };

  return (
    <header className="top-header">
      <div className="header-main-row">
        <div className="brand-section">
          <div className="brand-icon">🌱</div>
          <div>
            <h1 className="app-title">SmartFarm Crop Dashboard</h1>
            <p className="app-subtitle">IoT Crop Health & Soil Moisture Monitoring System</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            id="add-crop-btn"
            className="btn btn-primary"
            onClick={onAddClick}
            disabled={summaryState !== 'ready' || !isFeedAvailable || availableCropsCount === 0}
            title={
              summaryState !== 'ready'
                ? 'Crop Cards are not loaded yet'
                : !isFeedAvailable
                ? 'Sensor feed unavailable'
                : availableCropsCount === 0
                ? 'All available sensor crops already have cards'
                : 'Add a new Crop Card'
            }
          >
            <span>+</span> Add Crop Card
          </button>

          <button
            id="refresh-sensor-btn"
            className="btn btn-secondary"
            onClick={onRefreshClick}
            disabled={summaryState === 'loading' || isRefreshing}
          >
            {isRefreshing ? (
              <>
                <span className="spinner"></span> Refreshing...
              </>
            ) : (
              <>
                <span>⟳</span> Refresh Sensor Data
              </>
            )}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <div className="metrics-bar">
          <div className="metric-pill">
            <span className="metric-label">Overall Status:</span>
            <span id="overall-status-badge" className={`status-badge ${summaryState === 'ready' ? getStatusClass(farmStatus) : 'no-crops'}`}>
              <span className="status-dot"></span>
              {summaryState === 'loading' ? 'Loading' : summaryState === 'error' ? 'Not loaded' : farmStatus}
            </span>
          </div>

          <div className="metric-pill">
            <span className="metric-label">Crop Cards:</span>
            <span id="crop-cards-count" className="metric-value">
              {summaryState === 'ready' ? cropsCount : '—'}
            </span>
          </div>

          <div className="metric-pill">
            <span className="metric-label">Last Sensor Refresh:</span>
            <span id="last-refresh-time" className="metric-value mono">
              {summaryState === 'loading' ? '—' : (lastRefresh || 'Never')}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
