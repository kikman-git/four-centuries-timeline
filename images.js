#!/usr/bin/env node
/* Downloads one lead image per event and embeds it as a WebP data URI.
 *
 *   node images.js [--width 260] [--quality 62] [--limit N]
 *
 * The Artifact host blocks every external request, so an image either travels
 * inside the page or isn't there at all. Two things follow: keep them small,
 * and only take images we may actually redistribute — the licence check below
 * drops anything that isn't public domain or CC, and keeps the credit line
 * that CC BY / BY-SA require.
 *
 * Output: data/images.json  { "<event title>": { d: "data:image/webp;base64,…",
 *                                                c: "credit", l: "licence" } }
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const UA = "CenturyBoard/1.0 (personal history timeline; +https://github.com/kikman-git/four-centuries-timeline)";
const API = "https://en.wikipedia.org/w/api.php";
const DETAILS = JSON.parse(fs.readFileSync(path.join(__dirname, "data/details.json"), "utf8"));
const OUT = path.join(__dirname, "data/images.json");
const TMP = "/tmp/century-board-img";

const arg = (flag, dflt) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? +process.argv[i + 1] : dflt;
};
const WIDTH = arg("--width", 260), QUALITY = arg("--quality", 62), LIMIT = arg("--limit", Infinity);
const DELAY = arg("--delay", 550);   // upload.wikimedia.org starts 429-ing well below 10/s

fs.mkdirSync(TMP, { recursive: true });
let out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* Licences we may redistribute inside the page. Anything not listed — and
   anything with no licence stated at all — is left out rather than guessed at. */
const ACCEPT = [
  /^public domain/i, /^pd[-_ ]/i, /^pd$/i, /^cc0/i, /^cc[- ]by/i,
  /^attribution/i, /^gfdl/i, /^godl/i, /^copyrighted free use/i,
  /^no restrictions$/i, /^free art licen[cs]e/i, /^fal$/i,
];
const isFree = l => ACCEPT.some(re => re.test(l.trim()));

/* The thumbnail URL embeds the source file name:
   …/commons/thumb/8/8a/Some_File.jpg/330px-Some_File.jpg  ->  Some_File.jpg */
function fileFromThumb(url) {
  const parts = url.split("/thumb/");
  if (parts.length < 2) return decodeURIComponent(url.split("/").pop());
  const seg = parts[1].split("/");
  return decodeURIComponent(seg[2] || "");
}

async function api(params) {
  const qs = new URLSearchParams({ format: "json", formatversion: "2", ...params });
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(`${API}?${qs}`, { headers: { "User-Agent": UA } });
      if (r.ok) return await r.json();
    } catch (e) {}
    await sleep(900 * (a + 1));
  }
  return null;
}

/* Bulk downloads get throttled, so back off properly instead of dropping the
   image — a 429 means "later", not "never". */
async function download(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 429 || res.status >= 500) {
      const after = +(res.headers.get("retry-after") || 0);
      await sleep(after ? after * 1000 : 2000 * Math.pow(2, attempt));
      continue;
    }
    throw new Error("HTTP " + res.status);
  }
  throw new Error("HTTP 429 after 5 attempts");
}

/* strip the HTML Wikipedia puts in the Artist field */
function plain(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
             .replace(/&#\d+;/g, "").replace(/\s+/g, " ").trim().slice(0, 90);
}

(async () => {
  if (process.argv.includes("--retry")) {
    let n = 0;
    for (const [k, v] of Object.entries(out)) if (!v || v.err) { delete out[k]; n++; }
    console.log(`retrying ${n} previously failed images`);
  }
  const todo = Object.entries(DETAILS)
    .filter(([t, d]) => d.i && !out[t])
    .slice(0, LIMIT);
  console.log(`${Object.keys(DETAILS).length} events · ${Object.keys(out).length} done · ${todo.length} to try`);

  let kept = 0, skipped = 0, failed = 0;
  for (let i = 0; i < todo.length; i += 10) {
    const batch = todo.slice(i, i + 10);
    const files = batch.map(([, d]) => "File:" + fileFromThumb(d.i));
    const data = await api({
      action: "query", titles: files.join("|"),
      prop: "imageinfo", iiprop: "extmetadata|url", iiurlwidth: String(WIDTH),
    });
    // the API normalizes "File:A_B.jpg" to "File:A B.jpg", so key both sides the same way
    const key = s => s.replace(/_/g, " ");
    const pages = new Map(((data && data.query && data.query.pages) || []).map(p => [key(p.title), p]));

    for (let k = 0; k < batch.length; k++) {
      const [title] = batch[k];
      const page = pages.get(key(files[k]));
      const info = page && page.imageinfo && page.imageinfo[0];
      if (!info) {
        out[title] = { err: page ? "no imageinfo" : "file page not returned: " + files[k] };
        failed++; continue;
      }

      const meta = info.extmetadata || {};
      const licence = (meta.LicenseShortName && meta.LicenseShortName.value) || "";
      if (!isFree(licence)) {
        out[title] = { err: "non-free licence: " + (licence || "(none stated)") };
        skipped++; continue;
      }

      try {
        const buf = await download(info.thumburl || info.url);
        const src = path.join(TMP, "in" + path.extname(new URL(info.thumburl || info.url).pathname));
        const dst = path.join(TMP, "out.webp");
        fs.writeFileSync(src, buf);
        if (fs.existsSync(dst)) fs.unlinkSync(dst);
        execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src,
          "-vf", `scale=${WIDTH}:-2`, "-q:v", String(QUALITY), dst], { stdio: "pipe" });
        out[title] = {
          d: "data:image/webp;base64," + fs.readFileSync(dst).toString("base64"),
          c: plain(meta.Artist && meta.Artist.value),
          l: licence.trim(),
        };
        kept++;
      } catch (e) { out[title] = { err: String(e.message || e).slice(0, 160) }; failed++; }
      await sleep(DELAY);
    }
    fs.writeFileSync(OUT, JSON.stringify(out));
    process.stdout.write(`\r  ${Math.min(i + 10, todo.length)}/${todo.length}  kept ${kept} · non-free ${skipped} · failed ${failed}`);
  }
  console.log("");

  const live = Object.entries(out).filter(([, v]) => v && v.d);
  const bytes = live.reduce((a, [, v]) => a + v.d.length, 0);
  console.log(`${live.length} images embedded, ${(bytes / 1048576).toFixed(2)} MB`);
  console.log(`average ${(bytes / Math.max(1, live.length) / 1024).toFixed(1)} KB`);

  const reasons = {};
  for (const [, v] of Object.entries(out)) if (v && v.err) {
    const why = v.err.replace(/File:.*/, "File: …").replace(/: .*\d.*/, ": …");
    reasons[why] = (reasons[why] || 0) + 1;
  }
  const sorted = Object.entries(reasons).sort((a, b) => b[1] - a[1]);
  if (sorted.length) {
    console.log("\nnot embedded:");
    sorted.forEach(([why, n]) => console.log(`  ${String(n).padStart(4)}  ${why}`));
  }
})();
