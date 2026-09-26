import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Parse JSON bodies FIRST before any routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

// Disable caching for all API endpoints
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

const DATA_DIR = path.join(__dirname, 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const BOARDS_FILE = path.join(DATA_DIR, 'boards.json');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── In-Memory Database & State Engine ────────────────────────────────────────

let memoryDb = {};
let boardsMemory = [];
let dbRevision = Date.now();
let isDbLoaded = false;
let isSavingToDisk = false;
let pendingSave = false;
let isSavingBoards = false;
let pendingSaveBoards = false;
let lastBackupTime = 0;

// Active SSE Connections
let sseDbClients = [];
let sseBoardClients = [];

function broadcastDbChange(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  sseDbClients = sseDbClients.filter(client => {
    try {
      client.res.write(payload);
      return true;
    } catch {
      return false;
    }
  });
}

let broadcastBoardTimer = null;
function broadcastBoardChange(data) {
  if (broadcastBoardTimer) clearTimeout(broadcastBoardTimer);
  broadcastBoardTimer = setTimeout(() => {
    broadcastBoardTimer = null;
    const payload = `data: ${JSON.stringify(boardsMemory)}\n\n`;
    sseBoardClients = sseBoardClients.filter(client => {
      try {
        client.res.write(payload);
        return true;
      } catch {
        return false;
      }
    });
  }, 25);
}

async function createSafetyBackup() {
  try {
    if (!memoryDb || Object.keys(memoryDb).length === 0) return;
    await fs.mkdir(BACKUPS_DIR, { recursive: true });
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const data = JSON.stringify(memoryDb, null, 2);

    // Latest snapshot
    await fs.writeFile(path.join(BACKUPS_DIR, 'db_backup_latest.json'), data);
    // Daily snapshot
    await fs.writeFile(path.join(BACKUPS_DIR, `db_backup_${dateStr}.json`), data);
    lastBackupTime = Date.now();
  } catch (err) {
    console.error('Failed to create safety backup:', err);
  }
}

function reconcilePointsAndLedger(dbObj) {
  if (!dbObj || typeof dbObj !== 'object') return;
  
  // 1. Deduplicate pointLedger by idempotencyKey || id
  if (Array.isArray(dbObj.pointLedger)) {
    const seenKeys = new Set();
    const dedupedLedger = [];
    dbObj.pointLedger.forEach(l => {
      if (!l) return;
      const key = l.idempotencyKey || l.id;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        dedupedLedger.push(l);
      }
    });
    dbObj.pointLedger = dedupedLedger;
  }

  // 2. Reconcile userStats with pointLedger
  if (dbObj.userStats && typeof dbObj.userStats === 'object' && Array.isArray(dbObj.pointLedger)) {
    const ledgerByUser = {};
    dbObj.pointLedger.forEach(l => {
      if (!l || !l.userId) return;
      ledgerByUser[l.userId] = ledgerByUser[l.userId] || [];
      ledgerByUser[l.userId].push(l);
    });

    Object.keys(dbObj.userStats).forEach(uid => {
      const userLedgers = ledgerByUser[uid] || [];
      if (userLedgers.length > 0) {
        const ledgerTotal = Math.max(0, userLedgers.reduce((sum, l) => sum + (Number(l.amount) || 0), 0));
        const academicTotal = Math.max(0, userLedgers.filter(l => l.category === 'academic').reduce((sum, l) => sum + (Number(l.amount) || 0), 0));
        const partTotal = Math.max(0, ledgerTotal - academicTotal);
        const totalXp = userLedgers.reduce((sum, l) => {
          const val = l.xpAmount !== undefined ? l.xpAmount : l.amount;
          return sum + (val > 0 ? Number(val) : 0);
        }, 0);

        dbObj.userStats[uid] = {
          ...dbObj.userStats[uid],
          totalPoints: ledgerTotal,
          academicPoints: academicTotal,
          participationPoints: partTotal,
          totalXp: Math.max(dbObj.userStats[uid]?.totalXp || 0, totalXp),
        };
      }
    });
  }
}

