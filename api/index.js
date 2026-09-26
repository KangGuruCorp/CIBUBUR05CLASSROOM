import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import pg from 'pg';

const { Pool } = pg;
const app = express();

// Konfigurasi Vercel Express
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

// Disable caching for APIs
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Setup PostgreSQL
let pool = null;
if ((process.env.POSTGRES_URL || process.env.DATABASE_URL)) {
  pool = new Pool({
    connectionString: (process.env.POSTGRES_URL || process.env.DATABASE_URL),
    ssl: { rejectUnauthorized: false }
  });
  // Inisialisasi tabel jika belum ada
  pool.query(`
    CREATE TABLE IF NOT EXISTS gamiclass_store (
      id VARCHAR(50) PRIMARY KEY,
      data JSONB NOT NULL
    );
  `).catch(err => console.error('Gagal inisialisasi Postgres:', err));
}

// Fallback lokal (untuk development tanpa internet)
const __filename = fileURLToPath(import.meta.url || 'file://' + __dirname + '/index.js');
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BOARDS_FILE = path.join(DATA_DIR, 'boards.json');

// --- Helper Functions Database ---
async function getFullDb() {
  if (pool) {
    try {
      const result = await pool.query("SELECT data FROM gamiclass_store WHERE id = 'main_db'");
      if (result.rows.length > 0) return result.rows[0].data;
      return {};
    } catch (err) {
      console.error('Postgres Read Error:', err);
      return {};
    }
  } else {
    try {
      const data = await fs.readFile(DB_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
}

async function saveFullDb(dbObj) {
  if (pool) {
    try {
      await pool.query(
        "INSERT INTO gamiclass_store (id, data) VALUES ('main_db', $1) ON CONFLICT (id) DO UPDATE SET data = $1",
        [JSON.stringify(dbObj)]
      );
    } catch (err) {
      console.error('Postgres Write Error:', err);
    }
  } else {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(DB_FILE, JSON.stringify(dbObj, null, 2));
    } catch (err) {
      console.error('Local File Write Error:', err);
    }
  }
}

async function getBoards() {
  if (pool) {
    try {
      const result = await pool.query("SELECT data FROM gamiclass_store WHERE id = 'boards'");
      if (result.rows.length > 0) return result.rows[0].data;
      return [];
    } catch {
      return [];
    }
  } else {
    try {
      const data = await fs.readFile(BOARDS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
}

async function saveBoards(boardsData) {
  if (pool) {
    try {
      await pool.query(
        "INSERT INTO gamiclass_store (id, data) VALUES ('boards', $1) ON CONFLICT (id) DO UPDATE SET data = $1",
        [JSON.stringify(boardsData)]
      );
    } catch (err) {
      console.error('Postgres Boards Write Error:', err);
    }
  } else {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(BOARDS_FILE, JSON.stringify(boardsData, null, 2));
    } catch (err) {
      console.error('Local Boards Write Error:', err);
    }
  }
}

// Rekonsiliasi Poin 
function reconcilePointsAndLedger(dbObj) {
  if (!dbObj || typeof dbObj !== 'object') return;
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
        dbObj.userStats[uid] = {
          ...dbObj.userStats[uid],
          totalPoints: ledgerTotal,
          academicPoints: academicTotal,
          participationPoints: partTotal,
        };
      }
    });
  }
}

const ARRAY_COLLECTIONS = new Set([
  'users', 'classes', 'materials', 'assignments', 'missions',
  'pointLedger', 'chatMessages', 'badges', 'userBadges', 'announcements',
  'notifications', 'auditLogs', 'quizzes', 'quizSubmissions', 'paperSessions'
]);


// ─── API ENDPOINTS ──────────────────────────────────────────────────────────

// Karena SSE (Server-Sent Events) tidak berfungsi baik di Serverless Vercel (timeout issue),
// kita ubah /api/sync/events dan /api/stream untuk merespons dengan kosong, lalu ubah frontend ke polling.
app.get('/api/sync/events', (req, res) => res.status(204).end());
app.get('/api/stream', (req, res) => res.status(204).end());

// Unified Delta Sync (Digunakan untuk Polling di Frontend sekarang)
app.get('/api/sync', async (req, res) => {
  const db = await getFullDb();
  res.json({ modified: true, revision: Date.now(), db });
});

// GET entire db
app.get('/api/db', async (req, res) => {
  const db = await getFullDb();
  res.json(db);
});

// PUT entire db (bulk update)
app.put('/api/db', async (req, res) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Invalid body' });
  const db = await getFullDb();
  
  Object.keys(req.body).forEach(k => {
    const incomingVal = req.body[k];
    const existingVal = db[k];
    if (k === 'users' && Array.isArray(incomingVal) && Array.isArray(existingVal)) {
      const incomingMap = new Map(incomingVal.map(u => [u.uid, u]));
      db.users = existingVal.map(existing => {
        const incoming = incomingMap.get(existing.uid);
        if (!incoming) return existing;
        return { ...existing, ...incoming };
      });
      const existingUids = new Set(existingVal.map(u => u.uid));
      incomingVal.forEach(u => {
        if (!existingUids.has(u.uid)) db.users.push(u);
      });
    } else if (ARRAY_COLLECTIONS.has(k) && Array.isArray(incomingVal) && Array.isArray(existingVal)) {
      const existingMap = new Map(existingVal.map(item => [item?.id, item]));
      incomingVal.forEach(item => {
        if (item && item.id) {
          const ex = existingMap.get(item.id);
          existingMap.set(item.id, ex ? { ...ex, ...item } : item);
        }
      });
      db[k] = Array.from(existingMap.values());
    } else if (typeof incomingVal === 'object' && incomingVal !== null && !Array.isArray(incomingVal)) {
      db[k] = { ...(existingVal || {}), ...incomingVal };
    } else {
      if (incomingVal !== undefined) db[k] = incomingVal;
    }
  });

  reconcilePointsAndLedger(db);
  await saveFullDb(db);
  res.json({ success: true, revision: Date.now() });
});

