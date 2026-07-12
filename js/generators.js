/* ============================================================
   generators.js — procedural question generators (infinite pool)
   logique, vitesse, attention, spatial, memoire, psychomoteur
   ============================================================ */

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function uid() { return Math.random().toString(36).slice(2, 10); }

/* ---------------- LOGIQUE ---------------- */

function generateLogique(difficulty = 1) {
  const modes = ["arith", "geo", "letters", "altern"];
  const mode = pick(modes);
  const len = 5;
  let seq = [], answer, options, prompt;

  if (mode === "arith") {
    const start = randInt(1, 10 * difficulty);
    const step = randInt(2, 4 + difficulty * 2) * pick([1, -1]);
    seq = Array.from({ length: len }, (_, i) => start + step * i);
    answer = start + step * len;
    prompt = "Quel nombre complète logiquement cette suite ?\n" + seq.join("  ,  ") + "  ,  ?";
  } else if (mode === "geo") {
    const start = randInt(1, 3 + difficulty);
    const ratio = pick([2, 3]);
    seq = Array.from({ length: len }, (_, i) => start * Math.pow(ratio, i));
    answer = start * Math.pow(ratio, len);
    prompt = "Quel nombre complète logiquement cette suite ?\n" + seq.join("  ,  ") + "  ,  ?";
  } else if (mode === "letters") {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const startIdx = randInt(0, 5);
    const step = randInt(1, 2 + Math.floor(difficulty / 2));
    const idxs = Array.from({ length: len }, (_, i) => startIdx + step * i);
    seq = idxs.map(i => alphabet[i % 26]);
    answer = alphabet[(startIdx + step * len) % 26];
    prompt = "Quelle lettre complète logiquement cette suite ?\n" + seq.join("  ,  ") + "  ,  ?";
  } else {
    // alternating two-step pattern e.g. +a,-b,+a,-b...
    const start = randInt(2, 10 * difficulty);
    const a = randInt(2, 5 + difficulty);
    const b = randInt(2, 5 + difficulty);
    seq = [start];
    for (let i = 1; i < len; i++) {
      seq.push(seq[i - 1] + (i % 2 === 1 ? a : -b));
    }
    answer = seq[len - 1] + (len % 2 === 1 ? a : -b);
    prompt = "Quel nombre complète logiquement cette suite ?\n" + seq.join("  ,  ") + "  ,  ?";
  }

  const isNumeric = mode !== "letters";
  const distractors = new Set();
  while (distractors.size < 3) {
    const delta = isNumeric ? pick([-3, -2, -1, 1, 2, 3]) * randInt(1, 3 + difficulty) : randInt(1, 3);
    let d = isNumeric ? answer + delta : String.fromCharCode(((answer.charCodeAt(0) - 65 + delta + 26) % 26) + 65);
    if (d !== answer) distractors.add(d);
  }
  options = shuffle([answer, ...distractors]).map(String);

  return { kind: "mcq", catId: "logique", id: uid(), prompt, options, answer: String(answer) };
}

/* ---------------- VITESSE (calcul rapide) ---------------- */

function generateArithmetic(difficulty = 1) {
  const ops = difficulty <= 2 ? ["+", "-"] : ["+", "-", "×"];
  const op = pick(ops);
  let a, b, answer;
  const range = 8 + difficulty * 10;

  if (op === "+") { a = randInt(1, range); b = randInt(1, range); answer = a + b; }
  else if (op === "-") { a = randInt(5, range); b = randInt(1, a); answer = a - b; }
  else { a = randInt(2, 4 + difficulty); b = randInt(2, 9 + difficulty); answer = a * b; }

  const timeLimitSec = Math.max(5, 12 - difficulty);
  return {
    kind: "input-number",
    catId: "vitesse",
    id: uid(),
    prompt: `${a} ${op} ${b} = ?`,
    answer,
    timeLimitSec,
  };
}

