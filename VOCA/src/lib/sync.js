// Cloud backup / cross-device sync.
//
// Deliberately simple: the user picks a "sync code" (a passphrase) in
// Settings. That code is the Firestore document id under `syncs/{code}`.
// Entering the same code on another device pulls the same data down.
//
// This is NOT strong access control — anyone who guesses the code can
// read/write that document. For a personal/family vocab app that's an
// acceptable tradeoff, but pick a long, non-obvious code (the app can
// suggest one). Do not reuse this pattern for anything sensitive.
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebase, ensureSignedIn } from "./firebase.js";
import { readAllRaw, writeAllRaw } from "./localStore.js";

const SYNCED_KEYS = ["vocab_words", "vocab_sessions", "vocab_meta", "vocab_badges"];

export function suggestSyncCode() {
  // short, easy to type on a phone, hard to guess
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"; // no ambiguous chars
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out.match(/.{1,5}/g).join("-"); // e.g. "ab3de-fg7hk"
}

export async function pushToCloud(syncCode) {
  if (!syncCode) throw new Error("동기화 코드가 없어요.");
  await ensureSignedIn();
  const { dbCloud } = getFirebase();
  const local = await readAllRaw();
  const payload = {};
  for (const k of SYNCED_KEYS) if (local[k] !== undefined) payload[k] = local[k];
  await setDoc(doc(dbCloud, "syncs", syncCode), { ...payload, updatedAt: serverTimestamp() });
  return true;
}

export async function pullFromCloud(syncCode) {
  if (!syncCode) throw new Error("동기화 코드가 없어요.");
  await ensureSignedIn();
  const { dbCloud } = getFirebase();
  const snap = await getDoc(doc(dbCloud, "syncs", syncCode));
  if (!snap.exists()) throw new Error("클라우드에 저장된 데이터가 없어요.");
  const data = snap.data();
  const toWrite = {};
  for (const k of SYNCED_KEYS) if (data[k] !== undefined) toWrite[k] = data[k];
  await writeAllRaw(toWrite);
  return true;
}
