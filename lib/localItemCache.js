const LEGACY_KEY = "gouka_erp_v2_items";
const DB_NAME = "gouka_erp_text_cache_v1";
const STORE = "snapshots";
let initial;
let cachedItems;
let writes = Promise.resolve();

function openDb() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);
    let settled = false;
    const fail = (error) => { settled = true; clearTimeout(timer); reject(error); };
    const timer = setTimeout(() => fail(new Error("Local cache open timed out")), 5000);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => {
      clearTimeout(timer);
      if (settled) request.result.close();
      else { settled = true; resolve(request.result); }
    };
    request.onerror = () => fail(request.error);
    request.onblocked = () => fail(new Error("Local cache is blocked"));
  });
}

async function readSnapshot() {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get("items");
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Cache read aborted"));
    });
  } finally { db.close(); }
}

async function writeSnapshot(text) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(text, "items");
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Cache write aborted"));
    });
  } finally { db.close(); }
}

function parseItems(text) {
  if (!text) return undefined;
  const items = JSON.parse(text);
  if (!Array.isArray(items)) throw new Error("Invalid local item cache");
  return items;
}

export function cachedLocalItems() { return cachedItems; }

export function initializeLocalItemCache() {
  if (!initial) initial = (async () => {
    let legacy;
    try { legacy = localStorage.getItem(LEGACY_KEY); } catch {}
    if (legacy) {
      try {
        cachedItems = parseItems(legacy);
        await writeSnapshot(legacy);
        // Remove only the exact snapshot that has committed successfully.
        if (localStorage.getItem(LEGACY_KEY) === legacy) localStorage.removeItem(LEGACY_KEY);
        return;
      } catch { if (cachedItems) return; }
    }
    try { cachedItems = parseItems(await readSnapshot()); } catch {}
  })();
  return initial;
}

export function saveLocalItemCache(items) {
  let text;
  try { text = JSON.stringify(items); parseItems(text); } catch { return Promise.resolve(false); }
  const save = async () => {
    await initializeLocalItemCache();
    let previousLegacy;
    try { previousLegacy = localStorage.getItem(LEGACY_KEY); } catch {}
    try {
      await writeSnapshot(text);
      cachedItems = JSON.parse(text);
      // The committed database snapshot supersedes only the ERP item cache.
      try { if (localStorage.getItem(LEGACY_KEY) === previousLegacy) localStorage.removeItem(LEGACY_KEY); } catch {}
      return true;
    } catch {
      try {
        localStorage.setItem(LEGACY_KEY, text);
        cachedItems = JSON.parse(text);
        return true;
      } catch { return false; }
    }
  };
  const pending = writes.then(save, save);
  writes = pending.then(() => {}, () => {});
  return pending;
}
