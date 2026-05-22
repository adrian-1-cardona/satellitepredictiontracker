import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const AUTH_STORAGE_KEY = "satellite_tracker_auth";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function persistAuth(tokenResponse) {
  const now = Date.now();
  const auth = {
    userId: tokenResponse.user_id,
    email: tokenResponse.email,
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    tokenType: tokenResponse.token_type || "bearer",
    expiresAt: now + tokenResponse.expires_in * 1000,
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  window.dispatchEvent(new Event("satellite-auth-updated"));
  return auth;
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event("satellite-auth-updated"));
}

function redirectToLanding() {
  if (window.location.pathname !== "/") {
    window.location.assign("/");
  }
}

api.interceptors.request.use((config) => {
  const auth = getStoredAuth();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const auth = getStoredAuth();
    const requestUrl = originalRequest?.url || "";
    const isAuthEndpoint =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/refresh");

    if (
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      isAuthEndpoint ||
      !auth?.refreshToken
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: auth.refreshToken,
      });
      const nextAuth = persistAuth(response.data);
      originalRequest.headers.Authorization = `Bearer ${nextAuth.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearStoredAuth();
      redirectToLanding();
      return Promise.reject(refreshError);
    }
  },
);

export function getErrorMessage(error, fallback = "Something went wrong.") {
  const detail = error?.response?.data?.detail || error?.response?.data?.error;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => item.msg || item.message || JSON.stringify(item))
      .join(" ");
  }
  return detail || error?.message || fallback;
}

export async function registerUser(payload) {
  const response = await api.post("/auth/register", payload);
  return persistAuth(response.data);
}

export async function loginUser(payload) {
  const response = await api.post("/auth/login", payload);
  return persistAuth(response.data);
}

export async function logoutUser() {
  const auth = getStoredAuth();
  try {
    if (auth?.refreshToken) {
      await api.post("/auth/logout", { refresh_token: auth.refreshToken });
    }
  } finally {
    clearStoredAuth();
  }
}

export async function fetchCurrentUser() {
  const response = await api.get("/auth/me");
  return response.data;
}

export async function fetchLocations() {
  const response = await api.get("/locations");
  return response.data;
}

export async function fetchLocation(locationId) {
  const response = await api.get(`/locations/${locationId}`);
  return response.data;
}

export async function createLocation(payload) {
  const response = await api.post("/locations", payload);
  return response.data;
}

/**
 * Update a location.
 * @backend PATCH /locations/{location_id}
 * @param {number} locationId - The location ID
 * @param {Object} payload - Location update data (LocationUpdate schema)
 * @returns {Promise<Object>} Updated location (LocationOut schema)
 * @throws {Error} On 404 (location not found) or 401 (auth required)
 */
export async function updateLocation(locationId, payload) {
  const response = await api.patch(`/locations/${locationId}`, payload);
  return response.data;
}

/**
 * Delete a location.
 * @backend DELETE /locations/{location_id}
 * @param {number} locationId - The location ID
 * @returns {Promise<Object>} Confirmation message
 * @throws {Error} On 404 (location not found) or 401 (auth required)
 */
export async function deleteLocation(locationId) {
  const response = await api.delete(`/locations/${locationId}`);
  return response.data;
}

export async function fetchPasses({ locationId, daysAhead = 12, minElevation, skip = 0, limit = 50 }) {
  const params = {
    location_id: locationId,
    days_ahead: daysAhead,
    skip,
    limit,
  };
  if (minElevation !== "" && minElevation !== null && minElevation !== undefined) {
    params.min_elevation = minElevation;
  }
  const response = await api.get("/passes", { params });
  return response.data;
}

export async function refreshPasses(locationId, daysAhead = 12) {
  const response = await api.post("/passes/refresh", {
    location_id: Number(locationId),
    days_ahead: Number(daysAhead),
  });
  return response.data;
}

/**
 * Fetch a specific satellite pass.
 * @backend GET /passes/{pass_id}
 * @param {number} passId - The pass ID
 * @returns {Promise<Object>} Pass details (PassOut schema)
 * @throws {Error} On 404 (pass not found) or 401 (auth required)
 */
export async function fetchPass(passId) {
  const response = await api.get(`/passes/${passId}`);
  return response.data;
}

/**
 * Fetch satellite pass statistics.
 * @backend GET /passes/stats
 * @returns {Promise<Object>} Stats object with total_passes, excellent_passes, next_pass
 * @throws {Error} On 401 (auth required)
 */
export async function fetchPassStats() {
  const response = await api.get("/passes/stats");
  return response.data;
}

/**
 * Fetch list of trackable satellites.
 * @backend GET /satellites
 * @param {number} limit - Maximum number of satellites to return (default: 100, max: 500)
 * @returns {Promise<Object>} Paginated response with satellite names in data
 * @throws {Error} On 400 (invalid limit)
 */
export async function fetchSatellites(limit = 100) {
  const response = await api.get("/satellites", { params: { limit } });
  return response.data;
}

export async function fetchAlerts() {
  const response = await api.get("/alerts");
  return response.data;
}

export async function createAlert(payload) {
  const response = await api.post("/alerts", payload);
  return response.data;
}

export async function updateAlert(alertId, payload) {
  const response = await api.patch(`/alerts/${alertId}`, payload);
  return response.data;
}

export async function deleteAlert(alertId) {
  const response = await api.delete(`/alerts/${alertId}`);
  return response.data;
}

/**
 * Fetch a specific alert.
 * @backend GET /alerts/{alert_id}
 * @param {number} alertId - The alert ID
 * @returns {Promise<Object>} Alert details (AlertOut schema)
 * @throws {Error} On 404 (alert not found) or 401 (auth required)
 */
export async function fetchAlert(alertId) {
  const response = await api.get(`/alerts/${alertId}`);
  return response.data;
}

/**
 * Fetch alert history.
 * @backend GET /alerts/history
 * @param {number} days - Number of days to look back (default: 7, max: 90)
 * @returns {Promise<Object>} Paginated response with alert history records in data
 * @throws {Error} On 401 (auth required)
 */
export async function fetchAlertHistory(days = 7) {
  const response = await api.get("/alerts/history", { params: { days } });
  return response.data;
}

/**
 * Fetch alert statistics.
 * @backend GET /alerts/stats
 * @returns {Promise<Object>} Stats object with total_alerts, enabled_alerts, delivered_alerts
 * @throws {Error} On 401 (auth required)
 */
export async function fetchAlertStats() {
  const response = await api.get("/alerts/stats");
  return response.data;
}
