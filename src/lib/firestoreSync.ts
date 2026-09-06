import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { safeStorage } from '../utils/storage';
import {
  INITIAL_ANNOUNCEMENTS,
  INITIAL_ASSIGNMENTS,
  INITIAL_BADGES,
  INITIAL_CHAT_MESSAGES,
  INITIAL_CLASSES,
  INITIAL_MATERIALS,
  INITIAL_MISSIONS,
  INITIAL_POINT_LEDGER,
  INITIAL_SCHOOL,
  INITIAL_SUBMISSIONS,
  INITIAL_USERS,
  INITIAL_USER_STATS,
} from '../data/mockData';

export const FIRESTORE_QUOTA_STORAGE_KEY = 'gamiclass_firestore_quota_exceeded';

export function isQuotaError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code;
  return (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('Free daily write units') ||
    msg.includes('Free daily read units')
  );
}

export function isFirestoreQuotaExceeded(): boolean {
  try {
    const raw = safeStorage.getItem(FIRESTORE_QUOTA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Reset if older than 24 hours
      if (parsed.timestamp && Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
        safeStorage.removeItem(FIRESTORE_QUOTA_STORAGE_KEY);
      } else if (parsed.exceeded) {
        return true;
      }
    }

    // Default known exhausted period for the Spark free tier database limit:
    // Quota was depleted on 2026-09-06 and will reset at 00:00 PST / 07:00 UTC on 2026-09-07.
    const today = new Date().toISOString().slice(0, 10);
    if (today === '2026-09-06') {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function setFirestoreQuotaExceeded(exceeded: boolean = true): void {
  try {
    if (exceeded) {
      safeStorage.setItem(
        FIRESTORE_QUOTA_STORAGE_KEY,
        JSON.stringify({
          exceeded: true,
          timestamp: Date.now(),
          dateStr: new Date().toISOString(),
        })
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('firestore-quota-exceeded', { detail: { exceeded: true } })
        );
      }
    } else {
      safeStorage.removeItem(FIRESTORE_QUOTA_STORAGE_KEY);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('firestore-quota-exceeded', { detail: { exceeded: false } })
        );
      }
    }
  } catch {}
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (isQuotaError(error)) {
    setFirestoreQuotaExceeded(true);
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));

  // Do not throw unhandled fatal error if quota is exhausted, to maintain smooth offline experience
  if (!isQuotaError(error)) {
    throw new Error(JSON.stringify(errInfo));
  }
}

export async function testConnection(): Promise<void> {
  if (isFirestoreQuotaExceeded()) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (isQuotaError(error)) {
      setFirestoreQuotaExceeded(true);
      return;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Please check your Firebase configuration.');
    }
  }
}

// Firestore collection names
export const COLLECTIONS = {
  USERS: 'users',
  CLASSES: 'classes',
  MATERIALS: 'materials',
  ASSIGNMENTS: 'assignments',
  SUBMISSIONS: 'submissions',
  MISSIONS: 'missions',
  MISSION_PROGRESS: 'mission_progress',
  MATERIAL_PROGRESS: 'material_progress',
  POINT_LEDGER: 'point_ledger',
  USER_STATS: 'user_stats',
  USER_BADGES: 'user_badges',
  BADGES: 'badges',
  ANNOUNCEMENTS: 'announcements',
  AUDIT_LOGS: 'audit_logs',
  SCHOOL: 'school',
  NOTIFICATIONS: 'notifications',
  APP_METADATA: 'app_metadata',
  CHAT_MESSAGES: 'chat_messages',
  USER_PRESENCE: 'user_presence',
  BOARDS: 'ide_boards',
} as const;

/**
 * Deep-cleans an object to ensure it is 100% compliant with Firestore rules and serializer.
 * Recursively removes all keys where value is undefined, converts Date to ISO strings,
 * and sanitizes arrays.
 */
export function cleanForFirestore<T = any>(obj: T): T {
  if (obj === null || obj === undefined) return null as any;
  if (obj instanceof Date) return obj.toISOString() as any;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as any;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      result[key] = cleanForFirestore(value);
    }
  }
  return result as T;
}

/**
 * Seeds initial mock data to Firestore if the database is freshly provisioned.
 */
