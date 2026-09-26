import { BoardElement, BoardParticipant, CollabBoard } from '../types/collabBoard';
import { safeStorage } from '../utils/storage';

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

// Global SSE Connection
let eventSource: EventSource | null = null;
type BoardListener = (boards: CollabBoard[]) => void;
const listeners = new Set<BoardListener>();

let reconnectTimer: any = null;

function initSSE() {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
  if (eventSource) return;
  
  try {
    eventSource = new EventSource('/api/stream');
    
    eventSource.onmessage = (event) => {
      if (!event.data || event.data.startsWith(':')) return;
      try {
        const boards = JSON.parse(event.data) as CollabBoard[];
        saveLocalBoards(boards);
        listeners.forEach(listener => listener(boards));
      } catch (err) {
        console.warn('Failed to parse SSE boards data', err);
      }
    };

    eventSource.onerror = () => {
      try { eventSource?.close(); } catch {}
      eventSource = null;
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          initSSE();
        }, 2000);
      }
    };
  } catch (err) {
    console.warn('Failed to init board SSE:', err);
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
        try { eventSource?.close(); } catch {}
        eventSource = null;
        initSSE();
      }
    }
  });
}

/**
 * Subscribe to list of boards for a class in real-time.
 */
export function subscribeToClassBoards(
  classId: string,
  onUpdate: (boards: CollabBoard[]) => void
): () => void {
  const initialLocal = getLocalBoards().filter(
    (b) => !classId || b.classId === classId || b.classId === 'all'
  );
  onUpdate(initialLocal);

  const listener: BoardListener = (allBoards) => {
    const filtered = allBoards.filter(
      (b) => !classId || b.classId === classId || b.classId === 'all'
    );
    onUpdate(filtered);
  };

  listeners.add(listener);
  initSSE();

  // Also fetch immediately via REST to ensure data is always up to date even if SSE is connecting
  fetch('/api/boards')
    .then((res) => (res.ok ? res.json() : null))
    .then((boards) => {
      if (Array.isArray(boards)) {
        saveLocalBoards(boards);
        const filtered = boards.filter(
          (b) => !classId || b.classId === classId || b.classId === 'all'
        );
        onUpdate(filtered);
      }
    })
    .catch((err) => console.warn('Fetch initial boards error:', err));

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Subscribe to a single board's real-time changes.
 */
export function subscribeToBoard(
  boardId: string,
  onUpdate: (board: CollabBoard | null) => void
): () => void {
  const localList = getLocalBoards();
  const found = localList.find((b) => b.id === boardId);
  if (found) onUpdate(found);

  const listener: BoardListener = (allBoards) => {
    const match = allBoards.find((b) => b.id === boardId);
    if (match) onUpdate(match);
  };

  listeners.add(listener);
  initSSE();

  const fetchLatest = () => {
    fetch(`/api/boards/${boardId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((b) => {
        if (b && typeof b === 'object' && b.id) {
          saveLocalBoardSingle(b);
          onUpdate(b);
        }
      })
      .catch((err) => console.warn('Fetch single board error:', err));
  };

  // Immediate fetch on subscription
  fetchLatest();

  // 1.5s interval polling fallback ensures cross-device updates arrive even if SSE drops
  const pollTimer = setInterval(fetchLatest, 1500);

  return () => {
    listeners.delete(listener);
    clearInterval(pollTimer);
  };
}

/**
 * Create a new collaborative board in backend and local storage.
 */
export async function createBoard(board: CollabBoard): Promise<CollabBoard> {
  saveLocalBoardSingle(board);

  try {
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(board),
    });
    if (!res.ok) throw new Error('Failed to create board');
  } catch (err) {
    console.warn('Failed to save new board to backend, kept locally:', err);
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
  const list = getLocalBoards();
  const idx = list.findIndex((b) => b.id === boardId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
    saveLocalBoards(list);
  }

  try {
    await fetch(`/api/boards/${boardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  } catch (err) {
    console.warn('Failed to update board in backend:', err);
  }
}

/**
 * Update or add an element in a board in real-time.
 */
export async function upsertBoardElement(
  boardId: string,
  element: BoardElement
): Promise<void> {
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

  try {
    await fetch(`/api/boards/${boardId}/elements`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(element),
    });
  } catch (err) {
    console.warn('Failed to upsert element:', err);
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

  try {
    await fetch(`/api/boards/${boardId}/elements/${elementId}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Failed to delete element:', err);
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

  try {
    await fetch(`/api/boards/${boardId}/elements`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Failed to clear elements:', err);
  }
}

/**
 * Delete a board completely.
 */
export async function deleteBoard(boardId: string): Promise<void> {
  const list = getLocalBoards().filter((b) => b.id !== boardId);
  saveLocalBoards(list);

  try {
    await fetch(`/api/boards/${boardId}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Failed to delete board from backend:', err);
  }
}

/**
 * Update participant active presence.
 */
export async function updateParticipantPresence(
  boardId: string,
  participant: BoardParticipant
): Promise<void> {
  try {
    await fetch(`/api/boards/${boardId}/participants/${participant.userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participant),
    });
  } catch (err) {
    console.warn('Failed to update presence:', err);
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

  const localList = getLocalBoards();
  const localFound = localList.find((b) => b.code.toUpperCase() === sanitized);
  if (localFound) return localFound;

  try {
    const res = await fetch('/api/boards');
    if (res.ok) {
      const boards: CollabBoard[] = await res.json();
      const match = boards.find(b => b.code.toUpperCase() === sanitized);
      if (match) {
        saveLocalBoardSingle(match);
        return match;
      }
    }
  } catch (err) {
    console.warn('findBoardByCode backend error:', err);
  }

  return null;
}
