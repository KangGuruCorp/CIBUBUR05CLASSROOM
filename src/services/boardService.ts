import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BoardElement, BoardParticipant, CollabBoard } from '../types/collabBoard';
import { safeStorage } from '../utils/storage';
import {
  cleanForFirestore,
  isFirestoreQuotaExceeded,
  setFirestoreQuotaExceeded,
  isQuotaError,
} from '../lib/firestoreSync';

const BOARDS_COLLECTION = 'ide_boards';
const LOCAL_BOARDS_KEY = 'gamiclass_ide_boards';

export function generateBoardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 3; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 3; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getLocalBoards(): CollabBoard[] {
  try {
    const raw = safeStorage.getItem(LOCAL_BOARDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse local boards', err);
  }
  return [];
}

export function saveLocalBoards(boards: CollabBoard[]): void {
  try {
    safeStorage.setItem(LOCAL_BOARDS_KEY, JSON.stringify(boards));
  } catch (err) {
    console.warn('Failed to save local boards', err);
  }
}

export function saveLocalBoardSingle(board: CollabBoard): void {
  const list = getLocalBoards();
  const idx = list.findIndex((b) => b.id === board.id);
  if (idx >= 0) {
    list[idx] = board;
  } else {
    list.unshift(board);
  }
  saveLocalBoards(list);
}

/**
 * Subscribe to list of boards for a class in real-time.
 */
export function subscribeToClassBoards(
  classId: string,
  onUpdate: (boards: CollabBoard[]) => void
): () => void {
  // Always emit local cache first
  const initialLocal = getLocalBoards().filter(
    (b) => !classId || b.classId === classId || b.classId === 'all'
  );
  onUpdate(initialLocal);

  try {
    const collRef = collection(db, BOARDS_COLLECTION);
    const q = classId
      ? query(collRef, where('classId', 'in', [classId, 'all']))
      : collRef;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const boards: CollabBoard[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as CollabBoard;
          boards.push({
            ...data,
            id: docSnap.id,
            elements: data.elements || {},
          });
        });

        // Merge with local boards if any exist locally
        const mergedMap = new Map<string, CollabBoard>();
        initialLocal.forEach((b) => mergedMap.set(b.id, b));
        boards.forEach((b) => mergedMap.set(b.id, b));

        const sorted = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        saveLocalBoards(sorted);
        onUpdate(sorted);
      },
      (error) => {
        console.warn('Firestore boards onSnapshot error, falling back to local cache:', error);
        onUpdate(initialLocal);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('subscribeToClassBoards failed, using local only:', err);
    return () => {};
  }
}

/**
 * Subscribe to a single board's real-time changes (elements, participants, lock status).
 */
export function subscribeToBoard(
  boardId: string,
  onUpdate: (board: CollabBoard | null) => void
): () => void {
  // Emit local copy first if available
  const localList = getLocalBoards();
  const found = localList.find((b) => b.id === boardId);
  if (found) onUpdate(found);

  try {
    const docRef = doc(db, BOARDS_COLLECTION, boardId);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as CollabBoard;
          const board: CollabBoard = {
            ...data,
            id: snapshot.id,
            elements: data.elements || {},
            activeParticipants: data.activeParticipants || {},
          };
          saveLocalBoardSingle(board);
          onUpdate(board);
        } else {
          // Check local cache
          const localMatch = getLocalBoards().find((b) => b.id === boardId);
          onUpdate(localMatch || null);
        }
      },
      (error) => {
        console.warn(`Firestore onSnapshot error on board ${boardId}:`, error);
        const localMatch = getLocalBoards().find((b) => b.id === boardId);
        if (localMatch) onUpdate(localMatch);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('subscribeToBoard failed, using local fallback:', err);
    return () => {};
  }
}

/**
 * Create a new collaborative board in Firestore and local storage.
 */
export async function createBoard(board: CollabBoard): Promise<CollabBoard> {
  saveLocalBoardSingle(board);

  if (isFirestoreQuotaExceeded()) return board;

  try {
    const docRef = doc(db, BOARDS_COLLECTION, board.id);
    const cleaned = cleanForFirestore(board);
    await setDoc(docRef, cleaned);
  } catch (err) {
    if (isQuotaError(err)) {
      setFirestoreQuotaExceeded(true);
    } else {
      console.warn('Failed to save new board to Firestore, kept locally:', err);
    }
  }

  return board;
}

/**
 * Save or update board metadata.
 */