// "Pair ou impair" — rapid odd/even categorization under time pressure.
function generatePairImpair(difficulty = 1) {
  const n = randInt(10, 90 + difficulty * 20);
  const isEven = n % 2 === 0;
  return {
    kind: "mcq",
    catId: "vitesse",
    sub: "pair ou impair",
    id: uid(),
    prompt: `<div class="center" style="font-size:2.6rem; font-weight:900; margin:6px 0 14px;">${n}</div>Ce nombre est-il pair ou impair ?`,
    options: ["Pair", "Impair"],
    answer: isEven ? "Pair" : "Impair",
    timeLimitSec: Math.max(3, 6 - Math.floor(difficulty / 2)),
  };
}

// "Grilles de calculs" — spot the one wrong result among several (verification, not generation).
function generateCalcGrid(difficulty = 1) {
  const count = 6 + Math.min(3, Math.floor(difficulty / 2));
  const ops = ["+", "-", "×"];
  const cells = [];
  const wrongIndex = randInt(0, count - 1);
  for (let i = 0; i < count; i++) {
    const op = pick(ops);
    let a, b, correct;
    if (op === "+") { a = randInt(2, 20 + difficulty * 5); b = randInt(2, 20 + difficulty * 5); correct = a + b; }
    else if (op === "-") { a = randInt(10, 30 + difficulty * 5); b = randInt(2, a); correct = a - b; }
    else { a = randInt(2, 9); b = randInt(2, 9); correct = a * b; }
    const shown = i === wrongIndex ? correct + pick([-3, -2, -1, 1, 2, 3]) : correct;
    cells.push(`${a} ${op} ${b} = ${shown}`);
  }
  return {
    kind: "mcq",
    catId: "vitesse",
    sub: "grille de calculs",
    id: uid(),
    prompt: "Une seule de ces égalités est fausse. Laquelle ?",
    options: cells,
    answer: cells[wrongIndex],
    timeLimitSec: Math.max(15, 30 - difficulty * 2),
  };
}

function generateVitesse(difficulty = 1) {
  const roll = Math.random();
  if (roll < 0.25) return generatePairImpair(difficulty);
  if (roll < 0.45) return generateCalcGrid(difficulty);
  return generateArithmetic(difficulty);
}

/* ---------------- ATTENTION (grille de lettres) ---------------- */

function generateLetterGrid(difficulty = 1) {
  const rows = 6;
  const cols = 10;
  const confusablePairs = [["E", "F"], ["O", "Q"], ["P", "R"], ["M", "N"], ["I", "L"]];
  const pair = pick(confusablePairs);
  const target = pair[0];
  const decoy = pair[1];
  const fillers = "ABCDGHJKSTUVWXYZ".split("");

  const occurrences = randInt(6 + Math.floor(difficulty / 2), 10 + difficulty);
  const total = rows * cols;
  const grid = [];
  const targetPositions = [];

  const cells = new Array(total).fill(null);
  const idxPool = shuffle(Array.from({ length: total }, (_, i) => i));
  for (let i = 0; i < occurrences; i++) {
    cells[idxPool[i]] = target;
    targetPositions.push(idxPool[i]);
  }
  // sprinkle decoys (confusable letter) to raise difficulty
  const decoyCount = Math.min(total - occurrences, 6 + difficulty * 2);
  for (let i = occurrences; i < occurrences + decoyCount; i++) {
    if (idxPool[i] === undefined) break;
    cells[idxPool[i]] = decoy;
  }
  for (let i = 0; i < total; i++) {
    if (cells[i] === null) cells[i] = pick(fillers);
  }
  for (let r = 0; r < rows; r++) grid.push(cells.slice(r * cols, r * cols + cols));

  const timeLimitSec = Math.max(15, 30 - difficulty * 2);

  return {
    kind: "letter-grid",
    catId: "attention",
    id: uid(),
    prompt: `Repère toutes les lettres "${target}" dans la grille avant la fin du temps imparti.`,
    grid, target, cols, rows,
    targetPositions,
    timeLimitSec,
  };
}

