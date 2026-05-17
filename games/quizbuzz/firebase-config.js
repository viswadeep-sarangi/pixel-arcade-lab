// Firebase Configuration
// 
// SECURITY: Your Firebase credentials are loaded from a local config file
// This keeps your keys out of version control!
//
// TO SET UP:
// 1. Copy config.example.js to config.local.js
// 2. Add your Firebase credentials to config.local.js
// 3. config.local.js is git-ignored and will NOT be committed
//
// Get credentials from: Firebase Console > Project Settings > Your apps

let firebaseConfig = null;
window.database = null;
window.auth = null;

// Try to load from local config file first (keeps keys secret)
if (typeof firebaseConfigLocal !== 'undefined') {
  firebaseConfig = firebaseConfigLocal;
} else {
  // Fallback to empty config (will fail gracefully if not set up)
  console.warn('⚠️  WARNING: Firebase config not loaded. Did you create config.local.js?');
  console.warn('Steps to fix:');
  console.warn('1. Copy config.example.js to config.local.js');
  console.warn('2. Add your Firebase credentials to config.local.js');
  console.warn('3. Reload the page');
  
  firebaseConfig = {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  };
}

const requiredFirebaseConfigKeys = [
  'apiKey',
  'authDomain',
  'databaseURL',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId'
];

const missingFirebaseConfigKeys = requiredFirebaseConfigKeys.filter((key) => !firebaseConfig[key]);

if (!window.firebase) {
  missingFirebaseConfigKeys.push('Firebase SDK scripts');
}

// Initialize Firebase
if (missingFirebaseConfigKeys.length === 0) {
  window.firebase.initializeApp(firebaseConfig);

  // Get references to Firebase services
  window.database = window.firebase.database();
  window.auth = window.firebase.auth();
} else {
  console.error('Firebase is not configured. Missing: ' + missingFirebaseConfigKeys.join(', '));
  console.error('Config source:', typeof firebaseConfigLocal !== 'undefined' ? 'config.local.js' : 'fallback');
  if (typeof firebaseConfigLocal === 'undefined') {
    console.error('firebaseConfigLocal is undefined. The generated config.local.js may not have loaded or may not exist in deployment.');
  }
  console.error('Firebase config values:');
  console.error('  apiKey:', firebaseConfig.apiKey);
  console.error('  authDomain:', firebaseConfig.authDomain);
  console.error('  databaseURL:', firebaseConfig.databaseURL);
  console.error('  projectId:', firebaseConfig.projectId);
  console.error('  storageBucket:', firebaseConfig.storageBucket);
  console.error('  messagingSenderId:', firebaseConfig.messagingSenderId);
  console.error('  appId:', firebaseConfig.appId);
  console.error('If this is a deployed GitHub Pages site, make sure your GitHub Action secrets include every FIREBASE_* value, especially FIREBASE_DATABASE_URL.');
}

// Optional: Enable anonymous authentication
// Uncomment the following to enable anonymous sign-in
/*
auth.signInAnonymously()
  .catch((error) => {
    console.error("Error signing in anonymously:", error);
  });
*/
