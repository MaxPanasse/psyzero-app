/* ============================================================
   ui.js — view rendering: dashboard, categories, quiz, exam, profile
   ============================================================ */

const PRACTICE_COUNTS = { default: 10, memoire: 6, psychomoteur: 12, attention: 6, spatial: 8 };

let activeTimers = [];
function clearActiveTimers() { activeTimers.forEach(t => clearInterval(t)); activeTimers.forEach(t => clearTimeout(t)); activeTimers = []; }
function trackTimer(id) { activeTimers.push(id); return id; }

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function showToast(text) {
  const root = document.getElementById("toast-root");
  const t = el(`<div class="toast">${text}</div>`);
  root.appendChild(t);
  setTimeout(() => t.remove(), 3800);
}

function showBadgeToasts(badges) {
  (badges || []).forEach((b, i) => {
    setTimeout(() => showToast(`${b.icon} Badge débloqué — <strong>${b.name}</strong>`), i * 500);
  });
}

function updateTopbarChrome() {
  const rank = getRank(STATE.profile.xp);
  document.getElementById("streak-pill").textContent = `🔥 ${STATE.profile.streakCurrent}`;
  document.getElementById("level-pill").textContent = `Nv. ${rank.level}`;
}

/* ================= DASHBOARD ================= */

function renderDashboard(root) {
  const rank = getRank(STATE.profile.xp);
  const xpIntoLevel = STATE.profile.xp - rank.minXp;
  const xpForNext = rank.next ? rank.next.minXp - rank.minXp : xpIntoLevel || 1;
  const xpPct = rank.next ? Math.min(100, Math.round((xpIntoLevel / xpForNext) * 100)) : 100;
  const overallAcc = STATE.profile.totalQuestions ? Math.round((STATE.profile.totalCorrect / STATE.profile.totalQuestions) * 100) : 0;
  const bestClasse = Math.max(0, ...Object.values(STATE.categories).map(c => c.bestClasse));
  const reco = getRecommendation();

  root.innerHTML = `
    <div class="hero">
      <div>
        <p class="hero-title">Bienvenue, futur·e cadet·e</p>
        <p class="hero-sub">Objectif PSY0 — entraîne-toi un peu chaque jour, la régularité paie plus que les longues sessions.</p>
      </div>
      <div class="rank-badge">
        <div class="rank-icon">${rank.level >= 8 ? "★" : rank.level >= 4 ? "◆" : "●"}</div>
        <div>
          <div class="rank-name">${rank.name}</div>
          <div class="rank-xp">${STATE.profile.xp} XP</div>
          <div class="xp-bar-wrap">
            <div class="xp-bar-track"><div class="xp-bar-fill" style="width:${xpPct}%"></div></div>
            <div class="xp-bar-label">${rank.next ? `${xpForNext - xpIntoLevel} XP avant ${rank.next.name}` : "Niveau maximum"}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-3" style="margin-top:18px;">
      <div class="card stat-tile"><div class="stat-value">${STATE.profile.totalQuestions}</div><div class="stat-label">Questions répondues</div></div>
      <div class="card stat-tile"><div class="stat-value">${overallAcc}%</div><div class="stat-label">Précision globale</div></div>
      <div class="card stat-tile"><div class="stat-value">${bestClasse || "—"}</div><div class="stat-label">Meilleure classe obtenue</div></div>
    </div>

    <div class="card" style="margin-top:18px;">
      <h3 style="margin-top:0;">Recommandation du jour</h3>
      <p class="muted">${reco.label}</p>
      <div class="cta-row">
        ${reco.catId ? `<button class="btn btn-primary" id="reco-btn">S'entraîner maintenant</button>` : `<button class="btn btn-primary" id="reco-exam-btn">Lancer un examen blanc</button>`}
        <button class="btn btn-secondary" id="goto-categories">Voir toutes les catégories</button>
      </div>
    </div>

    <div class="section-title">Ta progression</div>
    <div class="grid grid-2">
      <div class="card">
        <h3>Répartition par catégorie</h3>
        <div class="chart-wrap">${svgRadarChart(CATEGORIES.map(c => ({ name: c.short, icon: c.icon, value: categoryMastery(c.id) })))}</div>
      </div>
      <div class="card">
        <h3>Régularité (${STATE.profile.streakCurrent} jour(s) d'affilée, record ${STATE.profile.streakBest})</h3>
        <div class="chart-wrap">${svgStreakHeatmap(STATE.profile.practiceLog)}</div>
      </div>
    </div>
  `;

  root.querySelector("#goto-categories").onclick = () => navigate("categories");
  const recoBtn = root.querySelector("#reco-btn");
  if (recoBtn) recoBtn.onclick = () => startPracticeView(reco.catId);
  const recoExamBtn = root.querySelector("#reco-exam-btn");
  if (recoExamBtn) recoExamBtn.onclick = () => navigate("exam");
}

/* ================= CATEGORIES ================= */

function renderCategories(root) {
  const dueTotal = totalDueAcrossBanks();
  root.innerHTML = `
    <div class="section-title">Choisis une catégorie</div>
    ${dueTotal > 0 ? `<div class="card" style="margin-bottom:16px;"><strong>${dueTotal}</strong> question(s) à réviser (répétition espacée) dans tes catégories à banque de questions.</div>` : ""}
    <div class="grid grid-3" id="cat-grid"></div>
  `;
  const grid = root.querySelector("#cat-grid");
  CATEGORIES.forEach(cat => {
    const mastery = categoryMastery(cat.id);
    const due = cat.type === "bank" ? dueCountForBank(cat.id) : 0;
    const card = el(`
      <div class="cat-card">
        <div class="cat-head"><div class="cat-icon">${cat.icon}</div><div class="cat-name">${cat.name}</div></div>
        <div class="cat-desc">${cat.desc}</div>
        ${due > 0 ? `<div class="due-badge">${due} à réviser</div>` : ""}
        <div class="mastery-row"><span>Maîtrise</span><div class="mastery-bar"><div class="mastery-fill" style="width:${mastery}%"></div></div><span>${mastery}%</span></div>
        <button class="btn btn-primary btn-block cat-start">S'entraîner</button>
      </div>
    `);
    card.querySelector(".cat-start").onclick = () => startPracticeView(cat.id);
    grid.appendChild(card);
  });
}

/* ================= LEARNING ================= */

function renderLearning(root) {
  root.innerHTML = `
    <div class="section-title">Apprendre à réussir chaque épreuve</div>
    <p class="muted">Pour chaque catégorie : ce qui est évalué, la méthode de raisonnement à suivre pas à pas, et les techniques concrètes à utiliser. Clique sur une épreuve pour la déplier.</p>
    <div id="learn-list" style="display:flex; flex-direction:column; gap:12px; margin-top:16px;"></div>
  `;
  const list = root.querySelector("#learn-list");
  CATEGORIES.forEach((cat, i) => {
    const content = LEARNING_CONTENT[cat.id];
    const node = el(`
      <details class="card learn-card" ${i === 0 ? "open" : ""}>
        <summary class="learn-summary">
          <span class="cat-icon">${cat.icon}</span>
          <span>
            <div class="cat-name">${cat.name}</div>
            <div class="cat-desc" style="margin:2px 0 0;">${content.tested}</div>
          </span>
        </summary>
        <div class="learn-body">
          <h4>Comment réfléchir, étape par étape</h4>
          <ol class="learn-list">${content.method.map(m => `<li>${m}</li>`).join("")}</ol>

          <h4>Techniques concrètes</h4>
          <ul class="learn-list learn-tips">${content.techniques.map(t => `<li>${t}</li>`).join("")}</ul>

          ${content.pitfalls ? `
            <h4>Pièges fréquents</h4>
            <ul class="learn-list learn-pitfalls">${content.pitfalls.map(p => `<li>${p}</li>`).join("")}</ul>
          ` : ""}

          <button class="btn btn-primary learn-practice">S'entraîner sur "${cat.name}"</button>
        </div>
      </details>
    `);
    node.querySelector(".learn-practice").onclick = (e) => { e.preventDefault(); startPracticeView(cat.id); };
    list.appendChild(node);
  });
}

/* ================= QUIZ ENGINE (shared render) ================= */

let quizCtx = null; // { mode, session }

function startPracticeView(catId) {
  const count = PRACTICE_COUNTS[catId] || PRACTICE_COUNTS.default;
  const session = createPracticeSession(catId, count);
  quizCtx = { mode: "practice", session };
  navigate("quiz");
}

function renderQuiz(root) {
  clearActiveTimers();
  if (!quizCtx) { navigate("categories"); return; }
  const { mode, session } = quizCtx;
  const question = mode === "practice" ? practiceCurrentQuestion(session) : examCurrentQuestion(session);

  let progressPct, headerLabel, badgeLabel;
  if (mode === "practice") {
    progressPct = Math.round((session.index / session.questions.length) * 100);
    headerLabel = CATEGORIES.find(c => c.id === session.catId).name;
    badgeLabel = `${session.index + 1} / ${session.questions.length}`;
  } else {
    const sec = examCurrentSection(session);
    progressPct = Math.round((session.qIndex / sec.questions.length) * 100);
    headerLabel = `Examen — Section ${session.sectionIndex + 1}/${session.sections.length} : ${sec.name}`;
    badgeLabel = `${session.qIndex + 1} / ${sec.questions.length}`;
  }

  root.innerHTML = `
    <div class="quiz-header">
      <strong>${headerLabel}</strong>
      <div class="progress-track"><div class="progress-fill" style="width:${progressPct}%"></div></div>
      <span class="muted">${badgeLabel}</span>
      <span id="timer-chip-slot"></span>
    </div>
    <div class="question-card" id="question-card"></div>
  `;

  const card = root.querySelector("#question-card");
  const timerSlot = root.querySelector("#timer-chip-slot");
  renderQuestionBody(card, timerSlot, question, mode, session);
}

function startHeaderTimer(timerSlot, seconds, onTimeout) {
  let remaining = seconds;
  const chip = el(`<span class="timer-chip">${remaining}s</span>`);
  timerSlot.innerHTML = "";
  timerSlot.appendChild(chip);
  const iv = trackTimer(setInterval(() => {
    remaining--;
    chip.textContent = `${Math.max(0, remaining)}s`;
    if (remaining <= 5) chip.classList.add("low");
    if (remaining <= 0) {
      clearInterval(iv);
      onTimeout();
    }
  }, 1000));
  return () => clearInterval(iv);
}

function renderQuestionBody(card, timerSlot, question, mode, session) {
  let resolved = false;
  const questionStart = Date.now();

  function afterAnswer(score, feedbackHtml, isTimeout) {
    if (resolved) return;
    resolved = true;
    const timeMs = Date.now() - questionStart;
    const record = { score, timeMs };
    if (mode === "practice") session.answers.push(record);
    else examCurrentSection(session).answers.push(record);

    const box = el(`<div class="feedback-box ${score >= 0.6 ? "correct" : "incorrect"}">${feedbackHtml}</div>`);
    card.appendChild(box);
    const footer = el(`<div class="quiz-footer"><span></span><button class="btn btn-primary" id="next-btn">Suivant</button></div>`);
    card.appendChild(footer);
    footer.querySelector("#next-btn").onclick = () => advanceQuiz(mode, session, score);
    footer.querySelector("#next-btn").focus();
  }

  const kind = question.kind;
  const timeLimit = getEffectiveTimeLimit(question, mode);

  if (kind === "mcq") {
    card.innerHTML = `
      ${question.sub ? `<div class="question-meta">${question.sub}</div>` : ""}
      <div class="question-prompt">${question.prompt}</div>
      <div class="options-grid"></div>
    `;
    const grid = card.querySelector(".options-grid");
    question.options.forEach(opt => {
      const btn = el(`<button class="option-btn">${opt}</button>`);
      btn.onclick = () => {
        if (resolved) return;
        const score = scoreAnswer(question, opt);
        [...grid.children].forEach(b => {
          b.disabled = true;
          if (b.textContent === question.answer) b.classList.add("correct");
          else if (b === btn) b.classList.add("incorrect");
        });
        afterAnswer(score, score ? "Bonne réponse !" : `Réponse correcte : <strong>${question.answer}</strong>`);
      };
      grid.appendChild(btn);
    });
    if (timeLimit) startHeaderTimer(timerSlot, timeLimit, () => {
      if (resolved) return;
      [...grid.children].forEach(b => { b.disabled = true; if (b.textContent === question.answer) b.classList.add("correct"); });
      afterAnswer(0, `Temps écoulé. Réponse correcte : <strong>${question.answer}</strong>`, true);
    });
  }

  else if (kind === "input-number") {
    card.innerHTML = `
      <div class="question-prompt">${question.prompt}</div>
      <div class="input-row">
        <input type="number" class="text-input" id="answer-input" placeholder="Ta réponse" autocomplete="off">
        <button class="btn btn-primary" id="submit-btn">Valider</button>
      </div>
    `;
    const input = card.querySelector("#answer-input");
    const submit = () => {
      if (resolved) return;
      const val = input.value;
      const score = scoreAnswer(question, val);
      input.disabled = true;
      card.querySelector("#submit-btn").disabled = true;
      afterAnswer(score, score ? "Bonne réponse !" : `Réponse correcte : <strong>${question.answer}</strong>`);
    };
    card.querySelector("#submit-btn").onclick = submit;
    input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
    input.focus();
    if (timeLimit) startHeaderTimer(timerSlot, timeLimit, () => {
      if (resolved) return;
      input.disabled = true;
      afterAnswer(0, `Temps écoulé. Réponse correcte : <strong>${question.answer}</strong>`, true);
    });
  }

  else if (kind === "shape-rotation") {
    card.innerHTML = `
      <div class="question-prompt">${question.prompt}</div>
      <div class="center muted" style="margin-bottom:4px;">Figure de référence</div>
      <div class="shape-row"><div class="shape-box">${question.referenceSvg}</div></div>
      <div class="options-grid" id="shape-options"></div>
    `;
    const grid = card.querySelector("#shape-options");
    question.options.forEach(opt => {
      const btn = el(`<button class="option-btn center">${opt.svg}</button>`);
      btn.onclick = () => {
        if (resolved) return;
        const score = scoreAnswer(question, opt.key);
        [...grid.children].forEach((b, i) => {
          b.disabled = true;
          if (question.options[i].key === question.answerKey) b.classList.add("correct");
          else if (b === btn) b.classList.add("incorrect");
        });
        afterAnswer(score, score ? "Bonne réponse !" : "Ce n'était pas la bonne orientation (attention aux figures inversées en miroir).");
      };
      grid.appendChild(btn);
    });
    if (timeLimit) startHeaderTimer(timerSlot, timeLimit, () => {
      if (resolved) return;
      [...grid.children].forEach((b, i) => { b.disabled = true; if (question.options[i].key === question.answerKey) b.classList.add("correct"); });
      afterAnswer(0, "Temps écoulé.", true);
    });
  }

  else if (kind === "letter-grid") {
    const picked = new Set();
    card.innerHTML = `
      <div class="question-prompt">${question.prompt}</div>
      <div class="letter-grid" id="lg" style="grid-template-columns:repeat(${question.cols},1fr);"></div>
      <div class="row" style="justify-content:flex-end;"><button class="btn btn-primary" id="submit-btn">Valider ma sélection</button></div>
    `;
    const gridEl = card.querySelector("#lg");
    let idx = 0;
    question.grid.forEach(row => row.forEach(ch => {
      const i = idx++;
      const span = el(`<span data-i="${i}">${ch}</span>`);
      span.onclick = () => { if (resolved) return; picked.has(i) ? picked.delete(i) : picked.add(i); span.classList.toggle("picked"); };
      gridEl.appendChild(span);
    }));
    const submit = () => {
      if (resolved) return;
      const score = scoreAnswer(question, [...picked]);
      [...gridEl.children].forEach(s => {
        const i = Number(s.dataset.i);
        s.style.pointerEvents = "none";
        if (question.targetPositions.includes(i)) s.style.outline = "2px solid var(--green)";
      });
      const hits = [...picked].filter(i => question.targetPositions.includes(i)).length;
      afterAnswer(score, `Tu as trouvé ${hits} / ${question.targetPositions.length} occurrence(s) de "${question.target}".`);
    };
    card.querySelector("#submit-btn").onclick = submit;
    if (timeLimit) startHeaderTimer(timerSlot, timeLimit, submit);
  }

  else if (kind === "memory") {
    card.innerHTML = `
      <div class="question-prompt">${question.prompt}</div>
      <div class="seq-grid" id="seq"></div>
    `;
    const seqEl = card.querySelector("#seq");
    question.sequence.forEach(ch => seqEl.appendChild(el(`<div class="seq-cell">${ch}</div>`)));
    const hideTimeout = trackTimer(setTimeout(() => {
      card.innerHTML = `
        <div class="question-prompt">Retape la séquence dans l'ordre :</div>
        <div class="input-row">
          <input type="text" class="text-input" id="answer-input" placeholder="Ex: ${question.sequence.slice(0, 2).join("")}..." autocomplete="off">
          <button class="btn btn-primary" id="submit-btn">Valider</button>
        </div>
      `;
      const input = card.querySelector("#answer-input");
      const submit = () => {
        if (resolved) return;
        const score = scoreAnswer(question, input.value);
        input.disabled = true;
        afterAnswer(score, score >= 1 ? "Séquence parfaite !" : `Séquence correcte : <strong>${question.sequence.join(" - ")}</strong>`);
      };
      card.querySelector("#submit-btn").onclick = submit;
      input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
      input.focus();
    }, question.displayMs));
  }

  else if (kind === "reaction") {
    card.innerHTML = `
      <div class="question-prompt">${question.prompt}</div>
      <div class="reaction-zone" id="zone"><span class="muted center" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">Prépare-toi…</span></div>
    `;
    const zone = card.querySelector("#zone");
    let appeared = false, appearTime = 0;
    const missTimeout = trackTimer(setTimeout(() => {
      zone.innerHTML = "";
      appeared = true;
      appearTime = Date.now();
      const maxX = zone.clientWidth - question.size, maxY = zone.clientHeight - question.size;
      const target = el(`<div class="reaction-target" style="left:${randInt(0, Math.max(0, maxX))}px; top:${randInt(0, Math.max(0, maxY))}px; width:${question.size}px; height:${question.size}px; background:var(--green);">●</div>`);
      target.onclick = () => {
        if (resolved) return;
        const reactionMs = Date.now() - appearTime;
        const score = scoreAnswer(question, { reactionMs, windowMs: question.windowMs });
        afterAnswer(score, `Temps de réaction : ${reactionMs} ms (objectif : ${question.windowMs} ms).`);
      };
      zone.appendChild(target);
      const giveUp = trackTimer(setTimeout(() => {
        if (resolved) return;
        afterAnswer(0, "Trop lent — la cible a disparu.", true);
      }, question.windowMs * 3));
    }, question.appearDelayMs));
    zone.addEventListener("click", (e) => {
      if (resolved || appeared) return;
      afterAnswer(0, "Faux départ ! Attends que la cible apparaisse.");
    });
  }

  else if (kind === "nback") {
    card.innerHTML = `
      <div class="question-prompt">${question.prompt}</div>
      <div class="center" style="margin:20px 0;">
        <div id="nback-display" style="font-size:4rem; font-weight:900; height:100px; display:flex; align-items:center; justify-content:center;">•</div>
      </div>
      <div class="row" style="justify-content:center;">
        <button class="btn btn-primary" id="match-btn" disabled>Ça correspond !</button>
      </div>
      <div class="muted center" id="nback-progress" style="margin-top:10px;"></div>
    `;
    const display = card.querySelector("#nback-display");
    const matchBtn = card.querySelector("#match-btn");
    const progress = card.querySelector("#nback-progress");
    const clicked = new Set();
    let currentIndex = -1;

    matchBtn.onclick = () => {
      if (currentIndex >= 2) clicked.add(currentIndex);
      matchBtn.disabled = true;
      matchBtn.textContent = "Marqué ✓";
    };

    function showStep(i) {
      currentIndex = i;
      display.textContent = question.sequence[i];
      progress.textContent = `${i + 1} / ${question.sequence.length}`;
      matchBtn.disabled = i < 2;
      matchBtn.textContent = "Ça correspond !";
      trackTimer(setTimeout(() => {
        if (i + 1 < question.sequence.length) showStep(i + 1);
        else finishNback();
      }, question.intervalMs));
    }

    function finishNback() {
      if (resolved) return;
      const matchSet = new Set(question.matchIndices);
      let hits = 0, falseAlarms = 0;
      clicked.forEach(i => { if (matchSet.has(i)) hits++; else falseAlarms++; });
      const score = scoreAnswer(question, { clicked: [...clicked] });
      display.textContent = "";
      afterAnswer(score, `${hits} / ${matchSet.size} correspondance(s) trouvée(s), ${falseAlarms} fausse(s) alerte(s).`);
    }

    trackTimer(setTimeout(() => showStep(0), 700));
  }
}

function advanceQuiz(mode, session, lastScore) {
  if (mode === "practice") {
    const finished = practiceAdvance(session);
    if (finished) {
      const result = finishPracticeSession(session);
      quizCtx = null;
      renderPracticeResults(document.getElementById("app"), result, session);
      showBadgeToasts(result.newBadges);
    } else {
      renderQuiz(document.getElementById("app"));
    }
  } else {
    const { sectionDone, examDone } = examAdvance(session);
    if (examDone) {
      const result = finishExamSession(session);
      quizCtx = null;
      renderExamResults(document.getElementById("app"), result);
      showBadgeToasts(result.newBadges);
    } else if (sectionDone) {
      renderExamSectionTransition(document.getElementById("app"), session);
    } else {
      renderQuiz(document.getElementById("app"));
    }
  }
  updateTopbarChrome();
}

/* ================= RESULTS ================= */

function renderPracticeResults(root, result, session) {
  const cat = CATEGORIES.find(c => c.id === session.catId);
  root.innerHTML = `
    <div class="card result-hero">
      <div class="muted">${cat.icon} ${cat.name}</div>
      <div class="result-score">${Math.round(result.accuracy * 100)}<span class="unit">%</span></div>
      <p class="muted">Classe obtenue : <strong>${result.classe} / 9</strong> — +${result.xpGained} XP</p>
      ${result.leveledUp ? `<div class="badge-toast">🎉 Niveau supérieur : ${result.leveledUp.name} !</div>` : ""}
      <div class="cta-row" style="justify-content:center;">
        <button class="btn btn-primary" id="retry-btn">Refaire une session</button>
        <button class="btn btn-secondary" id="back-btn">Retour aux catégories</button>
      </div>
    </div>
  `;
  root.querySelector("#retry-btn").onclick = () => startPracticeView(session.catId);
  root.querySelector("#back-btn").onclick = () => navigate("categories");
}

/* ================= EXAM ================= */

function renderExam(root) {
  root.innerHTML = `
    <div class="section-title">Examen blanc</div>
    <p class="muted">Simule les conditions du vrai PSY0 : toutes les catégories, à la suite, chronométrées.</p>
    <div class="grid grid-3" id="exam-options"></div>
    <div class="cta-row"><button class="btn btn-primary" id="start-exam-btn" disabled>Commencer l'examen</button></div>
    <div class="card" style="margin-top:20px;" id="exam-history-card"></div>
  `;
  const optsEl = root.querySelector("#exam-options");
  let selected = null;
  Object.entries(EXAM_PRESETS).forEach(([key, preset]) => {
    const card = el(`
      <div class="exam-option" data-key="${key}">
        <h4>${preset.label}</h4>
        <p>~${preset.minutes} min · 9 sections</p>
      </div>
    `);
    card.onclick = () => {
      selected = key;
      [...optsEl.children].forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      root.querySelector("#start-exam-btn").disabled = false;
    };
    optsEl.appendChild(card);
  });
  root.querySelector("#start-exam-btn").onclick = () => {
    if (!selected) return;
    quizCtx = { mode: "exam", session: createExamSession(selected) };
    navigate("quiz");
  };

  const histCard = root.querySelector("#exam-history-card");
  if (STATE.examHistory.length === 0) {
    histCard.innerHTML = `<p class="muted">Aucun examen blanc réalisé pour l'instant.</p>`;
  } else {
    const points = STATE.examHistory.map(h => ({ date: h.date, label: h.date.slice(5), value: Math.round((h.overallClasse / 9) * 100) }));
    histCard.innerHTML = `<h3 style="margin-top:0;">Évolution de tes examens blancs</h3><div class="chart-wrap">${svgLineChart(points)}</div>`;
  }
}

