/* ============================================================
   charts.js — lightweight dependency-free SVG charts
   ============================================================ */

function svgLineChart(points, { width = 560, height = 180, min = 0, max = 100, color = "var(--accent-2)" } = {}) {
  if (points.length === 0) {
    return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}"><text x="${width/2}" y="${height/2}" fill="var(--text-dim)" text-anchor="middle" font-size="13">Pas encore de données</text></svg>`;
  }
  const padL = 30, padR = 12, padT = 12, padB = 24;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const n = points.length;
  const x = i => padL + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const y = v => padT + innerH - ((v - min) / (max - min)) * innerH;

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const areaPath = `${path} L ${x(n - 1).toFixed(1)} ${padT + innerH} L ${x(0).toFixed(1)} ${padT + innerH} Z`;

  const gridLines = [0, 25, 50, 75, 100].filter(v => v >= min && v <= max).map(v =>
    `<line x1="${padL}" y1="${y(v)}" x2="${width - padR}" y2="${y(v)}" stroke="var(--border)" stroke-width="1"/>
     <text x="${padL - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="var(--text-dim)">${v}</text>`
  ).join("");

  const dots = points.map((p, i) =>
    `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="3.5" fill="${color}"><title>${p.label}: ${p.value}</title></circle>`
  ).join("");

  const labelStep = Math.max(1, Math.ceil(n / 6));
  const labels = points.map((p, i) => i % labelStep === 0
    ? `<text x="${x(i).toFixed(1)}" y="${height - 6}" text-anchor="middle" font-size="9" fill="var(--text-dim)">${p.label}</text>`
    : ""
  ).join("");

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="xMidYMid meet">
    ${gridLines}
    <path d="${areaPath}" fill="${color}" opacity="0.12" stroke="none"/>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    ${labels}
  </svg>`;
}

function svgRadarChart(categories, { size = 380 } = {}) {
  const n = categories.length;
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 82;
  const angle = i => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i, ratio) => [cx + r * ratio * Math.cos(angle(i)), cy + r * ratio * Math.sin(angle(i))];

  const rings = [0.25, 0.5, 0.75, 1].map(ratio => {
    const p = categories.map((_, i) => pt(i, ratio).join(",")).join(" ");
    return `<polygon points="${p}" fill="none" stroke="var(--border)" stroke-width="1"/>`;
  }).join("");

  const spokes = categories.map((_, i) => {
    const [x, y] = pt(i, 1);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--border)" stroke-width="1"/>`;
  }).join("");

  const dataPoints = categories.map((c, i) => pt(i, Math.max(0.04, c.value / 100)));
  const dataPath = dataPoints.map(p => p.join(",")).join(" ");

  const labels = categories.map((c, i) => {
    const [x, y] = pt(i, 1.28);
    const anchor = Math.abs(x - cx) < 4 ? "middle" : (x > cx ? "start" : "end");
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="10.5" fill="var(--text-dim)">${c.icon || ""} ${c.name}</text>`;
  }).join("");

  return `<svg viewBox="0 0 ${size} ${size}" width="100%" height="${size}" preserveAspectRatio="xMidYMid meet">
    ${rings}
    ${spokes}
    <polygon points="${dataPath}" fill="var(--accent-2)" fill-opacity="0.28" stroke="var(--accent-2)" stroke-width="2"/>
    ${labels}
  </svg>`;
}

function svgStreakHeatmap(practiceLog, { weeks = 18 } = {}) {
  const set = new Set(practiceLog);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // align to the most recent Sunday so columns are clean weeks
  const end = new Date(today);
  const days = weeks * 7;
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  while (start.getDay() !== 0) start.setDate(start.getDate() - 1);

  const cell = 13, gap = 3;
  const cols = Math.ceil((end - start) / 86400000 / 7) + 1;
  const width = cols * (cell + gap) + 20;
  const height = 7 * (cell + gap) + 16;

  let rects = "";
  let cursor = new Date(start);
  let col = 0;
  while (cursor <= end) {
    const dow = cursor.getDay();
    const iso = cursor.getFullYear() + "-" + String(cursor.getMonth() + 1).padStart(2, "0") + "-" + String(cursor.getDate()).padStart(2, "0");
    const active = set.has(iso);
    const future = cursor > today;
    const fill = future ? "transparent" : (active ? "var(--green)" : "var(--bg-elev-2)");
    const x = 16 + col * (cell + gap);
    const y = 8 + dow * (cell + gap);
    rects += `<rect class="heatmap-cell" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="${fill}" stroke="var(--border)" stroke-width="0.6"><title>${iso}${active ? " — entraînement" : ""}</title></rect>`;
    if (dow === 6) col++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="xMidYMid meet">${rects}</svg>`;
}