async function loadDbFromDisk() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    memoryDb = JSON.parse(data);
    Object.keys(memoryDb).forEach(k => {
      if (memoryDb[k] == null) {
        delete memoryDb[k];
      } else if (Array.isArray(memoryDb[k])) {
        memoryDb[k] = memoryDb[k].filter(i => i != null);
      }
    });
    reconcilePointsAndLedger(memoryDb);
    // Create immediate safety backup upon successful load
    createSafetyBackup();
  } catch {
    memoryDb = {};
  }
  isDbLoaded = true;
}

async function loadBoardsFromDisk() {
  try {
    const data = await fs.readFile(BOARDS_FILE, 'utf-8');
    boardsMemory = JSON.parse(data);
    if (!Array.isArray(boardsMemory)) boardsMemory = [];
  } catch {
    boardsMemory = [];
  }
}

async function scheduleDiskSave() {
  if (isSavingToDisk) {
    pendingSave = true;
    return;
  }
  isSavingToDisk = true;
  pendingSave = false;

  try {
    reconcilePointsAndLedger(memoryDb);
    Object.keys(memoryDb).forEach(k => {
      if (memoryDb[k] == null) {
        delete memoryDb[k];
      } else if (Array.isArray(memoryDb[k])) {
        memoryDb[k] = memoryDb[k].filter(i => i != null);
      }
    });
    const data = JSON.stringify(memoryDb, null, 2);
    
    // Atomic write via temp file
    const tmpFile = `${DB_FILE}.tmp`;
    await fs.writeFile(tmpFile, data);
    await fs.rename(tmpFile, DB_FILE);

    // Periodic backup every 10 minutes
    if (Date.now() - lastBackupTime > 10 * 60 * 1000) {
      createSafetyBackup();
    }
  } catch (err) {
    console.error('Write DB error:', err);
  } finally {
    isSavingToDisk = false;
    if (pendingSave) {
      setTimeout(scheduleDiskSave, 50);
    }
  }
}

async function scheduleBoardsSave() {
  if (isSavingBoards) {
    pendingSaveBoards = true;
    return;
  }
  isSavingBoards = true;
  pendingSaveBoards = false;

  try {
    const data = JSON.stringify(boardsMemory, null, 2);
    const tmpFile = `${BOARDS_FILE}.tmp`;
    await fs.writeFile(tmpFile, data);
    await fs.rename(tmpFile, BOARDS_FILE);
  } catch (err) {
    console.error('Write boards error:', err);
  } finally {
    isSavingBoards = false;
    if (pendingSaveBoards) {
      setTimeout(scheduleBoardsSave, 50);
    }
  }
}

async function initDb() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(BACKUPS_DIR, { recursive: true });
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.mkdir(path.join(UPLOADS_DIR, 'avatars'), { recursive: true });
    await fs.mkdir(path.join(UPLOADS_DIR, 'attachments'), { recursive: true });
    await fs.mkdir(path.join(UPLOADS_DIR, 'chat'), { recursive: true });

    try { await fs.access(BOARDS_FILE); } catch { await fs.writeFile(BOARDS_FILE, JSON.stringify([])); }
    try { await fs.access(DB_FILE); } catch { await fs.writeFile(DB_FILE, JSON.stringify({})); }
    await loadDbFromDisk();
    await loadBoardsFromDisk();
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
}

initDb();

function getDb() {
  return memoryDb;
}

function getBoards() {
  return boardsMemory;
}

// ─── Realtime SSE Sync Events ─────────────────────────────────────────────────