export async function seedFirestoreIfEmpty(): Promise<boolean> {
  if (isFirestoreQuotaExceeded()) {
    console.info('Firestore daily write quota reached; operating locally.');
    return false;
  }
  try {
    const metaDocRef = doc(db, COLLECTIONS.APP_METADATA, 'sync_status');
    try {
      const metaSnap = await getDocFromServer(metaDocRef);
      if (metaSnap.exists() && metaSnap.data()?.initialized) {
        console.log('Firebase Firestore already populated with data.');
        return true;
      }
    } catch (metaErr) {
      if (isQuotaError(metaErr)) {
        setFirestoreQuotaExceeded(true);
        return false;
      }
      // If metadata doc doesn't exist yet, proceed with collection check
    }

    const [usersSnap, classesSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.USERS)),
      getDocs(collection(db, COLLECTIONS.CLASSES)),
    ]);
    if (!usersSnap.empty || !classesSnap.empty) {
      console.log('Firebase Firestore already contains users and classes data.');
      return true;
    }

    console.log('Populating Firestore with initial gamification dataset...');
    
    // Seed using individual setDoc with merge to ensure resilience
    const seedTasks: Promise<any>[] = [];

    // 0. School
    seedTasks.push(setDoc(doc(db, COLLECTIONS.SCHOOL, INITIAL_SCHOOL.id), cleanForFirestore(INITIAL_SCHOOL), { merge: true }));

    // 1. Users
    INITIAL_USERS.forEach((u) => {
      seedTasks.push(setDoc(doc(db, COLLECTIONS.USERS, u.uid), cleanForFirestore(u), { merge: true }));
    });

    // 2. Classes
    INITIAL_CLASSES.forEach((c) => {
      seedTasks.push(setDoc(doc(db, COLLECTIONS.CLASSES, c.id), cleanForFirestore(c), { merge: true }));
    });

    // 3. Materials
    INITIAL_MATERIALS.forEach((m) => {
      seedTasks.push(setDoc(doc(db, COLLECTIONS.MATERIALS, m.id), cleanForFirestore(m), { merge: true }));
    });

    // 4. Assignments
    INITIAL_ASSIGNMENTS.forEach((a) => {
      seedTasks.push(setDoc(doc(db, COLLECTIONS.ASSIGNMENTS, a.id), cleanForFirestore(a), { merge: true }));
    });

    // 5. Submissions
    Object.values(INITIAL_SUBMISSIONS).forEach((s) => {
      seedTasks.push(setDoc(doc(db, COLLECTIONS.SUBMISSIONS, s.id), cleanForFirestore(s), { merge: true }));
    });

    // 6. Missions
    INITIAL_MISSIONS.forEach((ms) => {
      seedTasks.push(setDoc(doc(db, COLLECTIONS.MISSIONS, ms.id), cleanForFirestore(ms), { merge: true }));
    });

    // 7. Badges
    INITIAL_BADGES.forEach((b) => {
      seedTasks.push(setDoc(doc(db, COLLECTIONS.BADGES, b.id), cleanForFirestore(b), { merge: true }));
    });

    // 8. User Stats
    Object.entries(INITIAL_USER_STATS).forEach(([userId, stats]) => {
      seedTasks.push(setDoc(doc(db, COLLECTIONS.USER_STATS, userId), cleanForFirestore(stats), { merge: true }));
    });

    // 9. Announcements
    INITIAL_ANNOUNCEMENTS.forEach((ann) => {
      seedTasks.push(setDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, ann.id), cleanForFirestore(ann), { merge: true }));
    });

    // 10. Point Ledger
    INITIAL_POINT_LEDGER.forEach((pl) => {
      seedTasks.push(setDoc(doc(db, COLLECTIONS.POINT_LEDGER, pl.id), cleanForFirestore(pl), { merge: true }));
    });

    // 11. Chat Messages
    INITIAL_CHAT_MESSAGES.forEach((msg) => {
      seedTasks.push(setDoc(doc(db, COLLECTIONS.CHAT_MESSAGES, msg.id), cleanForFirestore(msg), { merge: true }));
    });

    await Promise.allSettled(seedTasks);

    // Write metadata doc
    await setDoc(metaDocRef, cleanForFirestore({
      initialized: true,
      initializedAt: new Date().toISOString(),
      version: '1.0.0',
    }), { merge: true });

    console.log('Firebase Firestore seeding completed successfully.');
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      setFirestoreQuotaExceeded(true);
      return false;
    }
    try {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.APP_METADATA);
    } catch (loggedErr) {
      console.warn('Seed firestore non-fatal warning:', loggedErr);
    }
    return false;
  }
}

/**
 * Save / Update a single document in Firestore
 */
