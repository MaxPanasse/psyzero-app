/* ============================================================
   auth.js — email/password accounts + background multi-device sync
   ============================================================ */

const AUTH_TOKEN_KEY = "psy0trainer_auth_token";
const AUTH_EMAIL_KEY = "psy0trainer_auth_email";

let onAuthReady = null;
let syncTimer = null;

function getAuthToken() { return localStorage.getItem(AUTH_TOKEN_KEY); }
function getAuthEmail() { return localStorage.getItem(AUTH_EMAIL_KEY); }
function setAuthSession(token, email) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_EMAIL_KEY, email);
}
function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_EMAIL_KEY);
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(path, Object.assign({}, options, { headers }));
  } catch (networkErr) {
    const e = new Error("Impossible de contacter le serveur.");
    e.offline = true;
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error || `Erreur serveur (${res.status})`);
    e.status = res.status;
    throw e;
  }
  return data;
}

/* ---------------- chrome (nav) visibility + sync status pill ---------------- */

function setChromeVisible(visible) {
  const nav = document.getElementById("topnav");
  const stats = document.querySelector(".topbar-stats");
  if (nav) nav.style.display = visible ? "" : "none";
  if (!stats) return;
  if (visible) {
    stats.innerHTML = `
      <div class="pill" id="sync-pill" title="État de la synchronisation">Synchronisé</div>
      <div class="pill" id="streak-pill" title="Série de jours consécutifs">🔥 0</div>
      <div class="pill" id="level-pill" title="Niveau">Nv. 1</div>
    `;
  } else {
    stats.innerHTML = `<button class="btn btn-secondary btn-sm" id="topbar-login-btn">Se connecter</button>`;
    stats.querySelector("#topbar-login-btn").onclick = () => renderAuthScreen("login");
  }
}

function setSyncStatus(text) {
  const pill = document.getElementById("sync-pill");
  if (pill) pill.textContent = text;
}

/* ---------------- sync ---------------- */

function schedulePush() {
  if (!getAuthToken()) return;
  clearTimeout(syncTimer);
  setSyncStatus("Synchro…");
  syncTimer = setTimeout(pushState, 1200);
}

async function pushState() {
  if (!getAuthToken()) return;
  try {
    const result = await apiRequest("/api/state", {
      method: "PUT",
      body: JSON.stringify({ state: STATE, updatedAt: STATE.updatedAt }),
    });
    if (!result.accepted) {
      // Server already had newer data (pushed from another device) — adopt it.
      STATE = result.state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
    }
    setSyncStatus("Synchronisé");
  } catch (e) {
    if (e.status === 401) { forceLogout("Session expirée, reconnecte-toi."); return; }
    setSyncStatus("Hors ligne");
  }
}

async function pullAndReconcile() {
  try {
    const result = await apiRequest("/api/state");
    if (result.state && result.updatedAt > (STATE.updatedAt || 0)) {
      STATE = result.state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
    } else if ((STATE.updatedAt || 0) > 0) {
      await pushState();
    }
    setSyncStatus("Synchronisé");
  } catch (e) {
    if (e.status === 401) { forceLogout("Session expirée, reconnecte-toi."); throw e; }
    setSyncStatus("Hors ligne");
  }
}

function forceLogout(message) {
  clearAuthSession();
  setChromeVisible(false);
  renderAuthScreen("login", message);
}

function logout() {
  clearAuthSession();
  quizCtx = null;
  clearActiveTimers();
  resetAllProgress(); // clear local cache so a different account never leaks in on this device
  setChromeVisible(false);
  renderLandingPage(document.getElementById("app"));
}

/* ---------------- auth screen ---------------- */

function renderAuthScreen(mode = "login", errorMsg = "") {
  setChromeVisible(false);
  const root = document.getElementById("app");
  const isLogin = mode === "login";
  root.innerHTML = `
    <div class="card auth-card">
      <a href="#" id="auth-back" class="muted" style="display:inline-block; margin-bottom:14px; text-decoration:none; font-size:0.85rem;">← Retour à l'accueil</a>
      <h2 style="margin-top:0; text-align:center;">${isLogin ? "Connexion" : "Créer un compte"}</h2>
      <p class="muted center">Tes données sont synchronisées automatiquement sur tous tes appareils.</p>
      ${errorMsg ? `<div class="feedback-box incorrect" style="margin-bottom:14px;">${errorMsg}</div>` : ""}
      <form id="auth-form" style="display:flex; flex-direction:column; gap:12px;">
        <input type="email" id="auth-email" class="text-input" placeholder="Email" autocomplete="email" required>
        <input type="password" id="auth-password" class="text-input" placeholder="Mot de passe (8 caractères min.)" autocomplete="${isLogin ? "current-password" : "new-password"}" required minlength="8">
        <button type="submit" class="btn btn-primary btn-block" id="auth-submit">${isLogin ? "Se connecter" : "Créer mon compte"}</button>
      </form>
      <p class="center muted" style="margin-top:16px;">
        ${isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
        <a href="#" id="auth-toggle" style="color:var(--accent-2); font-weight:700; text-decoration:none;">${isLogin ? "Créer un compte" : "Se connecter"}</a>
      </p>
    </div>
  `;

  root.querySelector("#auth-back").onclick = (e) => {
    e.preventDefault();
    renderLandingPage(root);
  };

  root.querySelector("#auth-toggle").onclick = (e) => {
    e.preventDefault();
    renderAuthScreen(isLogin ? "register" : "login");
  };

  root.querySelector("#auth-form").onsubmit = async (e) => {
    e.preventDefault();
    const email = root.querySelector("#auth-email").value.trim();
    const password = root.querySelector("#auth-password").value;
    const submitBtn = root.querySelector("#auth-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = "…";
    try {
      const endpoint = isLogin ? "/api/login" : "/api/register";
      const result = await apiRequest(endpoint, { method: "POST", body: JSON.stringify({ email, password }) });
      setAuthSession(result.token, result.email);
      if (isLogin) STATE = defaultState(); // don't let another account's local cache leak in
      await pullAndReconcile();
      setChromeVisible(true);
      onAuthReady();
    } catch (err) {
      renderAuthScreen(mode, err.message);
    }
  };
}

/* ---------------- boot ---------------- */

async function initAuthGate(readyCallback) {
  onAuthReady = readyCallback;
  setChromeVisible(false);
  const token = getAuthToken();
  if (!token) { renderLandingPage(document.getElementById("app")); return; }
  try {
    await pullAndReconcile();
    setChromeVisible(true);
    onAuthReady();
  } catch (e) {
    // pullAndReconcile already rendered the login screen via forceLogout on 401
  }
}
