/* ============================================================
   db.js — storage abstraction with two backends:
   - MySQL, used when DB_HOST is set (Hostinger production: survives
     redeploys, unlike the app's own filesystem which gets rebuilt
     from GitHub on every push)
   - Local JSON files, used otherwise (zero-setup local development)
   ============================================================ */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const STATES_DIR = path.join(DATA_DIR, "states");

const USE_MYSQL = !!process.env.DB_HOST;

let pool = null;
if (USE_MYSQL) {
  const mysql = require("mysql2/promise");
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
  });
}

async function initDb() {
  if (!USE_MYSQL) {
    fs.mkdirSync(STATES_DIR, { recursive: true });
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS states (
      user_id VARCHAR(36) PRIMARY KEY,
      state_json LONGTEXT NOT NULL,
      updated_at BIGINT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

/* ---------------- file backend (local dev) ---------------- */

const writeQueues = new Map();
function queueWrite(key, fn) {
  const prev = writeQueues.get(key) || Promise.resolve();
  const next = prev.then(fn, fn).finally(() => {
    if (writeQueues.get(key) === next) writeQueues.delete(key);
  });
  writeQueues.set(key, next);
  return next;
}
function fileReadUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}
function fileWriteUsers(users) {
  return queueWrite("users", () => fs.promises.writeFile(USERS_FILE, JSON.stringify(users)));
}
function fileStatePath(userId) {
  return path.join(STATES_DIR, `${userId}.json`);
}

/* ---------------- public API ---------------- */

async function findUserByUsername(username) {
  if (USE_MYSQL) {
    const [rows] = await pool.query(
      "SELECT id, username, password_hash AS passwordHash FROM users WHERE username = ?",
      [username]
    );
    return rows[0] || null;
  }
  const users = fileReadUsers();
  return users.find(u => u.username === username) || null;
}

async function createUser({ id, username, passwordHash, createdAt }) {
  if (USE_MYSQL) {
    await pool.query(
      "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
      [id, username, passwordHash, new Date(createdAt)]
    );
    return;
  }
  const users = fileReadUsers();
  users.push({ id, username, passwordHash, createdAt });
  await fileWriteUsers(users);
}

async function readState(userId) {
  if (USE_MYSQL) {
    const [rows] = await pool.query(
      "SELECT state_json AS stateJson, updated_at AS updatedAt FROM states WHERE user_id = ?",
      [userId]
    );
    if (!rows[0]) return null;
    return { state: JSON.parse(rows[0].stateJson), updatedAt: Number(rows[0].updatedAt) };
  }
  const p = fileStatePath(userId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function writeState(userId, payload) {
  if (USE_MYSQL) {
    await pool.query(
      `INSERT INTO states (user_id, state_json, updated_at) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE state_json = VALUES(state_json), updated_at = VALUES(updated_at)`,
      [userId, JSON.stringify(payload.state), payload.updatedAt]
    );
    return;
  }
  return queueWrite(`state:${userId}`, () =>
    fs.promises.writeFile(fileStatePath(userId), JSON.stringify(payload))
  );
}

module.exports = { initDb, findUserByUsername, createUser, readState, writeState, USE_MYSQL };
