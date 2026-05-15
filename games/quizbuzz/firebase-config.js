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
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  };
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get references to Firebase services
const database = firebase.database();
const auth = firebase.auth();

// Optional: Enable anonymous authentication
// Uncomment the following to enable anonymous sign-in
/*
auth.signInAnonymously()
  .catch((error) => {
    console.error("Error signing in anonymously:", error);
  });
*/