// "Formes et couleurs" — Stroop task: name the ink color, ignore the word meaning.
const STROOP_COLORS = [
  { name: "ROUGE", hex: "#f87171" },
  { name: "BLEU", hex: "#3b82f6" },
  { name: "VERT", hex: "#34d399" },
  { name: "JAUNE", hex: "#f5b942" },
  { name: "VIOLET", hex: "#a78bfa" },
];

function generateStroop(difficulty = 1) {
  const paletteSize = Math.min(STROOP_COLORS.length, 3 + difficulty);
  const palette = STROOP_COLORS.slice(0, paletteSize);
  const wordColor = pick(palette);
  let inkColor = pick(palette);
  if (inkColor.name === wordColor.name && Math.random() < 0.7) {
    const others = palette.filter(c => c.name !== wordColor.name);
    inkColor = others.length ? pick(others) : inkColor;
  }
  return {
    kind: "mcq",
    catId: "attention",
    sub: "formes et couleurs",
    id: uid(),
    prompt: `Quelle est la COULEUR D'AFFICHAGE de ce mot (pas ce qu'il signifie) ?
    <div class="center" style="margin:20px 0;">
      <span style="font-size:2.4rem; font-weight:900; color:${inkColor.hex};">${wordColor.name}</span>
    </div>`,
    options: shuffle(palette.map(c => c.name)),
    answer: inkColor.name,
    timeLimitSec: Math.max(6, 12 - difficulty),
  };
}

function generateAttention(difficulty = 1) {
  if (Math.random() < 0.4) return generateStroop(difficulty);
  return generateLetterGrid(difficulty);
}

/* ---------------- SPATIAL (rotation mentale) ---------------- */

const SHAPES = [
  [[0, 1], [1, 1], [2, 1], [2, 0]],                 // J
  [[0, 0], [1, 0], [2, 0], [2, 1]],                 // L
  [[0, 1], [0, 2], [1, 0], [1, 1]],                 // S
  [[0, 0], [0, 1], [1, 1], [1, 2]],                 // Z
  [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]],         // F-pentomino
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]],         // W-ish staircase
];

function normalizeCells(cells) {
  const minR = Math.min(...cells.map(c => c[0]));
  const minC = Math.min(...cells.map(c => c[1]));
  return cells.map(([r, c]) => [r - minR, c - minC]);
}
function rotateCells90(cells) {
  const maxR = Math.max(...cells.map(c => c[0]));
  const rotated = cells.map(([r, c]) => [c, maxR - r]);
  return normalizeCells(rotated);
}
function mirrorCells(cells) {
  const maxC = Math.max(...cells.map(c => c[1]));
  const mirrored = cells.map(([r, c]) => [r, maxC - c]);
  return normalizeCells(mirrored);
}
function rotateNTimes(cells, n) {
  let c = cells;
  for (let i = 0; i < n; i++) c = rotateCells90(c);
  return c;
}
function cellsKey(cells) {
  return cells.map(c => c.join(",")).sort().join("|");
}

function cellsToSvg(cells, size = 26) {
  const maxR = Math.max(...cells.map(c => c[0]));
  const maxC = Math.max(...cells.map(c => c[1]));
  const w = (maxC + 1) * size;
  const h = (maxR + 1) * size;
  const rects = cells.map(([r, c]) =>
    `<rect x="${c * size + 1}" y="${r * size + 1}" width="${size - 2}" height="${size - 2}" rx="4" fill="var(--accent-2)" />`
  ).join("");
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}