app.get('/api/sync/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = Date.now() + Math.random().toString(36).substring(2, 6);
  const clientObj = { id: clientId, res };
  sseDbClients.push(clientObj);

  // Send initial connection revision
  res.write(`data: ${JSON.stringify({ type: 'init', revision: dbRevision })}\n\n`);

  // Heartbeat ping every 15s to keep connection active
  const heartbeat = setInterval(() => {
    try {
      res.write(':ping\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseDbClients = sseDbClients.filter(c => c.id !== clientId);
  });
});

// Single Unified Delta Sync
app.get('/api/sync', (req, res) => {
  const since = req.query.since ? Number(req.query.since) : 0;
  if (since && since === dbRevision) {
    return res.json({ modified: false, revision: dbRevision });
  }
  res.json({
    modified: true,
    revision: dbRevision,
    db: memoryDb,
  });
});

// ─── SSE Boards Stream ────────────────────────────────────────────────────────

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = Date.now() + Math.random().toString(36).substring(2, 6);
  sseBoardClients.push({ id: clientId, res });

  res.write(`data: ${JSON.stringify(boardsMemory)}\n\n`);

  // Heartbeat ping every 15s
  const heartbeat = setInterval(() => {
    try {
      res.write(':ping\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseBoardClients = sseBoardClients.filter(c => c.id !== clientId);
  });
});

// ─── Board Endpoints ──────────────────────────────────────────────────────────

app.get('/api/boards', (req, res) => res.json(boardsMemory));

app.get('/api/boards/:id', (req, res) => {
  const b = boardsMemory.find(x => x.id === req.params.id);
  if (b) {
    res.json(b);
  } else {
    res.status(404).json({ error: 'Board not found' });
  }
});

app.post('/api/boards', (req, res) => {
  const board = req.body;
  boardsMemory.unshift(board);
  scheduleBoardsSave();
  broadcastBoardChange(boardsMemory);
  res.json(board);
});

app.patch('/api/boards/:id', (req, res) => {
  const { id } = req.params;
  const idx = boardsMemory.findIndex(b => b.id === id);
  if (idx >= 0) {
    boardsMemory[idx] = { ...boardsMemory[idx], ...req.body, updatedAt: new Date().toISOString() };
    scheduleBoardsSave();
    broadcastBoardChange(boardsMemory);
    res.json(boardsMemory[idx]);
  } else {
    res.status(404).json({ error: 'Board not found' });
  }
});

app.delete('/api/boards/:id', (req, res) => {
  boardsMemory = boardsMemory.filter(b => b.id !== req.params.id);
  scheduleBoardsSave();
  broadcastBoardChange(boardsMemory);
  res.json({ success: true });
});

app.put('/api/boards/:id/elements', (req, res) => {
  const { id } = req.params;
  const element = req.body;
  const idx = boardsMemory.findIndex(b => b.id === id);
  if (idx >= 0) {
    boardsMemory[idx].elements = boardsMemory[idx].elements || {};
    boardsMemory[idx].elements[element.id] = element;
    boardsMemory[idx].updatedAt = new Date().toISOString();
    scheduleBoardsSave();
    broadcastBoardChange(boardsMemory);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Board not found' });
  }
});

app.delete('/api/boards/:id/elements/:elementId', (req, res) => {
  const { id, elementId } = req.params;
  const idx = boardsMemory.findIndex(b => b.id === id);
  if (idx >= 0 && boardsMemory[idx].elements) {
    delete boardsMemory[idx].elements[elementId];
    boardsMemory[idx].updatedAt = new Date().toISOString();
    scheduleBoardsSave();
    broadcastBoardChange(boardsMemory);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Board not found' });
  }
});

app.delete('/api/boards/:id/elements', (req, res) => {
  const { id } = req.params;
  const idx = boardsMemory.findIndex(b => b.id === id);
  if (idx >= 0) {
    boardsMemory[idx].elements = {};
    boardsMemory[idx].updatedAt = new Date().toISOString();
    scheduleBoardsSave();
    broadcastBoardChange(boardsMemory);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Board not found' });
  }
});

app.put('/api/boards/:id/participants/:userId', (req, res) => {
  const { id, userId } = req.params;
  const idx = boardsMemory.findIndex(b => b.id === id);
  if (idx >= 0) {
    boardsMemory[idx].activeParticipants = boardsMemory[idx].activeParticipants || {};
    boardsMemory[idx].activeParticipants[userId] = req.body;
    scheduleBoardsSave();
    broadcastBoardChange(boardsMemory);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Board not found' });
  }
});

// ─── Generic Collections API ──────────────────────────────────────────────────

const ARRAY_COLLECTIONS = new Set([
  'users', 'classes', 'materials', 'assignments', 'missions',
  'pointLedger', 'chatMessages', 'badges', 'userBadges', 'announcements',
  'notifications', 'auditLogs', 'quizzes', 'quizSubmissions', 'paperSessions'
]);

// GET entire db
app.get('/api/db', (req, res) => res.json(memoryDb));

app.put('/api/db', (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid body' });
  }
  
  // Safe deep merge that NEVER deletes existing items or loses student points/work
  Object.keys(req.body).forEach(k => {
    const incomingVal = req.body[k];
    const existingVal = memoryDb[k];

    if (k === 'users' && Array.isArray(incomingVal) && Array.isArray(existingVal)) {
      const incomingMap = new Map(incomingVal.map(u => [u.uid, u]));
      memoryDb.users = existingVal.map(existing => {
        const incoming = incomingMap.get(existing.uid);
        if (!incoming) return existing;
        return {
          ...existing,
          ...incoming,
          avatarUrl: (incoming.avatarUrl && incoming.avatarUrl.startsWith('/uploads/')) 
            ? incoming.avatarUrl 
            : (existing.avatarUrl || incoming.avatarUrl),
        };
      });
      const existingUids = new Set(existingVal.map(u => u.uid));
      incomingVal.forEach(u => {
        if (!existingUids.has(u.uid)) memoryDb.users.push(u);
      });
    } else if (k === 'userStats' && typeof incomingVal === 'object' && typeof existingVal === 'object') {
      memoryDb.userStats = { ...existingVal };
      Object.entries(incomingVal).forEach(([uid, st]) => {
        if (!memoryDb.userStats[uid]) {
          memoryDb.userStats[uid] = st;
        } else {
          const ex = memoryDb.userStats[uid];
          memoryDb.userStats[uid] = {
            ...ex,
            ...st,
            totalPoints: Math.max(ex.totalPoints || 0, st?.totalPoints || 0),
            academicPoints: Math.max(ex.academicPoints || 0, st?.academicPoints || 0),
            participationPoints: Math.max(ex.participationPoints || 0, st?.participationPoints || 0),
          };
        }
      });
    } else if (k === 'submissions' && typeof incomingVal === 'object' && typeof existingVal === 'object') {
      memoryDb.submissions = { ...existingVal };
      Object.entries(incomingVal).forEach(([key, sub]) => {
        if (!memoryDb.submissions[key]) {
          memoryDb.submissions[key] = sub;
        } else {
          const ex = memoryDb.submissions[key];
          const exTime = new Date(ex.updatedAt || ex.submittedAt || 0).getTime();
          const inTime = new Date(sub?.updatedAt || sub?.submittedAt || 0).getTime();
          memoryDb.submissions[key] = inTime >= exTime ? { ...ex, ...sub } : { ...sub, ...ex };
        }
      });
    } else if (k === 'pointLedger' && Array.isArray(incomingVal) && Array.isArray(existingVal)) {
      const seenKeys = new Set();
      const mergedList = [];
      const addEntry = (item) => {
        if (!item || !item.id) return;
        const key = item.idempotencyKey || item.id;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          mergedList.push(item);
        }
      };
      incomingVal.forEach(addEntry);
      existingVal.forEach(addEntry);
      memoryDb.pointLedger = mergedList.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    } else if (ARRAY_COLLECTIONS.has(k) && Array.isArray(incomingVal) && Array.isArray(existingVal)) {
      const existingMap = new Map(existingVal.map(item => [item?.id, item]));
      incomingVal.forEach(item => {
        if (item && item.id) {
          const ex = existingMap.get(item.id);
          existingMap.set(item.id, ex ? { ...ex, ...item } : item);
        }
      });
      memoryDb[k] = Array.from(existingMap.values());
    } else if (typeof incomingVal === 'object' && incomingVal !== null && !Array.isArray(incomingVal)) {
      memoryDb[k] = { ...(existingVal || {}), ...incomingVal };
    } else {
      if (incomingVal !== undefined) {
        memoryDb[k] = incomingVal;
      }
    }
  });

  reconcilePointsAndLedger(memoryDb);

  dbRevision = Date.now();
  broadcastDbChange({ type: 'bulk', revision: dbRevision });
  scheduleDiskSave();
  res.json({ success: true, revision: dbRevision });
});

