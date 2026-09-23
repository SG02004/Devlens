/**
 * Centralized API Client for DevLens
 * Manages HTTP requests, bearer authentication tokens, and standardized errors.
 *
 * VITE_API_URL:
 *   - Local dev: leave empty → relative paths proxy through Vite (/api → localhost:8000)
 *   - Railway:   set to https://your-backend.up.railway.app → absolute calls to prod backend
 */

function normalizeApiUrl(url) {
  if (!url) return '';
  let cleaned = url.trim().replace(/\/+$/, '');
  if (cleaned && !cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

const TOKEN_KEY = "devlens.auth_token";
const BASE_URL = normalizeApiUrl(import.meta.env.VITE_API_URL || "");

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function request(endpoint, options = {}) {
  const { params, headers: customHeaders, ...restOptions } = options;

  let url = BASE_URL + endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const token = getAuthToken();
  const headers = new Headers(customHeaders || {});

  if (!headers.has("Content-Type") && !(restOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...restOptions,
    headers,
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson.message || errorDetail;
    } catch {
      // Non-JSON error body fallback
    }
    throw new Error(errorDetail || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return {};
  }

  return await response.json();
}
