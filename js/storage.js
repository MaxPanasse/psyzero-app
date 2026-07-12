/* ============================================================
   storage.js — state model, persistence, XP/level/streak/badges
   ============================================================ */

const STORAGE_KEY = "psy0trainer_state_v1";

const CATEGORIES = [
  { id: "logique",     name: "Logique",                icon: "◆", short: "Logique",  type: "generated", desc: "Suites numériques, suites de lettres et raisonnement par déduction." },
  { id: "verbal",      name: "Aptitude verbale",        icon: "Aa", short: "Verbal",  type: "bank",      desc: "Synonymes, antonymes et analogies pour jauger ta richesse lexicale." },
  { id: "attention",   name: "Attention",                icon: "◎", short: "Atten.", type: "generated", desc: "Repérage rapide dans des grilles de lettres et de symboles." },
  { id: "spatial",     name: "Visualisation spatiale",   icon: "⬡", short: "Spatial", type: "generated", desc: "Rotations mentales de figures, reconnaissance de formes tournées." },
  { id: "memoire",     name: "Mémoire",                  icon: "✺", short: "Mémoire", type: "generated", desc: "Mémorisation de séquences de chiffres, lettres et symboles." },
  { id: "vitesse",     name: "Vitesse de calcul",        icon: "±", short: "Vitesse", type: "generated", desc: "Arithmétique simple à réaliser le plus vite et le plus juste possible." },
  { id: "anglais",     name: "Anglais",                  icon: "EN", short: "Anglais", type: "bank",     desc: "Vocabulaire, grammaire et anglais aéronautique de base." },
  { id: "aero",        name: "Connaissances aéro.",      icon: "✈", short: "Aéro", type: "bank",      desc: "Culture générale aéronautique : principes de vol, réglementation, histoire." },
  { id: "psychomoteur",name: "Coordination",             icon: "◉", short: "Coord.", type: "generated", desc: "Temps de réaction et double-tâche, façon test psychomoteur." },
];

const RANKS = [
  { level: 1, name: "Cadet",             minXp: 0 },
  { level: 2, name: "Cadet confirmé",    minXp: 150 },
  { level: 3, name: "Élève pilote",      minXp: 400 },
  { level: 4, name: "Pilote stagiaire",  minXp: 800 },
  { level: 5, name: "Copilote",          minXp: 1400 },
  { level: 6, name: "Copilote senior",   minXp: 2200 },
  { level: 7, name: "Commandant adjoint",minXp: 3200 },
  { level: 8, name: "Commandant de bord",minXp: 4500 },
  { level: 9, name: "Instructeur",       minXp: 6200 },
  { level: 10, name: "Chef pilote",      minXp: 8500 },
];

const BADGES = [
  { id: "first_session",  icon: "🎯", name: "Premier vol",        desc: "Termine ta première session d'entraînement." },
  { id: "streak_3",       icon: "🔥", name: "Sur la lancée",       desc: "3 jours d'entraînement d'affilée." },
  { id: "streak_7",       icon: "🔥", name: "Semaine parfaite",    desc: "7 jours d'entraînement d'affilée." },
  { id: "streak_30",      icon: "🔥", name: "Mois de fer",         desc: "30 jours d'entraînement d'affilée." },
  { id: "all_categories", icon: "🧭", name: "Tour d'horizon",      desc: "Essaie les 9 catégories au moins une fois." },
  { id: "classe_7",       icon: "⭐", name: "Classe 7",            desc: "Atteins la classe 7 dans une catégorie." },
  { id: "classe_9",       icon: "🏆", name: "Classe 9",            desc: "Atteins la classe 9, le score maximum." },
  { id: "first_exam",     icon: "📋", name: "Premier examen blanc",desc: "Termine ton premier examen blanc complet." },
  { id: "exam_master",    icon: "🎓", name: "Prêt·e pour le jour J", desc: "Obtiens une classe globale ≥ 7 à un examen blanc." },
  { id: "srs_clear",      icon: "🧹", name: "Ardoise propre",      desc: "Termine une session entière de révision des erreurs." },
  { id: "speedster",      icon: "⚡", name: "Vitesse éclair",      desc: "Termine une session de vitesse de calcul avec 100% de réussite." },
  { id: "hundred_club",   icon: "💯", name: "Club des 100",        desc: "Réponds à 100 questions au total." },
  { id: "thousand_club",  icon: "🚀", name: "Club des 1000",       desc: "Réponds à 1000 questions au total." },
];

