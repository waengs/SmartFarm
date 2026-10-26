import React, { useState, useEffect } from 'react';

export default function CropFormModal({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  initialData = null,
  availableCropNames = [],
  onSubmit,
  onClose
}) {
  const [cropName, setCropName] = useState('');
  const [location, setLocation] = useState('');
  const [targetMin, setTargetMin] = useState(50);
  const [targetMax, setTargetMax] = useState(70);
  const [normalWater, setNormalWater] = useState(500);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setIsSubmitting(false);
      if (mode === 'edit' && initialData) {
        setCropName(initialData.crop_name || '');
        setLocation(initialData.location || '');
        setTargetMin(initialData.target_min ?? 50);
        setTargetMax(initialData.target_max ?? 70);
        setNormalWater(initialData.normal_water ?? 500);
        setNotes(initialData.notes || '');
      } else {
        // create mode
        const defaultName = availableCropNames.length > 0 ? availableCropNames[0] : '';
        setCropName(defaultName);
        if (defaultName === 'Maize') {
          setLocation('South Field');
          setTargetMin(50);
          setTargetMax(70);
          setNormalWater(600);
        } else {
          setLocation('');
          setTargetMin(50);
          setTargetMax(70);
          setNormalWater(500);
        }
        setNotes('');
      }
    }
  }, [isOpen, mode, initialData, availableCropNames]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    if (mode === 'create' && !cropName) {
      setError('Please select a crop name from the sensor feed.');
      return;
    }

    if (!location.trim()) {
      setError('Location is required (1 to 100 characters).');
      return;
    }
    if (location.trim().length > 100) {
      setError('Location cannot exceed 100 characters.');
      return;
    }

    const minNum = parseFloat(targetMin);
    const maxNum = parseFloat(targetMax);
    const waterNum = parseFloat(normalWater);

    if (isNaN(minNum) || minNum < 0 || minNum > 100) {
      setError('Target min must be a number between 0 and 100.');
      return;
    }

    if (isNaN(maxNum) || maxNum < 0 || maxNum > 100) {
      setError('Target max must be a number between 0 and 100.');
      return;
    }

    if (minNum >= maxNum) {
      setError('Target min must be strictly less than target max.');
      return;
    }

    if (isNaN(waterNum) || waterNum <= 0 || waterNum > 10000) {
      setError('Normal water must be greater than 0 and at most 10000 litres.');
      return;
    }

    if (notes && notes.length > 500) {
      setError('Notes cannot exceed 500 characters.');
      return;
    }

    const payload = {
      location: location.trim(),
      target_min: minNum,
      target_max: maxNum,
      normal_water: waterNum,
      notes: notes.trim()
    };

    if (mode === 'create') {
      payload.crop_name = cropName;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(payload);
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {mode === 'create' ? 'Create Crop Card' : `Edit Crop Card: ${cropName}`}
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div id="form-error-banner" className="form-error-alert">
                ⚠️ {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="crop-name-input">
                Crop Name <span className="req">*</span>
              </label>
              {mode === 'create' ? (
                <select
                  id="crop-name-input"
                  className="form-select"
                  value={cropName}
                  onChange={(e) => {
                    const selected = e.target.value;
                    setCropName(selected);
                    if (selected === 'Maize') {
                      setLocation('South Field');
                      setTargetMin(50);
                      setTargetMax(70);
                      setNormalWater(600);
                    }
                  }}
                  required
                >
                  {availableCropNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="crop-name-input"
                  type="text"
                  className="form-input"
                  value={cropName}
                  readOnly
                  disabled
                />
              )}
              <div className="form-help">
                {mode === 'create'
                  ? 'Showing crops from sensor readings that do not currently have a card.'
                  : 'Crop name is permanent and cannot be modified.'}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="crop-location-input">
                Location <span className="req">*</span>
              </label>
              <input
                id="crop-location-input"
                type="text"
                className="form-input"
                placeholder="e.g. Greenhouse A, South Field"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={100}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="crop-target-min-input">
                  Target Min Moisture (%) <span className="req">*</span>
                </label>
                <input
                  id="crop-target-min-input"
                  type="number"
                  className="form-input"
                  min="0"
                  max="100"
                  step="any"
                  value={targetMin}
                  onChange={(e) => setTargetMin(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="crop-target-max-input">
                  Target Max Moisture (%) <span className="req">*</span>
                </label>
                <input
                  id="crop-target-max-input"
                  type="number"
                  className="form-input"
                  min="0"
                  max="100"
                  step="any"
                  value={targetMax}
                  onChange={(e) => setTargetMax(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="crop-normal-water-input">
                Normal Water Amount (Litres) <span className="req">*</span>
              </label>
              <input
                id="crop-normal-water-input"
                type="number"
                className="form-input"
                min="0.1"
                max="10000"
                step="any"
                placeholder="e.g. 500"
                value={normalWater}
                onChange={(e) => setNormalWater(e.target.value)}
                required
              />
              <div className="form-help">Recommended water volume applied when crop is Dry.</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="crop-notes-input">
                Notes
              </label>
              <textarea
                id="crop-notes-input"
                className="form-textarea"
                rows="2"
                placeholder="Optional monitoring notes (max 500 characters)"
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              id="submit-crop-form-btn"
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span> Saving...
                </>
              ) : mode === 'create' ? (
                'Create Crop Card'
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
