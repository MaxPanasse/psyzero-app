/* ============================================================
   srs.js — spaced repetition (SM-2 lite) for static bank items,
   and helpers to build practice sessions that prioritize errors.
   ============================================================ */

function addDaysISO(iso, days) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function getSrsEntry(itemId) {
  return STATE.srs[itemId] || { interval: 0, ease: 2.5, reps: 0, due: todayISO(), lapses: 0, seen: false };
}

function updateSrs(itemId, correct) {
  const e = getSrsEntry(itemId);
  e.seen = true;
  if (correct) {
    e.reps += 1;
    if (e.reps === 1) e.interval = 1;
    else if (e.reps === 2) e.interval = 3;
    else e.interval = Math.round(e.interval * e.ease);
    e.ease = Math.min(3.0, e.ease + 0.1);
  } else {
    e.lapses += 1;
    e.reps = 0;
    e.interval = 0; // due again today/tomorrow
    e.ease = Math.max(1.3, e.ease - 0.25);
  }
  e.due = addDaysISO(todayISO(), Math.max(e.interval, correct ? 1 : 0));
  STATE.srs[itemId] = e;
}

function isDue(itemId) {
  const e = STATE.srs[itemId];
  if (!e) return true; // never seen -> treat as due (new)
  return e.due <= todayISO();
}

// Only counts items that were already reviewed before and are due again —
// unlike isDue(), this excludes never-seen items so the dashboard doesn't
// call brand-new questions a "review".
function isReviewDue(itemId) {
  const e = STATE.srs[itemId];
  return !!e && e.due <= todayISO();
}

function dueCountForBank(catId) {
  const bank = BANKS[catId] || [];
  return bank.filter(item => isDue(item.id)).length;
}

function reviewDueCountForBank(catId) {
  const bank = BANKS[catId] || [];
  return bank.filter(item => isReviewDue(item.id)).length;
}

// Builds a practice set for a bank category: due/new items first
// (spaced-repetition priority), padded with random review items.
function buildBankSession(catId, count) {
  const bank = BANKS[catId] || [];
  const due = shuffle(bank.filter(item => isDue(item.id)));
  const rest = shuffle(bank.filter(item => !isDue(item.id)));
  const chosen = [...due, ...rest].slice(0, count);
  return chosen.map(item => ({
    kind: "mcq",
    catId,
    id: item.id,
    sub: item.sub,
    prompt: item.prompt,
    options: shuffle(item.options),
    answer: item.answer,
    isSrs: true,
  }));
}

function totalDueAcrossBanks() {
  return ["verbal", "anglais", "aero"].reduce((sum, c) => sum + dueCountForBank(c), 0);
}

function totalReviewDueAcrossBanks() {
  return ["verbal", "anglais", "aero"].reduce((sum, c) => sum + reviewDueCountForBank(c), 0);
}
