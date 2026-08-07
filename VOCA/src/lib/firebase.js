// Firebase project config — replace with your own project's values.
// Firebase Console → 프로젝트 설정 → 일반 → "내 앱" → SDK 설정 및 구성 에서 복사.
//
// 무료(Spark) 요금제로 충분합니다. 개인/가족 단위 사용량에서는 비용이 발생하지 않아요.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

let app, dbCloud, auth;

export function getFirebase() {
  if (!app) {
    app = initializeApp(firebaseConfig);
    dbCloud = getFirestore(app);
    auth = getAuth(app);
  }
  return { app, dbCloud, auth };
}

export async function ensureSignedIn() {
  const { auth } = getFirebase();
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth.currentUser;
}
