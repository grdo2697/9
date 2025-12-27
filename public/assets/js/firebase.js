// Firebase (Web v9+ modular via CDN). Place your config below.
// ملاحظة: هذا الـ config مو سر، بس المفاتيح الحساسة (مثل OpenAI) تبقى بالسيرفر فقط.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAFhx3eSJWdikmF0GEMiVMES13yrwRRsz8",
  authDomain: "alasr-smart.firebaseapp.com",
  databaseURL: "https://alasr-smart-default-rtdb.firebaseio.com",
  projectId: "alasr-smart",
  storageBucket: "alasr-smart.firebasestorage.app",
  messagingSenderId: "554721608537",
  appId: "1:554721608537:web:d08e487bf9431fc8e2c248",
  measurementId: "G-CFGTW40G6Q"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