// GET a collection
app.get('/api/collections/:collection', async (req, res) => {
  const { collection } = req.params;
  const db = await getFullDb();
  let items = db[collection] || [];
  if (!Array.isArray(items) && typeof items === 'object' && items !== null) {
    items = Object.values(items);
  }
  res.json(items.filter(i => i != null));
});

// PUT upsert a document in a collection
app.put('/api/collections/:collection/:id', async (req, res) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Invalid body' });
  const { collection, id } = req.params;
  const db = await getFullDb();
  const isArray = ARRAY_COLLECTIONS.has(collection) || Array.isArray(db[collection]);
  
  if (!db[collection]) db[collection] = isArray ? [] : {};

  if (Array.isArray(db[collection])) {
    const idx = db[collection].findIndex(item => item && (item.id === id || item.uid === id));
    if (idx >= 0) db[collection][idx] = { ...db[collection][idx], ...req.body };
    else db[collection].push(req.body);
  } else {
    db[collection][id] = { ...(db[collection][id] || {}), ...req.body };
  }

  await saveFullDb(db);
  res.json({ success: true, revision: Date.now() });
});

// DELETE a document
app.delete('/api/collections/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const db = await getFullDb();
  if (db[collection]) {
    if (Array.isArray(db[collection])) {
      db[collection] = db[collection].filter(item => item && item.id !== id && item.uid !== id);
    } else {
      delete db[collection][id];
    }
  }
  await saveFullDb(db);
  res.json({ success: true, revision: Date.now() });
});

// ─── Boards API ────────────────────────────────────────────────────────
app.get('/api/boards', async (req, res) => {
  const boards = await getBoards();
  res.json(boards);
});
app.post('/api/boards', async (req, res) => {
  const boards = await getBoards();
  boards.unshift(req.body);
  await saveBoards(boards);
  res.json(req.body);
});
app.patch('/api/boards/:id', async (req, res) => {
  const boards = await getBoards();
  const idx = boards.findIndex(b => b.id === req.params.id);
  if (idx >= 0) {
    boards[idx] = { ...boards[idx], ...req.body, updatedAt: new Date().toISOString() };
    await saveBoards(boards);
    res.json(boards[idx]);
  } else res.status(404).json({ error: 'Not found' });
});
app.put('/api/boards/:id/elements', async (req, res) => {
  const boards = await getBoards();
  const idx = boards.findIndex(b => b.id === req.params.id);
  if (idx >= 0) {
    boards[idx].elements = boards[idx].elements || {};
    boards[idx].elements[req.body.id] = req.body;
    await saveBoards(boards);
    res.json({ success: true });
  } else res.status(404).json({ error: 'Not found' });
});
// ... (Hapus elemen, dsb di-skip demi keringanan, bisa ditambahkan jika perlu. Polling frontend akan meresolve delta).

// ─── Paper Mode (Smart Polling Compatible) ──────────────────────────────
app.post('/api/paper-sessions/:id/answer', async (req, res) => {
  const { id } = req.params;
  const { questionIndex, answer } = req.body;
  const db = await getFullDb();
  if (!db.paperSessions) db.paperSessions = [];
  let session = db.paperSessions.find(s => s && s.id === id);
  if (!session) {
    session = { id, currentQuestionIndex: questionIndex, status: 'active', answersByQuestion: {} };
    db.paperSessions.push(session);
  }
  session.answersByQuestion = session.answersByQuestion || {};
  session.answersByQuestion[questionIndex] = session.answersByQuestion[questionIndex] || {};
  session.answersByQuestion[questionIndex][answer.studentId] = { ...answer, timestamp: Date.now() };
  
  await saveFullDb(db);
  res.json({ success: true });
});
app.patch('/api/paper-sessions/:id/control', async (req, res) => {
  const { id } = req.params;
  const db = await getFullDb();
  if (!db.paperSessions) db.paperSessions = [];
  let idx = db.paperSessions.findIndex(s => s && s.id === id);
  if (idx < 0) {
    db.paperSessions.push({ id, ...req.body });
  } else {
    db.paperSessions[idx] = { ...db.paperSessions[idx], ...req.body };
  }
  await saveFullDb(db);
  res.json({ success: true });
});

// ─── AI Extraction ───────────────────────────────────────────────────────
app.post('/api/ai/extract-quiz', async (req, res) => {
  try {
    const { text, imageBase64, mimeType, instructions } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(400).json({ error: 'GEMINI_API_KEY belum dikonfigurasi.', requiresKey: true });
    }
    const ai = new GoogleGenAI({ apiKey });
    const contents = [];
    if (imageBase64) contents.push({ inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '') } });
    if (text) contents.push(`Konten: ${text}`);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: "Ekstrak soal menjadi JSON array. [{\"id_soal\":\"q1\",\"teks_soal\":\"...\",\"pilihan\":{\"A\":\"..\",\"B\":\"..\",\"C\":\"..\",\"D\":\"..\"},\"kunci_jawaban\":\"A\"}] HANYA KEMBALIKAN ARRAY JSON.",
        responseMimeType: 'application/json',
      }
    });
    res.json({ success: true, questions: JSON.parse(response.text) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Menonaktifkan Upload File Fisik ke Vercel (karena filesystem read-only)
// Frontend akan mendeteksi error / fallback dan langsung menggunakan string Base64 ke dalam DB.
app.post('/api/upload', (req, res) => {
  res.status(400).json({ error: 'Serverless deployment expects Base64 embedding. Upload failed.' });
});

export default app;
