#!/usr/bin/env node
/* Pulls the lead section of the matching Wikipedia article for every event.
 *
 *   node enrich.js            resolve + fetch anything not already cached
 *   node enrich.js --report   just print what is unresolved or suspicious
 *   node enrich.js --refetch "Suez Crisis"   drop one event from the cache first
 *
 * Matching runs in three passes: the event title as an article title (Wikipedia
 * has enough redirects that most land), then a search fallback, then a manual
 * override map in data/wiki-overrides.js which always wins. Everything is
 * cached in data/wiki-cache.json so re-runs cost nothing.
 *
 * Text is CC BY-SA 4.0 from Wikipedia; the app credits it and links each article.
 */
const fs = require("fs");
const path = require("path");

const UA = "CenturyBoard/1.0 (personal history timeline; +https://github.com/kikman-git/four-centuries-timeline)";
const API = "https://en.wikipedia.org/w/api.php";
const CACHE_PATH = path.join(__dirname, "data/wiki-cache.json");
const OUT_PATH = path.join(__dirname, "data/details.json");
const MAX_EXTRACT = 3200;

const EVENTS = require("./data/events.js");
let OVERRIDES = {};
try { OVERRIDES = require("./data/wiki-overrides.js"); } catch (e) {}

const args = process.argv.slice(2);
const REPORT_ONLY = args.includes("--report");
const refetchIdx = args.indexOf("--refetch");
const REFETCH = refetchIdx >= 0 ? args[refetchIdx + 1] : null;

