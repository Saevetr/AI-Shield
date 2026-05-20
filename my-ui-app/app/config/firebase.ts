// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCqbG_5E4N2gjIDzwl0W70V-OxpXSAr1fI",
  authDomain: "maipianaishield-d61c7.firebaseapp.com",
  projectId: "maipianaishield-d61c7",
  storageBucket: "maipianaishield-d61c7.firebasestorage.app",
  messagingSenderId: "99083038415",
  appId: "1:99083038415:web:566a59e7bde4e280ea51ba",
  measurementId: "G-HB5WEC0R88",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export auth
export const auth = getAuth(app);