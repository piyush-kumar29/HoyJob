/**
 * HoyJob Frontend Configuration
 * This file handles environment-specific variables for the static frontend.
 */

const CONFIG = {
  development: {
    API_BASE: 'http://localhost:5000/api',
    SOCKET_URL: 'http://localhost:5000',
    CLERK_PUBLISHABLE_KEY: 'pk_test_b25lLXBpZ2Vvbi0zMS5jbGVyay5hY2NvdW50cy5kZXYk' // Replace with your Clerk Publishable Key
  },
  production: {
    API_BASE: 'https://hoyjob-backend.onrender.com/api', 
    SOCKET_URL: 'https://hoyjob-backend.onrender.com',
    CLERK_PUBLISHABLE_KEY: 'pk_test_b25lLXBpZ2Vvbi0zMS5jbGVyay5hY2NvdW50cy5kZXYk' // Replace with your Clerk Publishable Key
  }
};

// Auto-detect environment based on hostname
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const ENV = isLocal ? CONFIG.development : CONFIG.production;

// Export as global variable for use in other scripts
window.HJ_CONFIG = ENV;
