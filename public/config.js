/**
 * Frontend API Configuration
 * 
 * This file configures which backend URL the frontend should connect to.
 * - Local development: http://localhost:3000
 * - Production (Render): Automatically uses same domain
 */

// Auto-detect API URL based on environment
window.API_URL = (() => {
  const hostname = window.location.hostname;
  
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  
  // Production - Use current domain (Render)
  // This works because frontend + backend are on same server
  return window.location.origin; // Same domain for both
})();

console.log('[Config] Using API URL:', window.API_URL);
