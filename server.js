const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const PORT = process.env.PORT || 4173;
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const STATES_DIR = path.join(DATA_DIR, "states");
const SECRET_FILE = path.join(DATA_DIR, ".jwt_secret");
const TOKEN_TTL = "180d";

fs.mkdirSync(STATES_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (fs.existsSync(SECRET_FILE)) return fs.readFileSync(SECRET_FILE, "utf8").trim();
  const secret = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
  return secret;
}
const JWT_SECRET = getJwtSecret();

// Serializes writes per file key so two near-simultaneous syncs never interleave.
const writeQueues = new Map();
function queueWrite(key, fn) {
  const prev = writeQueues.get(key) || Promise.resolve();
  const next = prev.then(fn, fn).finally(() => {
    if (writeQueues.get(key) === next) writeQueues.delete(key);
  });
  writeQueues.set(key, next);
  return next;
}

function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}
function writeUsers(users) {
  return queueWrite("users", () => fs.promises.writeFile(USERS_FILE, JSON.stringify(users)));
}
function stateFilePath(userId) {
  return path.join(STATES_DIR, `${userId}.json`);
}
function readState(userId) {
  const p = stateFilePath(userId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function writeState(userId, payload) {
  return queueWrite(`state:${userId}`, () => fs.promises.writeFile(stateFilePath(userId), JSON.stringify(payload)));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const app = express();
app.use(express.json({ limit: "512kb" }));

app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.post("/api/register", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Adresse email invalide." });
  if (password.length < 8) return res.status(400).json({ error: "Le mot de passe doit faire au moins 8 caractères." });

  const users = readUsers();
  if (users.some(u => u.email === email)) return res.status(409).json({ error: "Un compte existe déjà avec cet email." });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: crypto.randomUUID(), email, passwordHash, createdAt: new Date().toISOString() };
  users.push(user);
  await writeUsers(users);

  const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: TOKEN_TTL });
  res.json({ token, email });
});

app.post("/api/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  const users = readUsers();
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: "Email ou mot de passe incorrect." });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Email ou mot de passe incorrect." });

  const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: TOKEN_TTL });
  res.json({ token, email });
});

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Non authentifié." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.uid;
    next();
  } catch (e) {
    res.status(401).json({ error: "Session expirée, reconnecte-toi." });
  }
}

app.get("/api/state", requireAuth, (req, res) => {
  const saved = readState(req.userId);
  if (!saved) return res.json({ state: null, updatedAt: 0 });
  res.json(saved);
});

app.put("/api/state", requireAuth, async (req, res) => {
  const { state, updatedAt } = req.body;
  if (!state || typeof updatedAt !== "number") return res.status(400).json({ error: "Requête invalide." });

  const existing = readState(req.userId);
  if (existing && existing.updatedAt > updatedAt) {
    // Server already has newer data (e.g. synced from another device) — reject and hand it back.
    return res.json({ accepted: false, state: existing.state, updatedAt: existing.updatedAt });
  }

  const payload = { state, updatedAt };
  await writeState(req.userId, payload);
  res.json({ accepted: true, state, updatedAt });
});

app.listen(PORT, () => console.log(`AeroPsy listening on ${PORT}`));