function defaultState() {
  const categories = {};
  CATEGORIES.forEach(c => {
    categories[c.id] = {
      attempts: 0,
      correct: 0,
      difficulty: 1,
      bestClasse: 0,
      history: [], // { date, accuracy, classe }
    };
  });
  return {
    profile: {
      xp: 0,
      streakCurrent: 0,
      streakBest: 0,
      lastPracticeDate: null, // ISO yyyy-mm-dd
      badges: [],
      totalQuestions: 0,
      totalCorrect: 0,
      createdAt: new Date().toISOString(),
      categoriesTried: [],
      practiceLog: [], // ISO dates with at least one session, deduped, capped
    },
    categories,
    srs: {}, // itemId -> { interval, ease, due, reps, lapses }
    examHistory: [], // { date, durationMin, overallClasse, sectionResults }
    updatedAt: 0, // ms epoch of the last local change — used to reconcile multi-device sync
  };
}

let STATE = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    // shallow-merge to survive schema additions between versions
    return {
      profile: Object.assign(base.profile, parsed.profile),
      categories: Object.assign(base.categories, parsed.categories),
      srs: parsed.srs || {},
      examHistory: parsed.examHistory || [],
      updatedAt: parsed.updatedAt || 0,
    };
  } catch (e) {
    console.warn("État corrompu, réinitialisation.", e);
    return defaultState();
  }
}

function saveState() {
  STATE.updatedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
  if (typeof schedulePush === "function") schedulePush();
}

function resetAllProgress() {
  STATE = defaultState();
  saveState();
}

function todayISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function daysBetween(isoA, isoB) {
  const a = new Date(isoA + "T00:00:00");
  const b = new Date(isoB + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

/* ---------------- XP / Level ---------------- */

function getRank(xp) {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.minXp) current = r;
  }
  const idx = RANKS.indexOf(current);
  const next = RANKS[idx + 1] || null;
  return { ...current, next };
}

function addXp(amount) {
  const before = getRank(STATE.profile.xp);
  STATE.profile.xp += amount;
  const after = getRank(STATE.profile.xp);
  return after.level > before.level ? after : null; // returns rank if leveled up
}

/* ---------------- Streak ---------------- */

function registerPracticeToday() {
  const today = todayISO();
  const last = STATE.profile.lastPracticeDate;
  if (last === today) return; // already counted today
  if (last) {
    const gap = daysBetween(last, today);
    STATE.profile.streakCurrent = gap === 1 ? STATE.profile.streakCurrent + 1 : 1;
  } else {
    STATE.profile.streakCurrent = 1;
  }
  STATE.profile.streakBest = Math.max(STATE.profile.streakBest, STATE.profile.streakCurrent);
  STATE.profile.lastPracticeDate = today;

  if (!STATE.profile.practiceLog.includes(today)) {
    STATE.profile.practiceLog.push(today);
    if (STATE.profile.practiceLog.length > 365) STATE.profile.practiceLog.shift();
  }
}

/* ---------------- Badges ---------------- */

function unlockBadge(id) {
  if (!STATE.profile.badges.includes(id)) {
    STATE.profile.badges.push(id);
    return BADGES.find(b => b.id === id);
  }
  return null;
}

