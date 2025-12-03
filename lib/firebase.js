import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- เอาค่าจาก Firebase มาใส่ตรงนี้ ---
const firebaseConfig = {
  apiKey: "AIzaSyB_CAsFsBUS9Ts-tHpMSJF5HQgfZPTEPl0",
  authDomain: "stock-jin2app.firebaseapp.com",
  projectId: "stock-jin2app",
  storageBucket: "stock-jin2app.firebasestorage.app",
  messagingSenderId: "1027980414054",
  appId: "1:1027980414054:web:d7a818e8312b3bb021f1a7",
  measurementId: "G-EXMH6GYT43"
};

// เริ่มต้นใช้งาน Firebase
const app = initializeApp(firebaseConfig);

// *** บรรทัดนี้สำคัญที่สุดครับ ถ้าขาดไปจะขึ้น Error แบบที่คุณเจอ ***
export const db = getFirestore(app);