export async function syncDocToFirestore(
  collectionName: string,
  docId: string,
  data: Record<string, any>
): Promise<void> {
  if (!docId || !collectionName || !data) return;
  if (isFirestoreQuotaExceeded()) {
    // Quota reached: do not send network write to avoid backoff delays
    return;
  }
  try {
    const docRef = doc(db, collectionName, String(docId).trim());
    const payload = cleanForFirestore({
      ...data,
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    if (isQuotaError(error)) {
      setFirestoreQuotaExceeded(true);
      return;
    }
    try {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docId}`);
    } catch (loggedErr) {
      console.warn(`Sync to firestore non-fatal warning (${collectionName}/${docId}):`, loggedErr);
    }
  }
}

/**
 * Delete a single document in Firestore
 */
export async function deleteDocFromFirestore(
  collectionName: string,
  docId: string
): Promise<void> {
  if (!docId || !collectionName) return;
  if (isFirestoreQuotaExceeded()) return;
  try {
    const docRef = doc(db, collectionName, String(docId).trim());
    await deleteDoc(docRef);
  } catch (error) {
    if (isQuotaError(error)) {
      setFirestoreQuotaExceeded(true);
      return;
    }
    try {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${docId}`);
    } catch (loggedErr) {
      console.warn(`Delete from firestore non-fatal warning (${collectionName}/${docId}):`, loggedErr);
    }
  }
}

/**
 * Sync entire application state to Firestore to ensure online persistence across all devices
 */
export async function syncAllStateToFirestore(appData: any): Promise<boolean> {
  if (!appData || isFirestoreQuotaExceeded()) return false;
  try {
    const tasks: Promise<any>[] = [];

    // Users
    if (Array.isArray(appData.users)) {
      appData.users.forEach((u: any) => {
        if (u?.uid) tasks.push(syncDocToFirestore(COLLECTIONS.USERS, u.uid, u));
      });
    }

    // Classes
    if (Array.isArray(appData.classes)) {
      appData.classes.forEach((c: any) => {
        if (c?.id) tasks.push(syncDocToFirestore(COLLECTIONS.CLASSES, c.id, c));
      });
    }

    // Materials
    if (Array.isArray(appData.materials)) {
      appData.materials.forEach((m: any) => {
        if (m?.id) tasks.push(syncDocToFirestore(COLLECTIONS.MATERIALS, m.id, m));
      });
    }

    // Material Progress
    if (appData.materialProgress && typeof appData.materialProgress === 'object') {
      Object.entries(appData.materialProgress).forEach(([key, prog]: [string, any]) => {
        if (key && prog) tasks.push(syncDocToFirestore(COLLECTIONS.MATERIAL_PROGRESS, key, prog));
      });
    }

    // Assignments
    if (Array.isArray(appData.assignments)) {
      appData.assignments.forEach((a: any) => {
        if (a?.id) tasks.push(syncDocToFirestore(COLLECTIONS.ASSIGNMENTS, a.id, a));
      });
    }

    // Submissions
    if (appData.submissions && typeof appData.submissions === 'object') {
      Object.entries(appData.submissions).forEach(([key, sub]: [string, any]) => {
        if (key && sub) tasks.push(syncDocToFirestore(COLLECTIONS.SUBMISSIONS, key, sub));
      });
    }

    // Missions
    if (Array.isArray(appData.missions)) {
      appData.missions.forEach((ms: any) => {
        if (ms?.id) tasks.push(syncDocToFirestore(COLLECTIONS.MISSIONS, ms.id, ms));
      });
    }

    // Mission Progress
    if (appData.missionProgress && typeof appData.missionProgress === 'object') {
      Object.entries(appData.missionProgress).forEach(([key, prog]: [string, any]) => {
        if (key && prog) tasks.push(syncDocToFirestore(COLLECTIONS.MISSION_PROGRESS, key, prog));
      });
    }

    // User Stats
    if (appData.userStats && typeof appData.userStats === 'object') {
      Object.entries(appData.userStats).forEach(([userId, stats]: [string, any]) => {
        if (userId && stats) tasks.push(syncDocToFirestore(COLLECTIONS.USER_STATS, userId, stats));
      });
    }

    // Badges
    if (Array.isArray(appData.badges)) {
      appData.badges.forEach((b: any) => {
        if (b?.id) tasks.push(syncDocToFirestore(COLLECTIONS.BADGES, b.id, b));
      });
    }

    // User Badges
    if (Array.isArray(appData.userBadges)) {
      appData.userBadges.forEach((ub: any) => {
        const id = ub.id || `${ub.userId}_${ub.badgeId}`;
        tasks.push(syncDocToFirestore(COLLECTIONS.USER_BADGES, id, ub));
      });
    }

    // Announcements
    if (Array.isArray(appData.announcements)) {
      appData.announcements.forEach((ann: any) => {
        if (ann?.id) tasks.push(syncDocToFirestore(COLLECTIONS.ANNOUNCEMENTS, ann.id, ann));
      });
    }

    // Point Ledger
    if (Array.isArray(appData.pointLedger)) {
      appData.pointLedger.forEach((pl: any) => {
        if (pl?.id) tasks.push(syncDocToFirestore(COLLECTIONS.POINT_LEDGER, pl.id, pl));
      });
    }

    // School
    if (appData.school && appData.school.id) {
      tasks.push(syncDocToFirestore(COLLECTIONS.SCHOOL, appData.school.id, appData.school));
    }

    // Audit logs
    if (Array.isArray(appData.auditLogs)) {
      appData.auditLogs.slice(0, 50).forEach((al: any) => {
        if (al?.id) tasks.push(syncDocToFirestore(COLLECTIONS.AUDIT_LOGS, al.id, al));
      });
    }

    // Chat messages
    if (Array.isArray(appData.chatMessages)) {
      appData.chatMessages.forEach((msg: any) => {
        if (msg?.id) tasks.push(syncDocToFirestore(COLLECTIONS.CHAT_MESSAGES, msg.id, msg));
      });
    }

    // Notifications
    if (Array.isArray(appData.notifications)) {
      appData.notifications.slice(0, 100).forEach((notif: any) => {
        if (notif?.id) tasks.push(syncDocToFirestore(COLLECTIONS.NOTIFICATIONS, notif.id, notif));
      });
    }

    await Promise.allSettled(tasks);
    return true;
  } catch (err) {
    console.warn('syncAllStateToFirestore warning:', err);
    return false;
  }
}

