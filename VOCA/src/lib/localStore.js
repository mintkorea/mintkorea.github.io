// Local-first persistence using IndexedDB (via Dexie).
//
// This intentionally mirrors the shape of the Claude.ai artifact's
// `window.storage` API (get/set/delete/list, values are JSON strings,
// get() throws on a missing key) so the app code that was written
// against that API keeps working unchanged once this is wired up
// as `window.storage` in main.jsx.
import Dexie from "dexie";

const db = new Dexie("vocabAppDB");
db.version(1).stores({
  kv: "key",
});

async function get(key) {
  const row = await db.kv.get(key);
  if (!row) throw new Error(`key not found: ${key}`);
  return { key, value: row.value, shared: false };
}

async function set(key, value) {
  await db.kv.put({ key, value });
  return { key, value, shared: false };
}

async function del(key) {
  await db.kv.delete(key);
  return { key, deleted: true, shared: false };
}

async function list(prefix = "") {
  const all = await db.kv.toArray();
  const keys = all.map((r) => r.key).filter((k) => k.startsWith(prefix));
  return { keys, prefix, shared: false };
}

export const localStore = { get, set, delete: del, list };

// Convenience helpers used directly by the sync module (bypasses the
// throw-on-missing-key behavior, which is only there to match the
// artifact API contract).
export async function readAllRaw() {
  const rows = await db.kv.toArray();
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export async function writeAllRaw(obj) {
  const rows = Object.entries(obj).map(([key, value]) => ({ key, value }));
  await db.kv.bulkPut(rows);
}
