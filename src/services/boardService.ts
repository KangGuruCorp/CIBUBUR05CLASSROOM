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
  } catch (err) {}
  return [];
}

export function saveLocalBoards(boards: CollabBoard[]): void {
  try {
    safeStorage.setItem(LOCAL_BOARDS_KEY, JSON.stringify(boards));
  } catch (err) {}
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

type BoardListener = (boards: CollabBoard[]) => void;
const listeners = new Set<BoardListener>();
let globalPollActive = false;

function startGlobalPoll() {
  if (globalPollActive) return;
  globalPollActive = true;
  setInterval(async () => {
    if (listeners.size === 0) return;
    try {
      const res = await fetch('/api/boards');
      if (res.ok) {
        const boards = await res.json();
        saveLocalBoards(boards);
        listeners.forEach(listener => listener(boards));
      }
    } catch (e) {}
  }, 2500); // Poll every 2.5s instead of SSE for Vercel
}

export function subscribeToClassBoards(
  classId: string,
  onUpdate: (boards: CollabBoard[]) => void
): () => void {
  startGlobalPoll();
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

  fetch('/api/boards')
    .then((res) => (res.ok ? res.json() : null))
    .then((boards) => {
      if (Array.isArray(boards)) {
        saveLocalBoards(boards);
        listener(boards);
      }
    }).catch(() => {});

  return () => {
    listeners.delete(listener);
  };
}

export function subscribeToBoard(
  boardId: string,
  onUpdate: (board: CollabBoard | null) => void
): () => void {
  startGlobalPoll();
  const localList = getLocalBoards();
  const found = localList.find((b) => b.id === boardId);
  if (found) onUpdate(found);

  const listener: BoardListener = (allBoards) => {
    const match = allBoards.find((b) => b.id === boardId);
    if (match) onUpdate(match);
  };

  listeners.add(listener);

  const fetchLatest = () => {
    fetch(`/api/boards/${boardId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((b) => {
        if (b && typeof b === 'object' && b.id) {
          saveLocalBoardSingle(b);
          onUpdate(b);
        }
      }).catch(() => {});
  };

  fetchLatest();
  const pollTimer = setInterval(fetchLatest, 1500);

  return () => {
    listeners.delete(listener);
    clearInterval(pollTimer);
  };
}

export async function createBoard(board: CollabBoard): Promise<CollabBoard> {
  saveLocalBoardSingle(board);
  try {
    await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(board),
    });
  } catch (err) {}
  return board;
}

export async function updateBoard(boardId: string, updates: Partial<CollabBoard>): Promise<void> {
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
  } catch (err) {}
}

export async function upsertBoardElement(boardId: string, element: BoardElement): Promise<void> {
  const list = getLocalBoards();
  const idx = list.findIndex((b) => b.id === boardId);
  if (idx >= 0) {
    list[idx].elements = { ...(list[idx].elements || {}), [element.id]: element };
    list[idx].updatedAt = new Date().toISOString();
    saveLocalBoards(list);
  }
  try {
    await fetch(`/api/boards/${boardId}/elements`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(element),
    });
  } catch (err) {}
}

export async function removeBoardElement(boardId: string, elementId: string): Promise<void> {
  const list = getLocalBoards();
  const idx = list.findIndex((b) => b.id === boardId);
  if (idx >= 0 && list[idx].elements) {
    delete list[idx].elements[elementId];
    list[idx].updatedAt = new Date().toISOString();
    saveLocalBoards(list);
  }
  try {
    await fetch(`/api/boards/${boardId}/elements/${elementId}`, { method: 'DELETE' });
  } catch (err) {}
}

export async function clearAllBoardElements(boardId: string): Promise<void> {
  const list = getLocalBoards();
  const idx = list.findIndex((b) => b.id === boardId);
  if (idx >= 0) {
    list[idx].elements = {};
    list[idx].updatedAt = new Date().toISOString();
    saveLocalBoards(list);
  }
  try {
    await fetch(`/api/boards/${boardId}/elements`, { method: 'DELETE' });
  } catch (err) {}
}

export async function deleteBoard(boardId: string): Promise<void> {
  const list = getLocalBoards().filter((b) => b.id !== boardId);
  saveLocalBoards(list);
  try {
    await fetch(`/api/boards/${boardId}`, { method: 'DELETE' });
  } catch (err) {}
}

export async function updateParticipantPresence(boardId: string, participant: BoardParticipant): Promise<void> {
  try {
    await fetch(`/api/boards/${boardId}/participants/${participant.userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participant),
    });
  } catch (err) {}
}

export async function updateBoardParticipant(boardId: string, participant: BoardParticipant): Promise<void> {
  return updateParticipantPresence(boardId, participant);
}

export async function toggleBoardLock(boardId: string, isLocked: boolean): Promise<void> {
  return updateBoard(boardId, { isLocked });
}

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
  } catch (err) {}
  return null;
}
