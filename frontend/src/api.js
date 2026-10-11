import axios from 'axios';

// Set REACT_APP_API_URL at build time for deployed builds; local dev falls back to the dev server.
export const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const TOKEN_KEY = 'ecotrack-token';
const USER_KEY = 'ecotrack-user';

// Browser storage can throw (private windows, blocked cookies), so the app must work without it
export function loadSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return token && user ? { token, user } : null;
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch { /* ignore */ }
  tokenInMemory = token;
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch { /* ignore */ }
  tokenInMemory = null;
}

let tokenInMemory = loadSession()?.token || null;

const api = axios.create({ baseURL: API_URL, timeout: 90000 });

// "Is the server waking up?" tracking. Free hosting sleeps when idle and the first request
// can take a minute, so if any request stays pending for a few seconds the UI says so.
const SLOW_AFTER_MS = 4000;
let pending = 0;
let slowTimer = null;
let slow = false;
const slowListeners = new Set();

function setSlow(value) {
  if (slow === value) return;
  slow = value;
  slowListeners.forEach(listener => listener(slow));
}

export function subscribeSlow(listener) {
  slowListeners.add(listener);
  listener(slow);
  return () => slowListeners.delete(listener);
}

function requestStarted() {
  pending += 1;
  if (pending === 1) slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
}

function requestFinished() {
  pending = Math.max(0, pending - 1);
  if (pending === 0) {
    clearTimeout(slowTimer);
    setSlow(false);
  }
}

api.interceptors.request.use(config => {
  requestStarted();
  if (tokenInMemory) config.headers.Authorization = `Bearer ${tokenInMemory}`;
  // Lets the server work out "today" and streak days in the user's timezone
  config.headers['X-TZ-Offset'] = String(new Date().getTimezoneOffset());
  return config;
});

api.interceptors.response.use(
  response => {
    requestFinished();
    return response;
  },
  error => {
    requestFinished();
    // An expired or invalid token on a protected call logs the user out. Failed login
    // attempts also return 401, so those are excluded.
    const isAuthAttempt = /\/api\/auth\/(login|register|demo)/.test(error.config?.url || '');
    if (error.response?.status === 401 && !isAuthAttempt) {
      clearSession();
      window.dispatchEvent(new Event('ecotrack:unauthorized'));
    }
    return Promise.reject(error);
  }
);

// A readable message for any failed request
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.response?.status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (err?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (err?.request && !err.response) return "Can't reach the server. Check your connection and try again.";
  return fallback;
}

export default api;
