/**
 * FIREBASE CONFIGURATION - EXAMPLE FILE
 * 
 * DO NOT commit your real credentials to git!
 * 
 * STEPS:
 * 1. Copy this file and rename the copy to "config.local.js"
 * 2. Fill in your actual Firebase credentials in config.local.js
 * 3. The config.local.js file is git-ignored and will NOT be committed
 * 4. firebase-config.js will automatically use config.local.js if it exists
 * 
 * Get your credentials from Firebase Console:
 * https://console.firebase.google.com/
 * → Project Settings (gear icon)
 * → Your apps → Web app
 */

const firebaseConfigLocal = {
  apiKey: "AIzaSyC...",  // Replace with your actual API key
  authDomain: "your-project-id.firebaseapp.com",  // Replace with your auth domain
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",  // Replace with your Realtime Database URL
  projectId: "your-project-id",  // Replace with your project ID
  storageBucket: "your-project-id.appspot.com",  // Replace with your storage bucket
  messagingSenderId: "123456789",  // Replace with your messaging sender ID
  appId: "1:123456789:web:abc123def456ghi789"  // Replace with your app ID
};

// Export for use in firebase-config.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = firebaseConfigLocal;
}
