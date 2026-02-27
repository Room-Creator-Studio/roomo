// =========================================
// FIREBASE INITIALIZATION
// =========================================
// Using Firebase Web SDK (modular v9+)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// Firebase configuration
// Replace these with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyDGRimvvjyQiSyE_-aFlpIgCo1Ky46hQQs",
  authDomain: "room-99a46.firebaseapp.com"",
  projectId: "room-99a46",
  storageBucket: "room-99a46.firebasestorage.app",
  messagingSenderId: "122165046155",
  appId: "1:122165046155:web:60e5bc2651b533a94f1d8e",
  measurementId: "G-SBXMYFCN3M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Export app for reference
export default app;

