const { chromium } = require("playwright");
const path = require("path");
const OUT = process.env.OUT || path.join(__dirname, "shots");
const url = "file://" + path.join(__dirname, "index.html");

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  async function page(opts) {
    const ctx = await browser.newContext(opts);
    const p = await ctx.newPage();
    p.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
    p.on("pageerror", e => errors.push("pageerror: " + e.message));
    await p.goto(url);
    await p.waitForTimeout(450);
    return p;
  }

  // 1 — default fit, light
  let p = await page({ viewport: { width: 1400, height: 860 } });
  await p.screenshot({ path: `${OUT}/01-fit-light.png` });

  // 2 — zoomed into the 1930s–40s with labels showing
  await p.click("#zxin"); await p.click("#zxin");
  for (let i = 0; i < 4; i++) await p.click("#zyin");
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/02-zoom-labels.png` });

  // 3 — detail panel on a landmark event with a picture and a long background
  await p.evaluate(() => {
    const e = DATA.find(d => d.t === "Cuban Missile Crisis") || DATA[0];
    select(e.id);
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/03-detail.png` });
  await p.evaluate(() => { document.getElementById("d-body").scrollTop = 620; });
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/03b-detail-scrolled.png` });

  // 4 — list view
  await p.click("#d-close");
  await p.click("#listbtn");
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/04-list.png` });

  // 5 — full-text search across the background text
  await p.click("#listbtn");
  await p.click("#fit");
  await p.fill("#q", "famine");
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/05-search.png` });
  const found = await p.evaluate(() => visible.length);
  await p.fill("#q", "");
  await p.waitForTimeout(300);

  const stats = await p.evaluate(() => ({
    rows: rowCount, ppy: +state.ppy.toFixed(2), rowH: state.rowH,
    visible: visible.length, labels: showLabels(),
    plotW: W, rulerW: document.getElementById("rulersvg").clientWidth,
    enriched: Object.keys(DETAILS).length, images: Object.keys(IMAGES).length,
  }));
  stats.searchFamine = found;
  await p.context().close();

  // 6 — dark mode, default view
  p = await page({ viewport: { width: 1400, height: 860 }, colorScheme: "dark" });
  await p.screenshot({ path: `${OUT}/06-dark.png` });
  await p.click("#zxin"); await p.click("#zxin"); await p.click("#zxin");
  for (let i = 0; i < 4; i++) await p.click("#zyin");
  await p.waitForTimeout(250);
  await p.screenshot({ path: `${OUT}/07-dark-zoom.png` });
  await p.context().close();

  // 7 — narrow viewport
  p = await page({ viewport: { width: 620, height: 760 } });
  await p.screenshot({ path: `${OUT}/08-narrow.png` });
  await p.context().close();

  // 8 — the About panel
  p = await page({ viewport: { width: 1400, height: 860 } });
  await p.click("#aboutbtn");
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/09-about.png` });
  await p.context().close();

  await browser.close();
  console.log("stats:", JSON.stringify(stats));
  console.log(errors.length ? "ERRORS:\n  " + errors.join("\n  ") : "no console/page errors");
})();
