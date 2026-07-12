/* ============================================================
   landing.js — marketing/explainer home page shown when logged out
   ============================================================ */

const FAQ_ITEMS = [
  {
    q: "Est-ce un site officiel d'une compagnie aérienne ou d'une école de pilotage ?",
    a: "Non. AeroPsy est un outil d'entraînement indépendant, non affilié à une compagnie aérienne, école de pilotage ou organisme de sélection. Il prépare au format générique des tests psychotechniques utilisés dans les sélections pilote (PSY0), à partir de contenu original.",
  },
  {
    q: "Combien de temps faut-il s'entraîner avant une sélection ?",
    a: "La régularité compte plus que le volume : quelques sessions courtes par semaine sur plusieurs semaines donnent de bien meilleurs résultats qu'un bourrage la veille. Le suivi de progression t'aide à voir quand tu es prêt·e.",
  },
  {
    q: "Mes données sont-elles partagées avec qui que ce soit ?",
    a: "Non. Ta progression est liée à ton compte et synchronisée uniquement entre tes propres appareils — jamais partagée, revendue, ni visible par d'autres utilisateurs.",
  },
];

function renderLandingPage(root) {
  const catChips = CATEGORIES.map(c => `
    <div class="cat-chip"><span class="cat-icon">${c.icon}</span><span>${c.name}</span></div>
  `).join("");

  const faqItems = FAQ_ITEMS.map((f, i) => `
    <details class="card learn-card" ${i === 0 ? "open" : ""}>
      <summary class="learn-summary"><span class="cat-name">${f.q}</span></summary>
      <div class="learn-body"><p style="margin:0; color:var(--text-dim);">${f.a}</p></div>
    </details>
  `).join("");

  root.innerHTML = `
    <section class="landing-hero">
      <div class="landing-hero-copy">
        <div class="landing-eyebrow">Préparation tests psychotechniques pilote</div>
        <h1 class="landing-title">Entraîne-toi comme si c'était le jour J.</h1>
        <p class="landing-sub">9 épreuves, une difficulté qui s'ajuste à toi, des examens blancs chronométrés en conditions réelles.</p>
        <div class="cta-row">
          <button class="btn btn-primary" id="landing-cta-register">Commencer gratuitement</button>
          <button class="btn btn-secondary" id="landing-cta-login">J'ai déjà un compte</button>
        </div>
      </div>
    </section>

    <div class="stats-bar">
      <div class="stat-item"><div class="stat-value">9</div><div class="stat-label">catégories d'épreuves</div></div>
      <div class="stat-item"><div class="stat-value">200+</div><div class="stat-label">questions &amp; exercices</div></div>
      <div class="stat-item"><div class="stat-value">3</div><div class="stat-label">formats d'examen blanc</div></div>
      <div class="stat-item"><div class="stat-value">100%</div><div class="stat-label">progression synchronisée</div></div>
    </div>

    <section class="landing-section">
      <div class="cat-chip-grid">${catChips}</div>
    </section>

    <section class="landing-section">
      <div class="section-title">Comment ça marche</div>
      <div class="steps-row">
        <div class="step-card">
          <div class="step-number">1</div>
          <div class="feature-title">Crée ton compte</div>
          <div class="feature-desc">Gratuit, en moins d'une minute.</div>
        </div>
        <div class="step-card">
          <div class="step-number">2</div>
          <div class="feature-title">Entraîne-toi</div>
          <div class="feature-desc">Le niveau s'adapte à toi automatiquement.</div>
        </div>
        <div class="step-card">
          <div class="step-number">3</div>
          <div class="feature-title">Passe un examen blanc</div>
          <div class="feature-desc">Conditions chronométrées réelles, score détaillé.</div>
        </div>
      </div>
    </section>

    <section class="landing-section">
      <div class="section-title">Questions fréquentes</div>
      <div style="display:flex; flex-direction:column; gap:12px;">${faqItems}</div>
    </section>

    <section class="final-cta">
      <h2>Prêt·e à décoller ?</h2>
      <button class="btn btn-primary" id="landing-cta-final">Commencer gratuitement</button>
    </section>
  `;

  root.querySelector("#landing-cta-register").onclick = () => renderAuthScreen("register");
  root.querySelector("#landing-cta-login").onclick = () => renderAuthScreen("login");
  root.querySelector("#landing-cta-final").onclick = () => renderAuthScreen("register");
}
