/* ============================================================
   quiz.js — session engine: builds sessions, scores answers,
   persists results, drives practice & exam flows.
   ============================================================ */

const EXAM_PRESETS = {
  court:    { label: "Court",                minutes: 20, counts: { default: 6,  memoire: 4, psychomoteur: 8 } },
  standard: { label: "Standard",             minutes: 45, counts: { default: 10, memoire: 6, psychomoteur: 12 } },
  complet:  { label: "Complet (format réel)",minutes: 90, counts: { default: 16, memoire: 8, psychomoteur: 20 } },
};

function questionsFor(catId, count) {
  const cat = CATEGORIES.find(c => c.id === catId);
  if (cat.type === "bank") return buildBankSession(catId, count);
  const difficulty = STATE.categories[catId].difficulty;
  return Array.from({ length: count }, () => generateQuestion(catId, difficulty));
}

/* ---------------- scoring ---------------- */

// Returns a fractional score in [0,1] for any question kind.
function scoreAnswer(question, response) {
  switch (question.kind) {
    case "mcq":
      return response === question.answer ? 1 : 0;
    case "input-number":
      return Number(response) === question.answer ? 1 : 0;
    case "shape-rotation":
      return response === question.answerKey ? 1 : 0;
    case "letter-grid": {
      const selected = new Set(response || []);
      const correctSet = new Set(question.targetPositions);
      if (selected.size === 0) return 0;
      let hits = 0, falsePos = 0;
      selected.forEach(idx => { if (correctSet.has(idx)) hits++; else falsePos++; });
      const recall = hits / correctSet.size;
      const score = recall - falsePos * 0.15;
      return Math.max(0, Math.min(1, score));
    }
    case "memory": {
      const guess = String(response || "").toUpperCase().replace(/\s+/g, "");
      const truth = question.answer.toUpperCase();
      if (guess === truth) return 1;
      let matches = 0;
      for (let i = 0; i < truth.length; i++) if (guess[i] === truth[i]) matches++;
      return Math.max(0, matches / truth.length - 0.05);
    }
    case "reaction": {
      if (response == null) return 0; // never clicked
      const { reactionMs, windowMs } = response;
      if (reactionMs <= windowMs) return 1;
      const over = reactionMs - windowMs;
      return Math.max(0, 1 - over / windowMs);
    }
    case "nback": {
      const matchSet = new Set(question.matchIndices);
      const clicked = new Set((response && response.clicked) || []);
      if (matchSet.size === 0) return clicked.size === 0 ? 1 : 0;
      let hits = 0, falseAlarms = 0;
      clicked.forEach(i => { if (matchSet.has(i)) hits++; else falseAlarms++; });
      return Math.max(0, Math.min(1, hits / matchSet.size - falseAlarms * 0.15));
    }
    default:
      return 0;
  }
}

function getEffectiveTimeLimit(question, mode) {
  if (question.timeLimitSec) return question.timeLimitSec;
  if (mode === "exam" && (question.kind === "mcq" || question.kind === "input-number")) return 25;
  return null;
}

/* ---------------- practice session ---------------- */

function createPracticeSession(catId, count) {
  return {
    mode: "practice",
    catId,
    questions: questionsFor(catId, count),
    index: 0,
    answers: [], // { score, timeMs }
    startedAt: Date.now(),
  };
}

function practiceCurrentQuestion(session) {
  return session.questions[session.index];
}

function practiceAdvance(session) {
  session.index++;
  return session.index >= session.questions.length;
}

function finishPracticeSession(session) {
  const total = session.answers.length;
  const correct = session.answers.reduce((s, a) => s + a.score, 0);
  const result = recordSessionResult(session.catId, correct, total);

  const cat = CATEGORIES.find(c => c.id === session.catId);
  if (cat.type === "bank") {
    session.questions.forEach((q, i) => {
      if (session.answers[i]) updateSrs(q.id, session.answers[i].score >= 0.6);
    });
  }

  const wasAllSrsDue = session.questions.length > 0 && session.questions.every(q => q.isSrs);
  const srsSessionCleared = wasAllSrsDue && dueCountForBank(session.catId) === 0;
  const speedPerfect = session.catId === "vitesse" && total > 0 && correct === total;
  const newBadges = checkBadges({ srsSessionCleared, speedPerfect });
  saveState(); // persist SRS updates and any badges unlocked above

  return { ...result, correctCount: correct, total, newBadges };
}

