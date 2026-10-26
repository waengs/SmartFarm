import React, { useState, useEffect, useCallback } from 'react';
import TopSummary from './components/TopSummary';
import CropCard from './components/CropCard';
import CropFormModal from './components/CropFormModal';
import SensorHistoryModal from './components/SensorHistoryModal';
import ErrorBanner from './components/ErrorBanner';
import {
  fetchCrops,
  createCrop,
  updateCrop,
  deleteCrop,
  fetchSensorReadings
} from './services/api';
import {
  getAvailableCropNames,
  getLatestReading,
  analyseCrop,
  calculateFarmStatus
} from './utils/analysis';

export default function App() {
  // State for Crop Cards and Sensor Data
  const [crops, setCrops] = useState([]);
  const [readings, setReadings] = useState([]);
  const [isFeedAvailable, setIsFeedAvailable] = useState(false);
  const [lastRefresh, setLastRefresh] = useState('Never');

  // Loading & Error States
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialCropsError, setInitialCropsError] = useState(null);
  const [bannerMessage, setBannerMessage] = useState(null);
  const [bannerType, setBannerType] = useState('error');

  // Modal States
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyCrop, setHistoryCrop] = useState(null);

  // Helper to format browser time
  const getFormattedTime = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0]; // HH:mm:ss format
  };

  // Initial Data Load
  const loadInitialData = useCallback(async () => {
    setIsInitialLoading(true);
    setInitialCropsError(null);
    setBannerMessage(null);

    let loadedCrops = [];
    let cropsSuccess = false;

    // 1. Fetch Crop Cards
    try {
      loadedCrops = await fetchCrops();
      setCrops(loadedCrops);
      cropsSuccess = true;
    } catch (err) {
      console.error('Failed to load Crop Cards:', err);
      setInitialCropsError(err.message || 'Failed to connect to backend server');
      setIsInitialLoading(false);
      return; // Do not show editable cards until GET /api/crops succeeds
    }

    // 2. Fetch Sensor Readings
    try {
      const sensorData = await fetchSensorReadings();
      setReadings(sensorData);
      setIsFeedAvailable(true);
      setLastRefresh(getFormattedTime());
    } catch (err) {
      console.error('First sensor request failed:', err);
      setIsFeedAvailable(false);
      setLastRefresh('Never');
      setBannerMessage('Sensor feed could not be retrieved. Running in offline/feed unavailable mode.');
      setBannerType('error');
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle Refresh Sensor Data (later refresh)
  const handleRefreshSensors = async () => {
    setIsRefreshing(true);
    try {
      const sensorData = await fetchSensorReadings();
      setReadings(sensorData);
      setIsFeedAvailable(true);
      setLastRefresh(getFormattedTime());
      setBannerMessage('Sensor feed refreshed successfully.');
      setBannerType('success');
    } catch (err) {
      console.error('Sensor refresh failed:', err);
      // Keep last successful readings, card results, farm status and lastRefresh
      setBannerMessage(`Failed to refresh sensor feed: ${err.message}. Retaining existing readings.`);
      setBannerType('error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // CRUD Handlers
  const handleOpenCreate = () => {
    setFormModalMode('create');
    setSelectedCrop(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (crop) => {
    setFormModalMode('edit');
    setSelectedCrop(crop);
    setFormModalOpen(true);
  };

  const handleOpenHistory = (crop) => {
    setHistoryCrop(crop);
    setHistoryModalOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    if (formModalMode === 'create') {
      const newCrop = await createCrop(formData);
      // Refetch or update state
      setCrops((prev) => [...prev, newCrop]);
      setFormModalOpen(false);
      setBannerMessage(`Created Crop Card for ${newCrop.crop_name} successfully.`);
      setBannerType('success');
    } else {
      const updated = await updateCrop(selectedCrop.id, formData);
      setCrops((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setFormModalOpen(false);
      setBannerMessage(`Updated Crop Card for ${updated.crop_name} successfully.`);
      setBannerType('success');
    }
  };

  const handleDeleteCrop = async (crop) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the Crop Card for ${crop.crop_name}? The sensor readings will remain intact.`
    );
    if (!confirmDelete) return;

    try {
      await deleteCrop(crop.id);
      setCrops((prev) => prev.filter((c) => c.id !== crop.id));
      setBannerMessage(`Deleted Crop Card for ${crop.crop_name}. Sensor data remains unchanged.`);
      setBannerType('success');
    } catch (err) {
      setBannerMessage(`Failed to delete Crop Card: ${err.message}`);
      setBannerType('error');
    }
  };

  // Calculations
  const availableCropNames = isFeedAvailable
    ? getAvailableCropNames(readings, crops)
    : [];

  const analyzedCards = crops.map((crop) => {
    const latestReading = isFeedAvailable
      ? getLatestReading(crop.crop_name, readings)
      : null;
    const analysis = analyseCrop(crop, latestReading);

    return {
      crop,
      latestReading,
      analysis
    };
  });

  const summaryState = initialCropsError ? 'error' : isInitialLoading ? 'loading' : 'ready';
  const cardResultsForFarmStatus = analyzedCards.map((c) => c.analysis);
  const farmStatus = summaryState === 'ready'
    ? calculateFarmStatus(cardResultsForFarmStatus, isFeedAvailable)
    : null;

  return (
    <div className="app-container">
      {/* Top Summary Area */}
      <TopSummary
        farmStatus={farmStatus}
        summaryState={summaryState}
        cropsCount={crops.length}
        lastRefresh={lastRefresh}
        isRefreshing={isRefreshing}
        isFeedAvailable={isFeedAvailable}
        availableCropsCount={availableCropNames.length}
        onAddClick={handleOpenCreate}
        onRefreshClick={handleRefreshSensors}
      />

      {/* Global / Action Feedback Banner */}
      <ErrorBanner
        message={bannerMessage}
        type={bannerType}
        onClose={() => setBannerMessage(null)}
      />

      {/* Initial Crops Failure State */}
      {initialCropsError && (
        <div className="feedback-banner error" style={{ padding: '2rem', textAlign: 'center', display: 'block' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
            ⚠️ Failed to Connect to SmartFarm Backend
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            {initialCropsError}. Please ensure the Express server is running on http://localhost:3001.
          </p>
          <button className="btn btn-primary" onClick={loadInitialData}>
            Retry Connection
          </button>
        </div>
      )}

      {/* Initial Loading Spinner */}
      {isInitialLoading && !initialCropsError && (
        <div className="page-loader">
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-muted)' }}>Connecting to farm database and sensor feeds...</p>
        </div>
      )}

      {/* Main Content Area */}
      {!isInitialLoading && !initialCropsError && (
        <main>
          {crops.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🌱</div>
              <h2 className="empty-title">No Crop Cards Configured</h2>
              <p className="empty-text">
                Farm staff have not created any Crop Cards yet. Click below to add a new card from the available IoT sensor feeds.
              </p>
              <button
                className="btn btn-primary"
                onClick={handleOpenCreate}
                disabled={!isFeedAvailable || availableCropNames.length === 0}
              >
                + Add First Crop Card
              </button>
            </div>
          ) : (
            <div className="cards-grid">
              {analyzedCards.map(({ crop, latestReading, analysis }) => (
                <CropCard
                  key={crop.id}
                  crop={crop}
                  latestReading={latestReading}
                  analysis={analysis}
                  onEdit={handleOpenEdit}
                  onDelete={handleDeleteCrop}
                  onViewHistory={handleOpenHistory}
                />
              ))}
            </div>
          )}
        </main>
      )}

      {/* Create / Edit Crop Modal */}
      <CropFormModal
        isOpen={formModalOpen}
        mode={formModalMode}
        initialData={selectedCrop}
        availableCropNames={availableCropNames}
        onSubmit={handleFormSubmit}
        onClose={() => setFormModalOpen(false)}
      />

      {/* Sensor History Modal */}
      <SensorHistoryModal
        isOpen={historyModalOpen}
        crop={historyCrop}
        readings={readings}
        onClose={() => {
          setHistoryModalOpen(false);
          setHistoryCrop(null);
        }}
      />
    </div>
  );
}
