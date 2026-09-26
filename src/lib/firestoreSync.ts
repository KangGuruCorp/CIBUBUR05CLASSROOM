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

// In-Memory Collection Cache on the Client
const collectionCache = new Map<string, any[]>();
const collectionListeners = new Map<string, Set<(data: any[]) => void>>();
let lastServerRevision = 0;
let isSseConnected = false;
let sseSource: EventSource | null = null;
let fallbackInterval: any = null;

// Notify all subscribers of a collection
function notifyListeners(collection: string) {
  const items = collectionCache.get(collection) || [];
  const listeners = collectionListeners.get(collection);
  if (listeners && listeners.size > 0) {
    listeners.forEach((cb) => {
      try {
        cb(items);
      } catch (err) {
        console.warn(`Listener error on collection ${collection}:`, err);
      }
    });
  }
}

// Update a single document in collection cache
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
}

// Remove a document from collection cache
function removeDocFromCache(collection: string, docId: string) {
  let items = collectionCache.get(collection) || [];
  items = items.filter((item: any) => item && item.id !== docId && item.uid !== docId);
  collectionCache.set(collection, items);
  notifyListeners(collection);
}

// Populate full cache from server database object
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
}

// Initialize SSE Stream
function initSseConnection() {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
  if (sseSource) {
    try { sseSource.close(); } catch {}
  }

  try {
    sseSource = new EventSource('/api/sync/events');

    sseSource.onopen = () => {
      isSseConnected = true;
    };

    sseSource.onmessage = (e) => {
      if (!e.data || e.data.startsWith(':')) return;
      try {
        const payload = JSON.parse(e.data);
        if (payload.revision) {
          lastServerRevision = payload.revision;
        }

        if (payload.type === 'upsert' && payload.collection) {
          updateDocInCache(payload.collection, payload.id, payload.data);
        } else if (payload.type === 'delete' && payload.collection) {
          removeDocFromCache(payload.collection, payload.id);
        } else if (payload.type === 'paper_answer') {
          const sessions = collectionCache.get(COLLECTIONS.PAPER_SESSIONS) || [];
          const idx = sessions.findIndex((s: any) => s && s.id === payload.sessionId);
          if (idx >= 0) {
            const session = { ...sessions[idx] };
            session.answersByQuestion = session.answersByQuestion || {};
            session.answersByQuestion[payload.questionIndex] = session.answersByQuestion[payload.questionIndex] || {};
            session.answersByQuestion[payload.questionIndex][payload.answer.studentId] = payload.answer;
            sessions[idx] = session;
            collectionCache.set(COLLECTIONS.PAPER_SESSIONS, [...sessions]);
            notifyListeners(COLLECTIONS.PAPER_SESSIONS);
          }
        } else if (payload.type === 'paper_control') {
          if (payload.session) {
            updateDocInCache(COLLECTIONS.PAPER_SESSIONS, payload.sessionId, payload.session);
          }
        } else if (payload.type === 'bulk') {
          fetchDeltaSync();
        }
      } catch (err) {
        console.warn('SSE message parse error:', err);
      }
    };

    sseSource.onerror = () => {
      isSseConnected = false;
      try { sseSource?.close(); } catch {}
      sseSource = null;
      // Retry in 3 seconds
      setTimeout(initSseConnection, 3000);
    };
  } catch (err) {
    console.warn('Failed to init SSE:', err);
  }
}

// Fallback delta sync
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
  } catch {}
}

// Start background SSE & fallback on load
if (typeof window !== 'undefined') {
  initSseConnection();
  fallbackInterval = setInterval(() => {
    // Only poll if SSE is disconnected
    if (!isSseConnected) {
      fetchDeltaSync();
    }
  }, 4000);

  // Periodic slow sync as safety net every 30s
  setInterval(() => {
    if (isSseConnected) {
      fetchDeltaSync();
    }
  }, 30000);
}

export async function seedFirestoreIfEmpty() {
  return true;
}

export async function syncDocToFirestore(collection: string, docId: string, data: any) {
  // Optimistic cache update
  updateDocInCache(collection, docId, data);

  try {
    const res = await fetch(`/api/collections/${collection}/${encodeURIComponent(docId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.revision) lastServerRevision = json.revision;
    }
  } catch (err) {
    console.warn('syncDocToFirestore error:', err);
  }
}

export async function deleteDocFromFirestore(collection: string, docId: string) {
  // Optimistic cache remove
  removeDocFromCache(collection, docId);

  try {
    const res = await fetch(`/api/collections/${collection}/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const json = await res.json();
      if (json.revision) lastServerRevision = json.revision;
    }
  } catch (err) {
    console.warn('deleteDocFromFirestore error:', err);
  }
}

export async function loadAllFromFirestore() {
  try {
    const res = await fetch('/api/db', { cache: 'no-store' });
    if (res.ok) {
      const db = await res.json();
      populateFullCache(db);
      return db;
    }
  } catch (err) {
    console.warn('loadAllFromFirestore error:', err);
  }
  return null;
}

export function subscribeToRealtimeCollection(collection: string, callback: (data: any[]) => void) {
  if (!collectionListeners.has(collection)) {
    collectionListeners.set(collection, new Set());
  }
  collectionListeners.get(collection)!.add(callback);

  // If we already have items in cache, fire immediately
  if (collectionCache.has(collection)) {
    callback(collectionCache.get(collection)!);
  }

  return () => {
    const set = collectionListeners.get(collection);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        collectionListeners.delete(collection);
      }
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
      const json = await res.json();
      if (json.revision) lastServerRevision = json.revision;
      populateFullCache(data);
      return true;
    }
  } catch (err) {
    console.warn('syncAllStateToFirestore error:', err);
  }
  return false;
}

export async function updateUserPresence(data: any) {
  return syncDocToFirestore(COLLECTIONS.USER_PRESENCE, data.userId, data);
}

export async function setUserOffline(userId: string) {
  return deleteDocFromFirestore(COLLECTIONS.USER_PRESENCE, userId);
}

export function isFirestoreQuotaExceeded() {
  return false;
}

export function setFirestoreQuotaExceeded(val: boolean) {}

export function isQuotaError(err: any) {
  return false;
}

export function cleanForFirestore(obj: any) {
  return obj;
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
    console.warn('submitPaperAnswer error:', err);
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
    console.warn('controlPaperSession error:', err);
    return false;
  }
}