/* ---------------- exam session ---------------- */

function createExamSession(presetKey) {
  const preset = EXAM_PRESETS[presetKey];
  const sections = CATEGORIES.map(cat => {
    const count = preset.counts[cat.id] || preset.counts.default;
    return { catId: cat.id, name: cat.name, icon: cat.icon, questions: questionsFor(cat.id, count), answers: [] };
  });
  return {
    mode: "exam",
    presetKey,
    sections,
    sectionIndex: 0,
    qIndex: 0,
    startedAt: Date.now(),
  };
}

function examCurrentSection(session) { return session.sections[session.sectionIndex]; }
function examCurrentQuestion(session) { return examCurrentSection(session).questions[session.qIndex]; }

// Returns { sectionDone, examDone }
function examAdvance(session) {
  session.qIndex++;
  const sec = examCurrentSection(session);
  if (session.qIndex >= sec.questions.length) {
    session.qIndex = 0;
    session.sectionIndex++;
    if (session.sectionIndex >= session.sections.length) return { sectionDone: true, examDone: true };
    return { sectionDone: true, examDone: false };
  }
  return { sectionDone: false, examDone: false };
}

function finishExamSession(session) {
  const sectionResults = {};
  let sumClasse = 0;

  session.sections.forEach(sec => {
    const total = sec.answers.length;
    const correct = sec.answers.reduce((s, a) => s + a.score, 0);
    const accuracy = total ? correct / total : 0;
    const classe = computeClasse(accuracy);
    sectionResults[sec.catId] = { correct, total, accuracy, classe, name: sec.name, icon: sec.icon };
    sumClasse += classe;

    recordSessionResult(sec.catId, correct, total);
    const cat = CATEGORIES.find(c => c.id === sec.catId);
    if (cat.type === "bank") {
      sec.questions.forEach((q, i) => { if (sec.answers[i]) updateSrs(q.id, sec.answers[i].score >= 0.6); });
    }
  });

  const overallClasse = Math.round(sumClasse / session.sections.length);
  const durationMin = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
  const entry = { date: todayISO(), durationMin, overallClasse, sectionResults, presetKey: session.presetKey };
  STATE.examHistory.push(entry);
  if (STATE.examHistory.length > 30) STATE.examHistory.shift();

  const newBadges = checkBadges({ examFinished: true, examClasse: overallClasse });
  saveState(); // persist exam history together with any badges unlocked above

  return { overallClasse, durationMin, sectionResults, newBadges };
}

/* ---------------- dashboard recommendation ---------------- */

function getRecommendation() {
  const reviewDue = totalReviewDueAcrossBanks();
  if (reviewDue >= 3) {
    const bankCats = ["verbal", "anglais", "aero"];
    const topCat = bankCats.reduce((best, c) => reviewDueCountForBank(c) > reviewDueCountForBank(best) ? c : best, bankCats[0]);
    const catName = CATEGORIES.find(c => c.id === topCat).name;
    return { type: "srs", label: `${reviewDue} erreur(s) précédente(s) à réviser avant qu'elles ne s'oublient (surtout en ${catName})`, catId: topCat };
  }
  let weakest = null;
  CATEGORIES.forEach(c => {
    const m = categoryMastery(c.id);
    const attempts = STATE.categories[c.id].attempts;
    if (attempts === 0) return;
    if (!weakest || m < weakest.mastery) weakest = { catId: c.id, mastery: m, name: c.name };
  });
  if (weakest && weakest.mastery < 70) {
    return { type: "weak", label: `Ton point faible actuel : ${weakest.name} (${weakest.mastery}%)`, catId: weakest.catId };
  }
  const untried = CATEGORIES.find(c => STATE.categories[c.id].attempts === 0);
  if (untried) return { type: "new", label: `Découvre la catégorie ${untried.name}`, catId: untried.id };
  return { type: "exam", label: "Tu es prêt·e pour un examen blanc complet", catId: null };
}
