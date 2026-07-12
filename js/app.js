/* ============================================================
   app.js — router & bootstrap
   ============================================================ */

function navigate(view) {
  clearActiveTimers();
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  const root = document.getElementById("app");
  if (view === "dashboard") renderDashboard(root);
  else if (view === "categories") renderCategories(root);
  else if (view === "learning") renderLearning(root);
  else if (view === "exam") renderExam(root);
  else if (view === "profile") renderProfile(root);
  else if (view === "quiz") renderQuiz(root);
  updateTopbarChrome();
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function startApp() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => navigate(btn.dataset.view));
  });
  updateTopbarChrome();
  navigate("dashboard");
}

document.addEventListener("DOMContentLoaded", () => {
  initAuthGate(startApp);
});
