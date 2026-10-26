/**
 * SmartFarm API Client Service
 */

const BASE_URL = '/api';

async function handleResponse(response) {
  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const data = await response.json();
      if (data && data.error) {
        errorMsg = data.error;
      }
    } catch (e) {
      // response wasn't JSON
    }
    const error = new Error(errorMsg);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function fetchCrops() {
  const response = await fetch(`${BASE_URL}/crops`);
  return handleResponse(response);
}

export async function fetchCrop(id) {
  const response = await fetch(`${BASE_URL}/crops/${id}`);
  return handleResponse(response);
}

export async function createCrop(cropData) {
  const response = await fetch(`${BASE_URL}/crops`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cropData)
  });
  return handleResponse(response);
}

export async function updateCrop(id, cropData) {
  const response = await fetch(`${BASE_URL}/crops/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cropData)
  });
  return handleResponse(response);
}

export async function deleteCrop(id) {
  const response = await fetch(`${BASE_URL}/crops/${id}`, {
    method: 'DELETE'
  });
  return handleResponse(response);
}

export async function fetchSensorReadings() {
  const response = await fetch(`${BASE_URL}/readings`);
  return handleResponse(response);
}
