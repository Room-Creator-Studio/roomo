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
  apiKey: "ENV_API_KEY",
  authDomain: "ENV_AUTH_DOMAIN",
  projectId: "ENV_PROJECT_ID",
  storageBucket: "ENV_STORAGE_BUCKET",
  messagingSenderId: "ENV_MESSAGING_SENDER_ID",
  appId: "ENV_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Export app for reference
export default app;