function checkBadges(context = {}) {
  const unlocked = [];
  const p = STATE.profile;

  if (p.totalQuestions >= 1) { const b = unlockBadge("first_session"); if (b) unlocked.push(b); }
  if (p.streakCurrent >= 3) { const b = unlockBadge("streak_3"); if (b) unlocked.push(b); }
  if (p.streakCurrent >= 7) { const b = unlockBadge("streak_7"); if (b) unlocked.push(b); }
  if (p.streakCurrent >= 30) { const b = unlockBadge("streak_30"); if (b) unlocked.push(b); }
  if (p.categoriesTried.length >= CATEGORIES.length) { const b = unlockBadge("all_categories"); if (b) unlocked.push(b); }
  if (p.totalQuestions >= 100) { const b = unlockBadge("hundred_club"); if (b) unlocked.push(b); }
  if (p.totalQuestions >= 1000) { const b = unlockBadge("thousand_club"); if (b) unlocked.push(b); }

  const bestClasseOverall = Math.max(0, ...Object.values(STATE.categories).map(c => c.bestClasse));
  if (bestClasseOverall >= 7) { const b = unlockBadge("classe_7"); if (b) unlocked.push(b); }
  if (bestClasseOverall >= 9) { const b = unlockBadge("classe_9"); if (b) unlocked.push(b); }

  if (context.examFinished) { const b = unlockBadge("first_exam"); if (b) unlocked.push(b); }
  if (context.examClasse >= 7) { const b = unlockBadge("exam_master"); if (b) unlocked.push(b); }
  if (context.srsSessionCleared) { const b = unlockBadge("srs_clear"); if (b) unlocked.push(b); }
  if (context.speedPerfect) { const b = unlockBadge("speedster"); if (b) unlocked.push(b); }

  return unlocked;
}

/* ---------------- Category stats / "classe" scoring ---------------- */

// Converts an accuracy (0-1) + speed factor into a 1-9 "classe" akin to the
// real PSY0 decile-style reporting ("classe 6" = mieux que 60% des candidats).
function computeClasse(accuracy) {
  if (accuracy >= 0.97) return 9;
  if (accuracy >= 0.90) return 8;
  if (accuracy >= 0.80) return 7;
  if (accuracy >= 0.70) return 6;
  if (accuracy >= 0.60) return 5;
  if (accuracy >= 0.50) return 4;
  if (accuracy >= 0.38) return 3;
  if (accuracy >= 0.25) return 2;
  return 1;
}

function recordSessionResult(catId, correctCount, totalCount) {
  const cat = STATE.categories[catId];
  const accuracy = totalCount > 0 ? correctCount / totalCount : 0;
  const classe = computeClasse(accuracy);

  cat.attempts += totalCount;
  cat.correct += correctCount;
  cat.bestClasse = Math.max(cat.bestClasse, classe);
  cat.history.push({ date: todayISO(), accuracy, classe });
  if (cat.history.length > 60) cat.history.shift();

  // adaptive difficulty for generated categories
  if (accuracy >= 0.85) cat.difficulty = Math.min(5, cat.difficulty + 1);
  else if (accuracy <= 0.4) cat.difficulty = Math.max(1, cat.difficulty - 1);

  STATE.profile.totalQuestions += totalCount;
  STATE.profile.totalCorrect += correctCount;
  if (!STATE.profile.categoriesTried.includes(catId)) STATE.profile.categoriesTried.push(catId);

  registerPracticeToday();

  // XP: base per question + accuracy bonus + streak multiplier
  const base = totalCount * 8;
  const bonus = Math.round(base * accuracy);
  const streakMult = 1 + Math.min(STATE.profile.streakCurrent, 15) * 0.02;
  const xpGained = Math.round((base * 0.3 + bonus) * streakMult);
  const leveledUp = addXp(xpGained);

  saveState();
  return { accuracy, classe, xpGained, leveledUp };
}

function categoryMastery(catId) {
  const cat = STATE.categories[catId];
  if (!cat || cat.attempts === 0) return 0;
  const recent = cat.history.slice(-5);
  const acc = recent.reduce((s, h) => s + h.accuracy, 0) / recent.length;
  return Math.round(acc * 100);
}
