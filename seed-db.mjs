// Script: seed-db.mjs  — run once to rebuild db.json from mockData
// Usage:  node seed-db.mjs
import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Build a tiny CJS bundle of mockData using esbuild
console.log('Building mockData bundle...');
execSync(
  'npx esbuild src/data/mockData.ts --bundle --platform=node --format=cjs --outfile=data/.mockData.cjs --log-level=error',
  { cwd: __dirname, stdio: 'inherit' }
);

const {
  INITIAL_SCHOOL,
  INITIAL_CLASSES,
  INITIAL_BADGES,
  INITIAL_USERS,
  INITIAL_USER_STATS,
  INITIAL_USER_BADGES,
  INITIAL_MATERIALS,
  INITIAL_MATERIAL_PROGRESS,
  INITIAL_ASSIGNMENTS,
  INITIAL_SUBMISSIONS,
  INITIAL_MISSIONS,
  INITIAL_MISSION_PROGRESS,
  INITIAL_POINT_LEDGER,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CHAT_MESSAGES,
} = await import('./data/.mockData.cjs', { assert: { type: 'commonjs' } }).catch(() =>
  // Fallback for CJS
  eval(`(function(){const m=require('./data/.mockData.cjs');return m;}())`)
);

// Use createRequire fallback if dynamic import failed
import { createRequire } from 'module';
const require2 = createRequire(import.meta.url);
const mock = require2('./data/.mockData.cjs');

const db = {
  school: mock.INITIAL_SCHOOL,
  classes: mock.INITIAL_CLASSES,
  badges: mock.INITIAL_BADGES,
  users: mock.INITIAL_USERS,
  userStats: mock.INITIAL_USER_STATS,
  userBadges: mock.INITIAL_USER_BADGES,
  materials: mock.INITIAL_MATERIALS,
  materialProgress: mock.INITIAL_MATERIAL_PROGRESS,
  assignments: mock.INITIAL_ASSIGNMENTS,
  submissions: mock.INITIAL_SUBMISSIONS,
  missions: mock.INITIAL_MISSIONS,
  missionProgress: mock.INITIAL_MISSION_PROGRESS,
  pointLedger: mock.INITIAL_POINT_LEDGER,
  announcements: mock.INITIAL_ANNOUNCEMENTS,
  auditLogs: mock.INITIAL_AUDIT_LOGS,
  chatMessages: mock.INITIAL_CHAT_MESSAGES,
  notifications: [],
  userPresence: {},
};

// Sanitize all arrays
Object.keys(db).forEach(k => {
  if (Array.isArray(db[k])) db[k] = db[k].filter(i => i != null);
});

const OUT = path.join(__dirname, 'data', 'db.json');
writeFileSync(OUT, JSON.stringify(db, null, 2));
console.log('✅  db.json rebuilt successfully!');
console.log(`   users: ${Array.isArray(db.users) ? db.users.length : 0}`);
console.log(`   materials: ${Array.isArray(db.materials) ? db.materials.length : 0}`);
console.log(`   assignments: ${Array.isArray(db.assignments) ? db.assignments.length : 0}`);
console.log(`   missions: ${Array.isArray(db.missions) ? db.missions.length : 0}`);
console.log(`   chatMessages: ${Array.isArray(db.chatMessages) ? db.chatMessages.length : 0}`);
