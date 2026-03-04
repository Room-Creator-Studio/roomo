// =========================================
// FIREBASE INITIALIZATION
// =========================================
// Using Firebase Web SDK (modular v9+)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDGRimvvjyQiSyE_-aFlpIgCo1Ky46hQQs",
  authDomain: "room-99a46.firebaseapp.com",
  projectId: "room-99a46",
  storageBucket: "room-99a46.firebasestorage.app",
  messagingSenderId: "122165046155",
  appId: "1:122165046155:web:60e5bc2651b533a94f1d8e"
};

let app;
let db;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  console.log('✓ Firebase initialized successfully');
  
  // Initialize Firestore
  db = getFirestore(app);
  console.log('✓ Firestore initialized');
  
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  console.error('Config used:', firebaseConfig);
}

// Export initialized services
export { db, app };
export default app;
s
