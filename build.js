#!/usr/bin/env node
/* Inlines data/events.js into src/app.html and writes two self-contained files:
 *   dist/artifact.html — page content only (the Artifact host supplies the shell)
 *   index.html         — a full document, for serving locally
 * Everything is inline: no CDN, no fetch, no build step at runtime.
 */
const fs = require("fs");
const path = require("path");

const root = __dirname;
const template = fs.readFileSync(path.join(root, "src/app.html"), "utf8");
const events = require("./data/events.js");

// Sanity-check the data before it ships.
const CATS = ["pol", "war", "econ", "shock"];
const REGIONS = ["Global", "Europe", "Americas", "Asia", "Africa", "MidEast", "Oceania"];
const problems = [];
const seen = new Set();
events.forEach((e, i) => {
  const where = `#${i} ${e.t || "(untitled)"}`;
  if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(e.d || "")) problems.push(`${where}: bad date ${e.d}`);
  if (!CATS.includes(e.c)) problems.push(`${where}: bad category ${e.c}`);
  if (!REGIONS.includes(e.r)) problems.push(`${where}: bad region ${e.r}`);
  if (![1, 2, 3].includes(e.i)) problems.push(`${where}: bad importance ${e.i}`);
  if (!e.t || !e.s) problems.push(`${where}: missing title or summary`);
  const y = +String(e.d).slice(0, 4);
  if (y < 1600 || y > 2026) problems.push(`${where}: year ${y} outside 1600–2026`);
  if (seen.has(e.t)) problems.push(`${where}: duplicate title`);
  seen.add(e.t);
});
if (problems.length) {
  console.error("Data problems:\n  " + problems.join("\n  "));
  process.exit(1);
}

// Enrichment is optional — the board works without it, just with shorter panels.
const readJson = p => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
const details = readJson(path.join(root, "data/details.json"));
const rawImages = readJson(path.join(root, "data/images.json"));
const images = {};
for (const [k, v] of Object.entries(rawImages)) if (v && v.d) images[k] = v;

const missing = events.filter(e => !details[e.t]).map(e => e.t);
if (missing.length) console.warn(`  note: ${missing.length} events have no Wikipedia detail yet`);

const payload = [
  "const EVENTS = " + JSON.stringify(events) + ";",
  "const DETAILS = " + JSON.stringify(details) + ";",
  "const IMAGES = " + JSON.stringify(images) + ";",
].join("\n");
const body = template.replace("/*__DATA__*/", () => payload);
if (body === template) { console.error("placeholder /*__DATA__*/ not found"); process.exit(1); }

fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist/artifact.html"), body);

const title = (body.match(/<title>([^<]*)<\/title>/) || [, "Timeline"])[1];
const full = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
<meta name="description" content="512 political and economic events, 1900–2026, on a zoomable linear time axis.">
<title>${title}</title>
<style>*{margin:0}html,body{height:100%}</style>
</head>
<body>
${body.replace(/<title>[^<]*<\/title>\s*/, "")}
</body>
</html>
`;
fs.writeFileSync(path.join(root, "index.html"), full);

const years = new Set(events.map(e => +e.d.slice(0, 4)));
const extractChars = Object.values(details).reduce((a, d) => a + (d.x || "").length, 0);
console.log(`built ${events.length} events across ${years.size} years`);
console.log(`  ${Object.keys(details).length} enriched · ${(extractChars / 1024).toFixed(0)} KB of text · ${Object.keys(images).length} images`);
console.log(`  dist/artifact.html  ${(Buffer.byteLength(body) / 1024).toFixed(0)} KB`);
console.log(`  index.html          ${(Buffer.byteLength(full) / 1024).toFixed(0)} KB`);
