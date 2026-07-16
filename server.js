const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const PORT = process.env.PORT || 4173;
const TOKEN_TTL = "180d";
const SECRET_FILE = path.join(__dirname, "data", ".jwt_secret");

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (db.USE_MYSQL) {
    throw new Error(
      "JWT_SECRET doit être défini en variable d'environnement en production (base MySQL active — pas de fichier local fiable pour le stocker)."
    );
  }
  // Local dev convenience only: persist a generated secret next to the file-based data store.
  fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
  if (fs.existsSync(SECRET_FILE)) return fs.readFileSync(SECRET_FILE, "utf8").trim();
  const secret = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
  return secret;
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

const app = express();
app.use(express.json({ limit: "512kb" }));

app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.get("/api/health", (req, res) => res.json({ ok: true, storage: db.USE_MYSQL ? "mysql" : "file" }));

async function main() {
  await db.initDb();
  const JWT_SECRET = getJwtSecret();

  app.post("/api/register", async (req, res) => {
    const username = String(req.body.username || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!USERNAME_RE.test(username)) return res.status(400).json({ error: "Pseudo invalide (3 à 20 caractères : lettres, chiffres, underscore)." });
    if (password.length < 8) return res.status(400).json({ error: "Le mot de passe doit faire au moins 8 caractères." });

    if (await db.findUserByUsername(username)) return res.status(409).json({ error: "Ce pseudo est déjà pris." });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = { id: crypto.randomUUID(), username, passwordHash, createdAt: new Date().toISOString() };
    await db.createUser(user);

    const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: TOKEN_TTL });
    res.json({ token, username });
  });

  app.post("/api/login", async (req, res) => {
    const username = String(req.body.username || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const user = await db.findUserByUsername(username);
    if (!user) return res.status(401).json({ error: "Pseudo ou mot de passe incorrect." });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Pseudo ou mot de passe incorrect." });

    const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: TOKEN_TTL });
    res.json({ token, username });
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

  app.get("/api/state", requireAuth, async (req, res) => {
    const saved = await db.readState(req.userId);
    if (!saved) return res.json({ state: null, updatedAt: 0 });
    res.json(saved);
  });

  app.put("/api/state", requireAuth, async (req, res) => {
    const { stateJson, updatedAt } = req.body;
    if (!stateJson || typeof updatedAt !== "number") return res.status(400).json({ error: "Requête invalide." });
    let state;
    try {
      state = JSON.parse(stateJson);
    } catch (e) {
      return res.status(400).json({ error: "État invalide." });
    }

    const existing = await db.readState(req.userId);
    if (existing && existing.updatedAt > updatedAt) {
      // Server already has newer data (e.g. synced from another device) — reject and hand it back.
      return res.json({ accepted: false, state: existing.state, updatedAt: existing.updatedAt });
    }

    await db.writeState(req.userId, { state, updatedAt });
    res.json({ accepted: true, state, updatedAt });
  });

  app.listen(PORT, () => console.log(`PsyZero listening on ${PORT} (storage: ${db.USE_MYSQL ? "mysql" : "file"})`));
}

main().catch(err => {
  console.error("Échec du démarrage :", err.message);
  process.exit(1);
});