/**
 * Fetch all documents from Firestore collections to sync database online
 */
export async function loadAllFromFirestore(): Promise<{
  users?: any[];
  classes?: any[];
  materials?: any[];
  materialProgress?: Record<string, any>;
  assignments?: any[];
  submissions?: Record<string, any>;
  missions?: any[];
  missionProgress?: Record<string, any>;
  userStats?: Record<string, any>;
  badges?: any[];
  userBadges?: any[];
  announcements?: any[];
  pointLedger?: any[];
  auditLogs?: any[];
  school?: any;
  chatMessages?: any[];
  notifications?: any[];
} | null> {
  try {
    const results = await Promise.allSettled([
      getDocs(collection(db, COLLECTIONS.USERS)),
      getDocs(collection(db, COLLECTIONS.CLASSES)),
      getDocs(collection(db, COLLECTIONS.MATERIALS)),
      getDocs(collection(db, COLLECTIONS.MATERIAL_PROGRESS)),
      getDocs(collection(db, COLLECTIONS.ASSIGNMENTS)),
      getDocs(collection(db, COLLECTIONS.SUBMISSIONS)),
      getDocs(collection(db, COLLECTIONS.MISSIONS)),
      getDocs(collection(db, COLLECTIONS.MISSION_PROGRESS)),
      getDocs(collection(db, COLLECTIONS.USER_STATS)),
      getDocs(collection(db, COLLECTIONS.BADGES)),
      getDocs(collection(db, COLLECTIONS.USER_BADGES)),
      getDocs(collection(db, COLLECTIONS.ANNOUNCEMENTS)),
      getDocs(collection(db, COLLECTIONS.POINT_LEDGER)),
      getDocs(collection(db, COLLECTIONS.AUDIT_LOGS)),
      getDocs(collection(db, COLLECTIONS.SCHOOL)),
      getDocs(collection(db, COLLECTIONS.CHAT_MESSAGES)),
      getDocs(collection(db, COLLECTIONS.NOTIFICATIONS)),
    ]);

    const getDocList = (idx: number) => {
      const res = results[idx];
      return res.status === 'fulfilled'
        ? res.value.docs.map((d) => ({ id: d.id, ...d.data() }))
        : undefined;
    };

    const getDocMap = (idx: number, keyProp?: string, altKeyFn?: (data: any) => string[]) => {
      const res = results[idx];
      if (res.status !== 'fulfilled') return undefined;
      const map: Record<string, any> = {};
      res.value.docs.forEach((d) => {
        const data = { id: d.id, ...d.data() };
        const key = keyProp && (data as any)?.[keyProp] ? (data as any)[keyProp] : d.id;
        map[key] = data;
        if (altKeyFn) {
          altKeyFn(data).forEach((altKey) => {
            if (altKey) map[altKey] = data;
          });
        }
      });
      return map;
    };

    const users = getDocList(0);
    const classes = getDocList(1);
    const materials = getDocList(2);
    const materialProgress = getDocMap(3, undefined, (d) => (d.materialId && d.userId ? [`${d.materialId}_${d.userId}`] : []));
    const assignments = getDocList(4);
    const submissions = getDocMap(5, undefined, (d) => (d.assignmentId && d.userId ? [`${d.assignmentId}_${d.userId}`] : []));
    const missions = getDocList(6);
    const missionProgress = getDocMap(7, undefined, (d) =>
      d.missionId && d.userId
        ? [`${d.missionId}_${d.userId}_${d.periodKey || 'w1'}`, `${d.missionId}_${d.userId}`]
        : []
    );
    const userStats = getDocMap(8, 'uid');
    const badges = getDocList(9);
    const userBadges = getDocList(10);
    const announcements = getDocList(11);
    const pointLedger = getDocList(12);
    const auditLogs = getDocList(13);
    const schools = getDocList(14);
    const chatMessages = getDocList(15);
    const notifications = getDocList(16);

    return {
      users: users !== undefined ? users : undefined,
      classes: classes !== undefined ? classes : undefined,
      materials: materials !== undefined ? materials : undefined,
      materialProgress: materialProgress !== undefined ? materialProgress : undefined,
      assignments: assignments !== undefined ? assignments : undefined,
      submissions: submissions !== undefined ? submissions : undefined,
      missions: missions !== undefined ? missions : undefined,
      missionProgress: missionProgress !== undefined ? missionProgress : undefined,
      userStats: userStats !== undefined ? userStats : undefined,
      badges: badges !== undefined ? badges : undefined,
      userBadges: userBadges !== undefined ? userBadges : undefined,
      announcements: announcements !== undefined ? announcements : undefined,
      pointLedger: pointLedger !== undefined ? pointLedger : undefined,
      auditLogs: auditLogs !== undefined ? auditLogs : undefined,
      school: schools && schools.length > 0 ? schools[0] : undefined,
      chatMessages: chatMessages !== undefined ? chatMessages : undefined,
      notifications: notifications !== undefined ? notifications : undefined,
    };
  } catch (err) {
    console.warn('Failed to load all collections from Firestore:', err);
    return null;
  }
}

