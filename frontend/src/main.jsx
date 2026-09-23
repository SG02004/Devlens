import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

function normalizeApiUrl(url) {
  if (!url) return '';
  let cleaned = url.trim().replace(/\/+$/, '');
  if (cleaned && !cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE = normalizeApiUrl(
  import.meta.env.VITE_API_URL || 
  (isLocal ? '' : 'https://devlens-backend-production.up.railway.app')
);

if (API_BASE) {
  const originalFetch = window.fetch;
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      return originalFetch(`${API_BASE}${input}`, init);
    }
    if (input instanceof Request && input.url.startsWith('/api')) {
      return originalFetch(new Request(`${API_BASE}${input.url}`, input), init);
    }
    return originalFetch(input, init);
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