export async function updateBoard(
  boardId: string,
  updates: Partial<CollabBoard>
): Promise<void> {
  // Update local cache
  const list = getLocalBoards();
  const idx = list.findIndex((b) => b.id === boardId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
    saveLocalBoards(list);
  }

  if (isFirestoreQuotaExceeded()) return;

  try {
    const docRef = doc(db, BOARDS_COLLECTION, boardId);
    const cleaned = cleanForFirestore({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await updateDoc(docRef, cleaned);
  } catch (err) {
    if (isQuotaError(err)) {
      setFirestoreQuotaExceeded(true);
    } else {
      console.warn('Failed to update board in Firestore:', err);
    }
  }
}

/**
 * Update or add an element in a board in real-time.
 */
export async function upsertBoardElement(
  boardId: string,
  element: BoardElement
): Promise<void> {
  // Update local
  const list = getLocalBoards();
  const idx = list.findIndex((b) => b.id === boardId);
  if (idx >= 0) {
    list[idx].elements = {
      ...(list[idx].elements || {}),
      [element.id]: element,
    };
    list[idx].updatedAt = new Date().toISOString();
    saveLocalBoards(list);
  }

  if (isFirestoreQuotaExceeded()) return;

  try {
    const docRef = doc(db, BOARDS_COLLECTION, boardId);
    await updateDoc(docRef, {
      [`elements.${element.id}`]: cleanForFirestore(element),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (isQuotaError(err)) {
      setFirestoreQuotaExceeded(true);
      return;
    }
    // If updateDoc fails (e.g., document needs full setDoc), attempt fallback
    try {
      if (idx >= 0) {
        const docRef = doc(db, BOARDS_COLLECTION, boardId);
        await setDoc(docRef, cleanForFirestore(list[idx]), { merge: true });
      }
    } catch {
      // Handled locally
    }
  }
}

/**
 * Remove an element from the board.
 */
export async function removeBoardElement(
  boardId: string,
  elementId: string
): Promise<void> {
  const list = getLocalBoards();
  const idx = list.findIndex((b) => b.id === boardId);
  if (idx >= 0 && list[idx].elements) {
    delete list[idx].elements[elementId];
    list[idx].updatedAt = new Date().toISOString();
    saveLocalBoards(list);
  }

  if (isFirestoreQuotaExceeded()) return;

  try {
    const docRef = doc(db, BOARDS_COLLECTION, boardId);
    if (idx >= 0) {
      await updateDoc(docRef, {
        elements: cleanForFirestore(list[idx].elements),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    if (isQuotaError(err)) {
      setFirestoreQuotaExceeded(true);
    } else {
      console.warn('Failed to delete element in Firestore:', err);
    }
  }
}

/**
 * Clear all elements from the board.
 */
export async function clearAllBoardElements(boardId: string): Promise<void> {
  const list = getLocalBoards();
  const idx = list.findIndex((b) => b.id === boardId);
  if (idx >= 0) {
    list[idx].elements = {};
    list[idx].updatedAt = new Date().toISOString();
    saveLocalBoards(list);
  }

  if (isFirestoreQuotaExceeded()) return;

  try {
    const docRef = doc(db, BOARDS_COLLECTION, boardId);
    await updateDoc(docRef, {
      elements: {},
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (isQuotaError(err)) {
      setFirestoreQuotaExceeded(true);
    } else {
      console.warn('Failed to clear elements in Firestore:', err);
    }
  }
}

/**
 * Delete a board completely.
 */
export async function deleteBoard(boardId: string): Promise<void> {
  const list = getLocalBoards().filter((b) => b.id !== boardId);
  saveLocalBoards(list);

  if (isFirestoreQuotaExceeded()) return;

  try {
    const docRef = doc(db, BOARDS_COLLECTION, boardId);
    await deleteDoc(docRef);
  } catch (err) {
    if (isQuotaError(err)) {
      setFirestoreQuotaExceeded(true);
    } else {
      console.warn('Failed to delete board from Firestore:', err);
    }
  }
}

/**
 * Update participant active presence.
 */
export async function updateParticipantPresence(
  boardId: string,
  participant: BoardParticipant
): Promise<void> {
  if (isFirestoreQuotaExceeded()) return;
  try {
    const docRef = doc(db, BOARDS_COLLECTION, boardId);
    await updateDoc(docRef, {
      [`activeParticipants.${participant.userId}`]: cleanForFirestore(participant),
    });
  } catch (err) {
    if (isQuotaError(err)) {
      setFirestoreQuotaExceeded(true);
    }
    // Non-critical presence update
  }
}

/**
 * Alias for updateParticipantPresence.
 */
export async function updateBoardParticipant(
  boardId: string,
  participant: BoardParticipant
): Promise<void> {
  return updateParticipantPresence(boardId, participant);
}

/**
 * Toggle lock status on a board (Teacher control).
 */
export async function toggleBoardLock(boardId: string, isLocked: boolean): Promise<void> {
  return updateBoard(boardId, { isLocked });
}

/**
 * Find board by 6-character code (case-insensitive).
 */
export async function findBoardByCode(code: string): Promise<CollabBoard | null> {
  const sanitized = code.trim().toUpperCase();

  // Check local cache first
  const localList = getLocalBoards();
  const localFound = localList.find((b) => b.code.toUpperCase() === sanitized);
  if (localFound) return localFound;

  try {
    const collRef = collection(db, BOARDS_COLLECTION);
    const q = query(collRef, where('code', '==', sanitized));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      const data = docSnap.data() as CollabBoard;
      const board: CollabBoard = {
        ...data,
        id: docSnap.id,
        elements: data.elements || {},
        activeParticipants: data.activeParticipants || {},
      };
      saveLocalBoardSingle(board);
      return board;
    }
  } catch (err) {
    console.warn('findBoardByCode firestore error:', err);
  }

  return null;
}