function renderExamSectionTransition(root, session) {
  const doneSec = session.sections[session.sectionIndex - 1];
  const nextSec = session.sections[session.sectionIndex];
  const total = doneSec.answers.length;
  const correct = doneSec.answers.reduce((s, a) => s + a.score, 0);
  root.innerHTML = `
    <div class="card result-hero">
      <p class="muted">Section terminée</p>
      <h2>${doneSec.icon} ${doneSec.name}</h2>
      <p>${Math.round((correct / total) * 100)}% de réussite</p>
      <ul class="section-list">
        ${session.sections.map((s, i) => `<li class="${i < session.sectionIndex ? "done" : i === session.sectionIndex ? "current" : ""}">${s.icon} ${s.name}${i < session.sectionIndex ? " ✓" : ""}</li>`).join("")}
      </ul>
      <div class="cta-row" style="justify-content:center;margin-top:16px;">
        <button class="btn btn-primary" id="continue-btn">Continuer — ${nextSec.name}</button>
      </div>
    </div>
  `;
  root.querySelector("#continue-btn").onclick = () => renderQuiz(document.getElementById("app"));
}

function renderExamResults(root, result) {
  const rows = Object.values(result.sectionResults).map(s => `
    <li class="section-list-row" style="display:flex;justify-content:space-between;padding:8px 12px;border-radius:8px;background:var(--bg-elev-2);margin-bottom:6px;">
      <span>${s.icon} ${s.name}</span>
      <span>${Math.round(s.accuracy * 100)}% — classe <strong>${s.classe}</strong></span>
    </li>
  `).join("");

  root.innerHTML = `
    <div class="card result-hero">
      <p class="muted">Résultat de ton examen blanc (${result.durationMin} min)</p>
      <div class="result-score">${result.overallClasse}<span class="unit">/9</span></div>
      <p class="muted">Classe globale — vise 7 pour être compétitif comme pour le vrai PSY0.</p>
    </div>
    <div class="card" style="margin-top:16px;">
      <h3 style="margin-top:0;">Détail par section</h3>
      <ul style="list-style:none;padding:0;">${rows}</ul>
    </div>
    <div class="cta-row" style="margin-top:16px;">
      <button class="btn btn-primary" id="back-dash">Retour au tableau de bord</button>
      <button class="btn btn-secondary" id="back-exam">Refaire un examen</button>
    </div>
  `;
  root.querySelector("#back-dash").onclick = () => navigate("dashboard");
  root.querySelector("#back-exam").onclick = () => navigate("exam");
}