let cache = {};
if (fs.existsSync(CACHE_PATH)) cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
if (REFETCH) { delete cache[REFETCH]; console.log("dropped from cache:", REFETCH); }

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(params) {
  const qs = new URLSearchParams({ format: "json", formatversion: "2", ...params });
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${API}?${qs}`, { headers: { "User-Agent": UA } });
      if (res.status === 429 || res.status >= 500) { await sleep(1200 * (attempt + 1)); continue; }
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (err) {
      if (attempt === 3) throw err;
      await sleep(1200 * (attempt + 1));
    }
  }
}

/* One batch of up to 20 titles -> {requestedTitle: pageObject|null} */
async function fetchTitles(titles) {
  const data = await api({
    action: "query", prop: "extracts|pageimages|description",
    exintro: "1", explaintext: "1", redirects: "1",
    exlimit: "20", pilimit: "20", pithumbsize: "480",
    titles: titles.join("|"),
  });
  const q = data.query || {};
  const alias = new Map();                    // requested -> final title
  for (const n of q.normalized || []) alias.set(n.from, n.to);
  for (const r of q.redirects || []) {
    for (const [from, to] of alias) if (to === r.from) alias.set(from, r.to);
    alias.set(r.from, r.to);
  }
  const byTitle = new Map((q.pages || []).map(p => [p.title, p]));
  const out = {};
  for (const t of titles) {
    const final = alias.get(t) || t;
    const page = byTitle.get(final);
    out[t] = page && !page.missing ? page : null;
  }
  return out;
}

async function search(query) {
  const data = await api({ action: "query", list: "search", srsearch: query, srlimit: "3" });
  return ((data.query || {}).search || []).map(s => s.title);
}

/* Is this page plausibly about this event? Wikipedia search happily returns
   something adjacent, so check the years line up and it isn't a disambig stub. */
function score(page, ev, trusted) {
  if (!page || !page.extract) return { ok: false, why: "no extract" };
  const x = page.extract;
  if (x.length < 220) return { ok: false, why: "extract too short (" + x.length + ")" };
  if (/\bmay refer to\b|\bcan refer to\b/i.test(x.slice(0, 300)))
    return { ok: false, why: "disambiguation page" };
  if (trusted) return { ok: true };   // an override is a human assertion; skip the heuristic
  const year = +ev.d.slice(0, 4);
  // must span the whole board, not just the modern range — 1600s years are years too
  const years = (x.match(/\b(1[5-9]\d{2}|20[0-2]\d)\b/g) || []).map(Number);
  const near = years.some(y => Math.abs(y - year) <= 3);
  if (!near) return { ok: false, why: `no year near ${year} in lead (saw ${[...new Set(years)].slice(0, 6).join(",") || "none"})` };
  return { ok: true };
}

function trim(text) {
  if (text.length <= MAX_EXTRACT) return text.trim();
  const cut = text.slice(0, MAX_EXTRACT);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(".\n"));
  return (stop > MAX_EXTRACT * 0.55 ? cut.slice(0, stop + 1) : cut) .trim() + " […]";
}

function pack(page, ev, how) {
  return {
    wiki: page.title,
    url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(page.title.replace(/ /g, "_")),
    desc: page.description || "",
    extract: trim(page.extract),
    thumb: page.thumbnail ? page.thumbnail.source.split("?")[0] : "",
    how,
  };
}

(async () => {
  // Failed entries go back through pass 1, not straight to pass 2 — otherwise a
  // newly added override never gets tried, because only pass 1 reads overrides.
  const todo = EVENTS.filter(e => !cache[e.t] || cache[e.t].failed);
  console.log(`${EVENTS.length} events · ${EVENTS.length - todo.length} cached · ${todo.length} to fetch`);

  if (!REPORT_ONLY && todo.length) {
    // Pass 1 — the override title if there is one, otherwise the event title.
    for (let i = 0; i < todo.length; i += 20) {
      const batch = todo.slice(i, i + 20);
      const titles = batch.map(e => OVERRIDES[e.t] || e.t);
      let pages;
      try { pages = await fetchTitles(titles); }
      catch (err) { console.error("batch failed:", err.message); continue; }
      batch.forEach((e, k) => {
        const p = pages[titles[k]];
        const s = score(p, e, !!OVERRIDES[e.t]);
        if (p && s.ok) cache[e.t] = pack(p, e, OVERRIDES[e.t] ? "override" : "title");
        else if (OVERRIDES[e.t]) cache[e.t] = { failed: true, tried: titles[k], why: p ? s.why : "no such article" };
      });
      process.stdout.write(`\r  pass 1: ${Math.min(i + 20, todo.length)}/${todo.length}`);
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 1));
      await sleep(120);
    }
    console.log("");

    // Pass 2 — search for whatever pass 1 missed.
    const missed = EVENTS.filter(e => !cache[e.t] || cache[e.t].failed);
    console.log(`  pass 2: searching for ${missed.length}`);
    for (let i = 0; i < missed.length; i++) {
      const e = missed[i];
      const year = e.d.slice(0, 4);
      let best = null;
      for (const query of [`${e.t} ${year}`, e.t]) {
        let hits;
        try { hits = await search(query); } catch (err) { continue; }
        if (!hits.length) continue;
        let pages;
        try { pages = await fetchTitles(hits); } catch (err) { continue; }
        for (const h of hits) {
          const s = score(pages[h], e);
          if (s.ok) { best = pack(pages[h], e, "search"); break; }
        }
        if (best) break;
        await sleep(120);
      }
      cache[e.t] = best || { failed: true, tried: e.t, why: "no plausible search hit" };
      process.stdout.write(`\r  pass 2: ${i + 1}/${missed.length}`);
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 1));
      await sleep(150);
    }
    console.log("");
  }

  // Report
  const failed = EVENTS.filter(e => !cache[e.t] || cache[e.t].failed);
  const byHow = {};
  EVENTS.forEach(e => { const c = cache[e.t]; if (c && !c.failed) byHow[c.how] = (byHow[c.how] || 0) + 1; });
  console.log("\nresolved:", JSON.stringify(byHow));
  console.log("unresolved:", failed.length);
  failed.forEach(e => console.log(`  ✗ ${e.d}  ${e.t}  — ${(cache[e.t] || {}).why || "not fetched"}`));

  // Titles that drifted a long way from the event name are worth a human look.
  const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 3);
  const suspicious = EVENTS.filter(e => {
    const c = cache[e.t];
    if (!c || c.failed) return false;
    const a = new Set(norm(e.t)), b = norm(c.wiki);
    return !b.some(w => a.has(w));
  });
  console.log(`\nno shared word between event and article title (${suspicious.length}) — check these:`);
  suspicious.forEach(e => console.log(`  ? ${e.d}  "${e.t}"  ->  "${cache[e.t].wiki}"  [${cache[e.t].how}]`));

  if (!REPORT_ONLY) {
    const out = {};
    for (const e of EVENTS) {
      const c = cache[e.t];
      if (c && !c.failed) out[e.t] = { w: c.wiki, u: c.url, k: c.desc, x: c.extract, i: c.thumb };
    }
    fs.writeFileSync(OUT_PATH, JSON.stringify(out));
    const chars = Object.values(out).reduce((a, d) => a + d.x.length, 0);
    console.log(`\nwrote ${Object.keys(out).length} details, ${(chars / 1024).toFixed(0)} KB of extract text`);
  }
})();
