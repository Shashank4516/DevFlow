// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCf5JXnBqAx2lAZAZZy81p1HWcqkV2ms-k",
  authDomain: "devflow-5e2e7.firebaseapp.com",
  projectId: "devflow-5e2e7",
  storageBucket: "devflow-5e2e7.firebasestorage.app",
  messagingSenderId: "898129290480",
  appId: "1:898129290480:web:2360bf827c558aed858e35",
  measurementId: "G-2PXEEPX1Y4",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// Export config for use with compat layer (e.g. firebase_helper)
export { firebaseConfig };