// ─── File Upload API ────────────────────────────────────────────────────────
app.post('/api/upload', async (req, res) => {
  try {
    const { dataUrl, fileName, folder } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'dataUrl string is required' });
    }

    const matches = dataUrl.match(/^data:([A-Za-z-+/0-9]+);base64,(.+)$/);
    let mimeType = 'image/jpeg';
    let base64Data = dataUrl;
    let ext = '.jpg';

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
      
      const extMap = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'image/svg+xml': '.svg',
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'text/plain': '.txt',
      };
      if (extMap[mimeType]) {
        ext = extMap[mimeType];
      }
    }

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    let cleanBaseName = 'file';
    if (fileName && typeof fileName === 'string') {
      cleanBaseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
      const originalExt = path.extname(fileName).toLowerCase();
      if (originalExt) ext = originalExt;
    }

    const finalFileName = `${cleanBaseName}_${timestamp}_${randomSuffix}${ext}`;
    const targetDir = folder ? path.join(UPLOADS_DIR, folder) : UPLOADS_DIR;
    await fs.mkdir(targetDir, { recursive: true });

    const filePath = path.join(targetDir, finalFileName);
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(filePath, buffer);

    const relativeUrl = folder ? `/uploads/${folder}/${finalFileName}` : `/uploads/${finalFileName}`;
    res.json({
      success: true,
      url: relativeUrl,
      fileName: finalFileName,
      originalName: fileName || finalFileName,
      size: buffer.length,
      mimeType,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// GET a collection
app.get('/api/collections/:collection', (req, res) => {
  const { collection } = req.params;
  let items = memoryDb[collection] || [];
  if (!Array.isArray(items) && typeof items === 'object' && items !== null) {
    items = Object.values(items);
  }
  if (!Array.isArray(items)) items = [];
  items = items.filter(i => i != null);
  res.json(items);
});

// PUT upsert a document in a collection
app.put('/api/collections/:collection/:id', (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid body' });
  }
  const { collection, id } = req.params;

  const isArray = ARRAY_COLLECTIONS.has(collection) || Array.isArray(memoryDb[collection]);
  
  if (!memoryDb[collection]) {
    memoryDb[collection] = isArray ? [] : {};
  }

  if (Array.isArray(memoryDb[collection])) {
    const idx = memoryDb[collection].findIndex(item => item && (item.id === id || item.uid === id));
    if (idx >= 0) {
      memoryDb[collection][idx] = { ...memoryDb[collection][idx], ...req.body };
    } else {
      memoryDb[collection].push(req.body);
    }
  } else {
    memoryDb[collection][id] = { ...(memoryDb[collection][id] || {}), ...req.body };
  }

  if (collection === 'userPresence') {
    broadcastDbChange({
      type: 'upsert',
      collection,
      id,
      data: req.body,
      revision: dbRevision,
    });
    return res.json({ success: true, revision: dbRevision });
  }

  dbRevision = Date.now();
  broadcastDbChange({
    type: 'upsert',
    collection,
    id,
    data: req.body,
    revision: dbRevision,
  });

  scheduleDiskSave();
  res.json({ success: true, revision: dbRevision });
});

// DELETE a document from a collection
app.delete('/api/collections/:collection/:id', (req, res) => {
  const { collection, id } = req.params;
  
  if (memoryDb[collection]) {
    if (Array.isArray(memoryDb[collection])) {
      memoryDb[collection] = memoryDb[collection].filter(item => item && item.id !== id && item.uid !== id);
    } else {
      delete memoryDb[collection][id];
    }
  }

  dbRevision = Date.now();
  broadcastDbChange({
    type: 'delete',
    collection,
    id,
    revision: dbRevision,
  });

  scheduleDiskSave();
  res.json({ success: true, revision: dbRevision });
});

// ─── Paper Mode Live Session & AI Extraction Endpoints ────────────────────────

// Atomic real-time answer update from teacher scanner
app.post('/api/paper-sessions/:id/answer', (req, res) => {
  const { id } = req.params;
  const { questionIndex, answer } = req.body;
  if (questionIndex == null || !answer || !answer.studentId) {
    return res.status(400).json({ error: 'Missing questionIndex or answer payload' });
  }

  if (!memoryDb.paperSessions) memoryDb.paperSessions = [];
  const session = memoryDb.paperSessions.find(s => s && s.id === id);
  if (!session) {
    return res.status(404).json({ error: 'Paper session not found' });
  }

  session.answersByQuestion = session.answersByQuestion || {};
  session.answersByQuestion[questionIndex] = session.answersByQuestion[questionIndex] || {};
  session.answersByQuestion[questionIndex][answer.studentId] = {
    ...answer,
    timestamp: Date.now(),
  };
  session.updatedAt = new Date().toISOString();

  dbRevision = Date.now();
  // Broadcast instant lightweight paper answer event to all clients (projector & phones)
  broadcastDbChange({
    type: 'paper_answer',
    sessionId: id,
    questionIndex,
    answer: session.answersByQuestion[questionIndex][answer.studentId],
    revision: dbRevision,
  });

  scheduleDiskSave();
  res.json({ success: true, answer: session.answersByQuestion[questionIndex][answer.studentId] });
});

// Control paper session (change question, lock, show stats/correct answer)
app.patch('/api/paper-sessions/:id/control', (req, res) => {
  const { id } = req.params;
  if (!memoryDb.paperSessions) memoryDb.paperSessions = [];
  const idx = memoryDb.paperSessions.findIndex(s => s && s.id === id);
  if (idx < 0) {
    return res.status(404).json({ error: 'Paper session not found' });
  }

  memoryDb.paperSessions[idx] = {
    ...memoryDb.paperSessions[idx],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  dbRevision = Date.now();
  broadcastDbChange({
    type: 'paper_control',
    sessionId: id,
    session: memoryDb.paperSessions[idx],
    revision: dbRevision,
  });

  scheduleDiskSave();
  res.json({ success: true, session: memoryDb.paperSessions[idx] });
});

// AI Document/Text Quiz Extraction with Gemini API
app.post('/api/ai/extract-quiz', async (req, res) => {
  try {
    const { text, imageBase64, mimeType, instructions } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(400).json({
        error: 'GEMINI_API_KEY belum dikonfigurasi. Harap atur GEMINI_API_KEY di file .env atau secrets.',
        requiresKey: true,
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `Anda adalah asisten ahli kurikulum sekolah dan pembuat soal ujian pilihan ganda untuk platform edukasi gamifikasi GAMI CLASS.
TUGAS ANDA:
Ekstrak seluruh butir soal dari dokumen, gambar, atau teks berikut menjadi format JSON array valid.
Jika terdapat rumus, pecahan, atau simbol matematika, WAJIB dibungkus dengan standar LaTeX yang diapit tanda $ (misal: $\\frac{1}{2} + \\frac{1}{4}$ atau $E = mc^2$).

FORMAT OUTPUT HARUS BERUPA JSON ARRAY DENGAN SKEMA:
[
  {
    "id_soal": "q_001",
    "teks_soal": "Teks soal lengkap termasuk rumus matematika jika ada...",
    "pilihan": {
      "A": "Teks opsi A",
      "B": "Teks opsi B",
      "C": "Teks opsi C",
      "D": "Teks opsi D"
    },
    "kunci_jawaban": "A"
  }
]

HANYA kembalikan JSON array valid tanpa teks pengantar atau markdown tambahan selain JSON array.`;

    const contents = [];
    if (imageBase64) {
      contents.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, ''),
        },
      });
    }

    let userPromptText = `Instruksi tambahan guru: ${instructions || 'Ekstrak semua butir soal dengan 4 opsi A, B, C, D dan tentukan kunci jawabannya.'}\n\n`;
    if (text) {
      userPromptText += `Berikut konten dokumen/soal:\n${text}`;
    }
    contents.push(userPromptText);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const rawOutput = response.text || '';
    let parsedData = [];
    try {
      parsedData = JSON.parse(rawOutput);
    } catch {
      const match = rawOutput.match(/\[[\s\S]*\]/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      } else {
        throw new Error('Gagal mem-parsing output JSON dari AI');
      }
    }

    res.json({ success: true, questions: parsedData });
  } catch (err) {
    console.error('AI extraction error:', err);
    res.status(500).json({ error: err.message || 'Terjadi kesalahan saat mengekstrak soal dengan AI' });
  }
});

// ─── Serve Built Frontend (dist) & SPA Fallback ──────────────────────────────
const DIST_DIR = path.join(__dirname, 'dist');
app.use(express.static(DIST_DIR));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(DIST_DIR, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3033;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Local Express server running on port ${PORT} with real-time SSE sync`);
});