/* ================= PROFILE ================= */

function renderProfile(root) {
  const rank = getRank(STATE.profile.xp);
  const allHistory = [];
  CATEGORIES.forEach(c => STATE.categories[c.id].history.forEach(h => allHistory.push(h)));
  allHistory.sort((a, b) => a.date.localeCompare(b.date));
  const trendPoints = allHistory.slice(-20).map((h, i) => ({ date: h.date, label: h.date.slice(5), value: Math.round(h.accuracy * 100) }));

  root.innerHTML = `
    <div class="section-title">Ta progression</div>
    <div class="grid grid-3">
      <div class="card stat-tile"><div class="stat-value">${rank.name}</div><div class="stat-label">Rang actuel (Nv. ${rank.level})</div></div>
      <div class="card stat-tile"><div class="stat-value">${STATE.profile.streakBest}</div><div class="stat-label">Record de série (jours)</div></div>
      <div class="card stat-tile"><div class="stat-value">${STATE.examHistory.length}</div><div class="stat-label">Examens blancs passés</div></div>
    </div>

    <div class="grid grid-2" style="margin-top:16px;">
      <div class="card">
        <h3 style="margin-top:0;">Précision récente (toutes catégories)</h3>
        <div class="chart-wrap">${svgLineChart(trendPoints)}</div>
      </div>
      <div class="card">
        <h3 style="margin-top:0;">Forces &amp; faiblesses</h3>
        <div class="chart-wrap">${svgRadarChart(CATEGORIES.map(c => ({ name: c.short, icon: c.icon, value: categoryMastery(c.id) })))}</div>
      </div>
    </div>

    <div class="section-title">Badges</div>
    <div class="card">
      <div class="badge-grid" id="badge-grid"></div>
    </div>

    <div class="section-title">Compte</div>
    <div class="card space-between flex-wrap" style="gap:12px;">
      <div>
        <div style="font-weight:700;">${getAuthEmail() || "—"}</div>
        <div class="muted" style="font-size:0.82rem;">Synchronisé automatiquement sur tous tes appareils connectés à ce compte.</div>
      </div>
      <button class="btn btn-secondary" id="logout-btn">Se déconnecter</button>
    </div>

    <div class="section-title">Zone dangereuse</div>
    <div class="card">
      <p class="muted">Réinitialise toute ta progression (XP, statistiques, badges, historique) — sur tous tes appareils synchronisés à ce compte. Cette action est irréversible.</p>
      <button class="btn btn-danger" id="reset-btn">Réinitialiser ma progression</button>
    </div>
  `;

  const badgeGrid = root.querySelector("#badge-grid");
  BADGES.forEach(b => {
    const unlocked = STATE.profile.badges.includes(b.id);
    badgeGrid.appendChild(el(`
      <div class="badge-item ${unlocked ? "" : "locked"}">
        <div class="badge-icon">${b.icon}</div>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
      </div>
    `));
  });

  root.querySelector("#reset-btn").onclick = () => {
    if (confirm("Confirmer la réinitialisation complète de ta progression sur tous tes appareils ?")) {
      resetAllProgress();
      navigate("dashboard");
    }
  };

  root.querySelector("#logout-btn").onclick = () => logout();
}