function generateTetrominoRotation(difficulty = 1) {
  const base = normalizeCells(pick(SHAPES));
  const targetRot = pick([1, 2, 3]); // number of 90° steps
  const correctCells = rotateNTimes(base, targetRot);
  const correctKey = cellsKey(correctCells);

  const candidates = [];
  // mirror-based traps (classic "flipped, not rotated" distractor)
  const mirrored = mirrorCells(base);
  for (let r = 0; r < 4; r++) candidates.push(rotateNTimes(mirrored, r));
  // wrong-rotation traps of the same (correct) shape
  for (let r = 0; r < 4; r++) if (r !== targetRot) candidates.push(rotateNTimes(base, r));
  // a different shape entirely, for lower difficulty variety
  if (difficulty <= 2) {
    const other = normalizeCells(pick(SHAPES.filter(s => s !== base)));
    candidates.push(rotateNTimes(other, randInt(0, 3)));
  }

  const seen = new Set([correctKey]);
  const distractors = [];
  for (const cand of shuffle(candidates)) {
    const k = cellsKey(cand);
    if (!seen.has(k)) { seen.add(k); distractors.push(cand); }
    if (distractors.length === 3) break;
  }
  while (distractors.length < 3) {
    // fallback: random extra rotation of a random shape
    const filler = rotateNTimes(normalizeCells(pick(SHAPES)), randInt(0, 3));
    const k = cellsKey(filler);
    if (!seen.has(k)) { seen.add(k); distractors.push(filler); }
  }

  const options = shuffle([
    { key: correctKey, svg: cellsToSvg(correctCells) },
    ...distractors.map(c => ({ key: cellsKey(c), svg: cellsToSvg(c) })),
  ]);

  return {
    kind: "shape-rotation",
    catId: "spatial",
    id: uid(),
    prompt: `Cette figure de référence est tournée de ${targetRot * 90}°. Laquelle des 4 propositions correspond au résultat ?`,
    referenceSvg: cellsToSvg(base),
    options,
    answerKey: correctKey,
    timeLimitSec: Math.max(15, 30 - difficulty * 2),
  };
}

// "Cubes 2D/3D" — is the second cube the same one rotated, or a different cube?
// Uses the same mirror/chirality principle as the tetromino trap above: a cyclic
// permutation of the 3 visible faces is reachable by rotation, a single swap is not
// (exactly like a die's numbering being "left-" or "right-handed").
const CUBE_SYMBOLS = ["●", "■", "▲", "◆", "★", "✚"];

function isoCubeSvg(top, right, left, size = 40) {
  const s = size;
  const vx = [s * 0.866, s * 0.5];
  const vy = [-s * 0.866, s * 0.5];
  const vz = [0, -s];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const O = [0, 0];
  const topFace = [vz, add(vz, vx), add(add(vz, vx), vy), add(vz, vy)];
  const rightFace = [O, vx, add(vx, vz), vz];
  const leftFace = [O, vy, add(vy, vz), vz];
  const shiftX = s * 0.866 + 8, shiftY = s + 8;
  const P = ([x, y]) => `${(x + shiftX).toFixed(1)},${(y + shiftY).toFixed(1)}`;
  const poly = pts => pts.map(P).join(" ");
  const center = pts => [
    pts.reduce((sum, p) => sum + p[0], 0) / pts.length + shiftX,
    pts.reduce((sum, p) => sum + p[1], 0) / pts.length + shiftY,
  ];
  const [tx, ty] = center(topFace);
  const [rx, ry] = center(rightFace);
  const [lx, ly] = center(leftFace);
  const w = shiftX * 2, h = shiftY + s * 0.5 + 10;
  return `<svg viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" width="120" height="115" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${poly(topFace)}" fill="var(--accent-2)" opacity="0.9" stroke="var(--border)" stroke-width="1"/>
    <polygon points="${poly(rightFace)}" fill="var(--accent)" opacity="0.6" stroke="var(--border)" stroke-width="1"/>
    <polygon points="${poly(leftFace)}" fill="var(--accent)" opacity="0.35" stroke="var(--border)" stroke-width="1"/>
    <text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central" font-size="18" fill="#06111f">${top}</text>
    <text x="${rx}" y="${ry}" text-anchor="middle" dominant-baseline="central" font-size="18" fill="#06111f">${right}</text>
    <text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" font-size="18" fill="#06111f">${left}</text>
  </svg>`;
}

