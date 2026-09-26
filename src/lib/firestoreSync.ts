import localforage from 'localforage';

export const COLLECTIONS = {
  USERS: 'users',
  SCHOOL: 'school',
  CLASSES: 'classes',
  MATERIALS: 'materials',
  MATERIAL_PROGRESS: 'materialProgress',
  ASSIGNMENTS: 'assignments',
  SUBMISSIONS: 'submissions',
  MISSIONS: 'missions',
  MISSION_PROGRESS: 'missionProgress',
  POINT_LEDGER: 'pointLedger',
  USER_STATS: 'userStats',
  BADGES: 'badges',
  USER_BADGES: 'userBadges',
  ANNOUNCEMENTS: 'announcements',
  CHAT_MESSAGES: 'chatMessages',
  USER_PRESENCE: 'userPresence',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'auditLogs',
  QUIZZES: 'quizzes',
  QUIZ_SUBMISSIONS: 'quizSubmissions',
  PAPER_SESSIONS: 'paperSessions',
};

const collectionCache = new Map<string, any[]>();
const collectionListeners = new Map<string, Set<(data: any[]) => void>>();
let lastServerRevision = 0;
let pollingInterval: any = null;

// IndexedDB initialization for offline mode
const store = localforage.createInstance({
  name: 'GamiClassDB'
});

function notifyListeners(collection: string) {
  const items = collectionCache.get(collection) || [];
  const listeners = collectionListeners.get(collection);
  if (listeners && listeners.size > 0) {
    listeners.forEach(cb => {
      try { cb(items); } catch (e) {}
    });
  }
}

async function persistCache() {
  const obj: Record<string, any> = {};
  collectionCache.forEach((value, key) => {
    obj[key] = value;
  });
  await store.setItem('offline_db_cache', obj);
}

function updateDocInCache(collection: string, docId: string, data: any) {
  let items = collectionCache.get(collection) || [];
  const idx = items.findIndex((item: any) => item && (item.id === docId || item.uid === docId));
  if (idx >= 0) {
    items = [...items];
    items[idx] = { ...items[idx], ...data };
  } else {
    items = [...items, data];
  }
  collectionCache.set(collection, items);
  notifyListeners(collection);
  persistCache();
}

function removeDocFromCache(collection: string, docId: string) {
  let items = collectionCache.get(collection) || [];
  items = items.filter((item: any) => item && item.id !== docId && item.uid !== docId);
  collectionCache.set(collection, items);
  notifyListeners(collection);
  persistCache();
}

function populateFullCache(db: Record<string, any>) {
  if (!db || typeof db !== 'object') return;
  Object.keys(db).forEach((coll) => {
    let val = db[coll];
    if (val == null) return;
    if (!Array.isArray(val) && typeof val === 'object') {
      val = Object.values(val);
    }
    if (Array.isArray(val)) {
      collectionCache.set(coll, val.filter((i: any) => i != null));
      notifyListeners(coll);
    }
  });
  persistCache();
}

// Load from offline storage immediately on boot
async function initOfflineCache() {
  try {
    const offlineDb = await store.getItem<Record<string, any>>('offline_db_cache');
    if (offlineDb) populateFullCache(offlineDb);
  } catch (err) {
    console.warn('Failed to load offline DB:', err);
  }
}

async function fetchDeltaSync() {
  try {
    const res = await fetch(`/api/sync?since=${lastServerRevision}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.modified && data.db) {
        lastServerRevision = data.revision;
        populateFullCache(data.db);
      }
    }
  } catch (e) {
    // Silent fail -> stay offline
  }
}

// Start polling
if (typeof window !== 'undefined') {
  initOfflineCache().then(() => {
    fetchDeltaSync();
    pollingInterval = setInterval(fetchDeltaSync, 1000); // Smart polling every 1s
  });
}

export async function syncDocToFirestore(collection: string, docId: string, data: any) {
  updateDocInCache(collection, docId, data);
  try {
    await fetch(`/api/collections/${collection}/${encodeURIComponent(docId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (err) {
    // Offline mode: already updated cache, will sync later
  }
}

export async function deleteDocFromFirestore(collection: string, docId: string) {
  removeDocFromCache(collection, docId);
  try {
    await fetch(`/api/collections/${collection}/${encodeURIComponent(docId)}`, { method: 'DELETE' });
  } catch (err) {}
}

export async function loadAllFromFirestore() {
  const db = await store.getItem<Record<string, any>>('offline_db_cache') || {};
  try {
    const res = await fetch('/api/db', { cache: 'no-store' });
    if (res.ok) {
      const serverDb = await res.json();
      populateFullCache(serverDb);
      return serverDb;
    }
  } catch (err) {}
  return db;
}

export function subscribeToRealtimeCollection(collection: string, callback: (data: any[]) => void) {
  if (!collectionListeners.has(collection)) collectionListeners.set(collection, new Set());
  collectionListeners.get(collection)!.add(callback);
  
  if (collectionCache.has(collection)) {
    callback(collectionCache.get(collection)!);
  }
  return () => {
    const set = collectionListeners.get(collection);
    if (set) {
      set.delete(callback);
      if (set.size === 0) collectionListeners.delete(collection);
    }
  };
}

export async function syncAllStateToFirestore(data: any) {
  try {
    const res = await fetch('/api/db', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      populateFullCache(data);
      return true;
    }
  } catch (err) {}
  populateFullCache(data);
  return false;
}

export async function updateUserPresence(data: any) {
  return syncDocToFirestore(COLLECTIONS.USER_PRESENCE, data.userId, data);
}

export async function setUserOffline(userId: string) {
  return deleteDocFromFirestore(COLLECTIONS.USER_PRESENCE, userId);
}

export function isFirestoreQuotaExceeded() { return false; }
export function setFirestoreQuotaExceeded(val: boolean) {}
export function isQuotaError(err: any) { return false; }
export function cleanForFirestore(obj: any) { return obj; }

export async function submitPaperAnswersBatch(sessionId: string, questionIndex: number, answers: any[]) {
  try {
    const res = await fetch(`/api/paper-sessions/${encodeURIComponent(sessionId)}/answers-batch`,  {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIndex, answers }),
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function submitPaperAnswer(sessionId: string, questionIndex: number, answer: any) {
  try {
    const res = await fetch(`/api/paper-sessions/${encodeURIComponent(sessionId)}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIndex, answer }),
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function controlPaperSession(sessionId: string, updates: any) {
  try {
    const res = await fetch(`/api/paper-sessions/${encodeURIComponent(sessionId)}/control`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function seedFirestoreIfEmpty() { return true; }




