/**
 * FIREBASE CONFIGURATION - EXAMPLE FILE
 *
 * Copy this file to config.local.js and fill in your Firebase web app details.
 * config.local.js is ignored by git.
 */

const firebaseConfigLocal = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456ghi789"
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = firebaseConfigLocal;
}