function generateCubeIdentity() {
  const [a, b, c] = shuffle(CUBE_SYMBOLS).slice(0, 3);
  const isSame = Math.random() < 0.5;
  const compareTriple = isSame
    ? pick([[b, c, a], [c, a, b]])                   // cyclic permutation: reachable by rotation
    : pick([[b, a, c], [c, b, a], [a, c, b]]);        // single swap: flips chirality, impossible by rotation

  return {
    kind: "mcq",
    catId: "spatial",
    sub: "cubes 2D/3D",
    id: uid(),
    prompt: `Ces deux cubes montrent chacun 3 faces (haut, droite, gauche). Est-ce le même cube vu sous un autre angle, ou deux cubes différents ?
    <div class="shape-row" style="margin-top:14px;">
      <div class="shape-box">${isoCubeSvg(a, b, c)}</div>
      <div class="shape-box">${isoCubeSvg(compareTriple[0], compareTriple[1], compareTriple[2])}</div>
    </div>`,
    options: shuffle(["Identique", "Différent"]),
    answer: isSame ? "Identique" : "Différent",
    timeLimitSec: 20,
  };
}

function generateSpatial(difficulty = 1) {
  if (Math.random() < 0.45) return generateCubeIdentity();
  return generateTetrominoRotation(difficulty);
}

/* ---------------- MEMOIRE ---------------- */

function generateSpanRecall(difficulty = 1) {
  const useLetters = Math.random() < 0.4;
  const length = 3 + difficulty; // 4..8
  const pool = useLetters ? "ABCDEFGHJKLMNPQRSTUVWXYZ".split("") : "0123456789".split("");
  const sequence = Array.from({ length }, () => pick(pool));
  const displayMs = 900 * length + 400;

  return {
    kind: "memory",
    catId: "memoire",
    id: uid(),
    prompt: "Mémorise cette séquence, elle va disparaître.",
    sequence,
    displayMs,
    answer: sequence.join(""),
  };
}

// "M2 Back numérique" — classic 2-back working-memory task: flag a digit whenever
// it matches the one shown exactly 2 steps earlier in the stream.
function generateNBack(difficulty = 1) {
  const length = 12 + difficulty * 2; // 14..22
  const intervalMs = Math.max(1100, 2100 - difficulty * 150);
  const pool = "0123456789".split("");
  const sequence = [];
  for (let i = 0; i < length; i++) {
    if (i >= 2 && Math.random() < 0.35) sequence.push(sequence[i - 2]); // deliberate match
    else sequence.push(pick(pool));
  }
  const matchIndices = [];
  for (let i = 2; i < length; i++) if (sequence[i] === sequence[i - 2]) matchIndices.push(i);

  return {
    kind: "nback",
    catId: "memoire",
    sub: "2-back numérique",
    id: uid(),
    prompt: "Clique sur \"Ça correspond !\" chaque fois que le chiffre affiché est identique à celui d'il y a 2 crans.",
    sequence,
    intervalMs,
    matchIndices,
  };
}

function generateMemoire(difficulty = 1) {
  if (Math.random() < 0.4) return generateNBack(difficulty);
  return generateSpanRecall(difficulty);
}

/* ---------------- PSYCHOMOTEUR (réaction) ---------------- */

function generatePsychomoteur(difficulty = 1) {
  const appearDelayMs = randInt(600, 2200);
  const windowMs = Math.max(450, 1100 - difficulty * 100);
  const size = Math.max(34, 58 - difficulty * 4);
  return {
    kind: "reaction",
    catId: "psychomoteur",
    id: uid(),
    prompt: "Clique sur la cible dès qu'elle apparaît, le plus vite possible.",
    appearDelayMs,
    windowMs,
    size,
  };
}

/* ---------------- Dispatcher ---------------- */

const GENERATORS = {
  logique: generateLogique,
  vitesse: generateVitesse,
  attention: generateAttention,
  spatial: generateSpatial,
  memoire: generateMemoire,
  psychomoteur: generatePsychomoteur,
};

function generateQuestion(catId, difficulty = 1) {
  return GENERATORS[catId](difficulty);
}