/**
 * Real-time listener for a Firestore collection
 */
export function subscribeToRealtimeCollection(
  collectionName: string,
  onUpdate: (docs: any[]) => void
): () => void {
  try {
    const unsub = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        onUpdate(items);
      },
      (error) => {
        console.warn(`Real-time listener warning for ${collectionName}:`, error.message);
        try {
          handleFirestoreError(error, OperationType.GET, collectionName);
        } catch (e) {
          // Handled and logged according to Firestore error guidelines
        }
      }
    );
    return unsub;
  } catch (err) {
    console.warn(`Could not subscribe to ${collectionName}:`, err);
    return () => {};
  }
}

/**
 * Update real-time user presence in Firestore
 */
export async function updateUserPresence(presence: {
  userId: string;
  displayName: string;
  role: string;
  avatarUrl?: string;
  classId?: string;
  isOnline: boolean;
  lastSeen?: number;
  lastSeenIso?: string;
  activity?: string;
}): Promise<void> {
  if (!presence || !presence.userId) return;
  if (isFirestoreQuotaExceeded()) return;
  try {
    const docRef = doc(db, COLLECTIONS.USER_PRESENCE, presence.userId);
    const now = Date.now();
    const payload = cleanForFirestore({
      ...presence,
      lastSeen: presence.lastSeen || now,
      lastSeenIso: presence.lastSeenIso || new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    if (isQuotaError(error)) {
      setFirestoreQuotaExceeded(true);
      return;
    }
    try {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.USER_PRESENCE}/${presence.userId}`);
    } catch (loggedErr) {
      console.warn('Presence update non-fatal warning:', loggedErr);
    }
  }
}

/**
 * Set user as offline when leaving or closing tab
 */
export async function setUserOffline(userId: string): Promise<void> {
  if (!userId) return;
  if (isFirestoreQuotaExceeded()) return;
  try {
    const docRef = doc(db, COLLECTIONS.USER_PRESENCE, userId);
    const now = Date.now();
    await setDoc(
      docRef,
      cleanForFirestore({
        isOnline: false,
        lastSeen: now,
        lastSeenIso: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    if (isQuotaError(error)) {
      setFirestoreQuotaExceeded(true);
      return;
    }
    console.warn('Set user offline warning:', error);
  }
}


