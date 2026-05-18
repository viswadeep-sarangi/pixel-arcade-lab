let firebaseConfig = null;
window.database = null;
window.auth = null;

if (typeof firebaseConfigLocal !== 'undefined') {
  firebaseConfig = firebaseConfigLocal;
} else {
  console.warn('Firebase config not loaded. Create games/lietome/config.local.js from config.example.js.');
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

if (missingFirebaseConfigKeys.length === 0) {
  window.firebase.initializeApp(firebaseConfig);
  window.database = window.firebase.database();
  window.auth = window.firebase.auth();
} else {
  console.error('Firebase is not configured. Missing: ' + missingFirebaseConfigKeys.join(', '));
}
