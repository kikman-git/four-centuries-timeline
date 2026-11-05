# four-centuries-timeline

Four Centuries is an interactive timeline of 723 world political and economic events, 1600–2026, on a true linear year axis. Built to learn history by browsing it. It is a personal project for one reader, served only on the owner's tailnet, with no accounts and no backend. The axis changes unit as you zoom: centuries across the whole board, then decades, then single years. The vertical stack is pure collision handling — when several events fall in the same span they pile upward, so a tall column is a busy year, and the shape of the whole board is the shape of the record.

## How it works

```text
data/events.js + data/wiki-overrides.js        hand-written sources (in git)
   |  node enrich.js     Wikipedia API, cached in data/wiki-cache.json
   v
data/details.json --- node images.js (Wikimedia + ffmpeg -> WebP data URIs) ---> data/images.json
   |                                                                                   |
   +----------------------------------+------------------------------------------------+
                                      v  node build.js (validates events, fills /*__DATA__*/ in src/app.html)
                     index.html + dist/artifact.html      built; each is one self-contained file
                                      v  serve.py reads index.html per request, 127.0.0.1:18795
                     tailscale serve :8451 -> https://openclaw-vps.tail0d53dc.ts.net:8451/
```

Each event carries two layers: a hand-written one-line "why it matters", and the lead section of the matching Wikipedia article (median ~2,000 characters).

| Path | What it is | In git |
|---|---|---|
| `data/events.js` | the dataset — one object per event, the only thing you normally edit | yes |
| `data/wiki-overrides.js` | hand-checked event → Wikipedia article names, where matching goes wrong | yes |
| `data/details.json` | generated: Wikipedia lead section, short description, link and thumbnail URL per event (1.7 MB) | no |
| `data/images.json` | generated: one licence-filtered image per event, as a WebP data URI (8.6 MB) | no |
| `data/wiki-cache.json` | generated: raw fetch cache, so re-runs cost nothing (1.8 MB) | no |
| `src/app.html` | the app: markup, styles and logic, with a `/*__DATA__*/` placeholder | yes |
| `enrich.js` | resolves each event to an article and pulls its lead section | yes |
| `images.js` | downloads, licence-checks, downscales and embeds one image per event | yes |
| `build.js` | validates the data and inlines everything into two output files | yes |
| `index.html` | built: a complete standalone document (10.4 MB) | no |
| `dist/artifact.html` | built: page content only, for publishing as an Artifact (10.4 MB) | no |
| `serve.py` | standard-library static server for `index.html` on `127.0.0.1:18795` | yes |
| `shot.js` | Playwright screenshots at several zooms, themes and widths | yes |
| `package.json`, `package-lock.json` | one dependency, `playwright`, used by `shot.js` only | yes |

## Setup

- Node 18+ for `build.js`, `enrich.js` and `images.js` (core modules and global `fetch`; v24 on this box), and Python 3 standard library for `serve.py`. None of them needs `npm install`.
- `images.js` also needs `ffmpeg` with the libwebp encoder on `PATH` (6.1 here), and network access to en.wikipedia.org and upload.wikimedia.org (`enrich.js` needs the first).
- `shot.js` only: `npm install` (Playwright ^1.62.1, Node 20+), then `npx playwright install chromium`.
- The generated files are not in git, so a fresh clone regenerates them with the commands below: `enrich.js` first, then `images.js` (it reads `data/details.json`), then `build.js`. The board also works with none of them (`build.js` treats enrichment as optional), just with shorter panels and no pictures.

```bash
node enrich.js                      # resolve + fetch anything not cached
node enrich.js --report             # audit matches without fetching
node enrich.js --refetch "Suez Crisis"
node images.js --width 240 --quality 58   # ~13 KB per image; script defaults are 260 / 62
node images.js --retry              # re-attempt whatever failed
node build.js
```

## Run / deploy

```bash
node build.js                  # regenerate index.html + dist/artifact.html
xdg-open index.html            # or just open the file in a browser
```

`index.html` is fully self-contained — no server, no network, no build step at runtime.

- **<https://openclaw-vps.tail0d53dc.ts.net:8451/>**, and listed on the `/apps` hub under *Life*.
- `timeline.service` (systemd user unit in `~/.config/systemd/user/`, not in this repo: `WorkingDirectory=/home/ubuntu/timeline`, `ExecStart=/usr/bin/python3 /home/ubuntu/timeline/serve.py`, `Restart=always`) runs `serve.py` on `127.0.0.1:18795`. It serves the built `index.html` on every path and reads it per request, so `node build.js` takes effect with no restart. Before the first build it answers 503 "Not built yet".
- The tailscale mapping (:8451 to 127.0.0.1:18795) is registered in `/home/ubuntu/bin/tailscale-serve-apps.sh`. It has to live there: the OpenClaw gateway runs with `tailscale.resetOnExit`, so every gateway restart or reboot wipes all serve mappings. The `tailscale-serve-apps.timer` unit puts them back within three minutes; `systemctl --user start tailscale-serve-apps.service` forces it now.

```bash
systemctl --user status timeline          # is it up
systemctl --user restart timeline
curl -s localhost:18795/healthz           # -> ok
```

Use the full tailnet name — the TLS certificate's only SAN is `openclaw-vps.tail0d53dc.ts.net`, so the MagicDNS short name trips a warning.

## Configuration

- No secrets, no API keys, no `.env`: Wikipedia and Wikimedia are read unauthenticated, so there is no `.env.example`.
- `images.js` flags: `--width` (default 260), `--quality` (62), `--delay` ms (550), `--limit N`, `--retry`. `enrich.js` flags: `--report`, `--refetch "<event title>"`. `shot.js` reads env `OUT` (screenshot directory); its default is a hard-coded `/tmp/claude-1001/…/scratchpad` path from the author's session, so set `OUT` yourself.
- Hard-coded: the `serve.py` port (18795); the Wikipedia User-Agent (`enrich.js:18`, `images.js:19`), which contains a contact email address (Wikimedia asks bots to identify themselves), so put your own there before publishing; scratch files in `/tmp/century-board-img` (`images.js`).

## Data

- In git, hand-written, the sources of truth: `data/events.js` and `data/wiki-overrides.js`. Everything else under `data/` is generated.
- **Not in git** (see `.gitignore`), because each is regenerated from the tracked files plus Wikipedia, is large, and is rewritten on every run: `index.html` and `dist/artifact.html` (10.4 MB each; `node build.js`), `data/details.json` (1.7 MB) and `data/images.json` (8.6 MB) (`node enrich.js`, then `node images.js`), and `data/wiki-cache.json` (1.8 MB, fetch cache). Regenerating needs network access, plus about seven minutes for a full image download; a from-scratch run applies every override.
- **Adding events:** append to `data/events.js`, above the `// __END__` marker, and run `node build.js`. The build refuses to write if anything is malformed (it checks date format, category, region, importance, title and summary, the 1600–2026 year range and duplicate titles).

```js
{d:"1962-10-16", t:"Cuban Missile Crisis", c:"war", i:1, r:"Global",
 s:"Thirteen days of confrontation over Soviet missiles in Cuba…"},
```

- `d` — ISO date at whatever precision is actually established: `1932`, `1918-03` or `1914-07-28`. Don't invent a day you don't have; the axis places year-only events mid-year and the panel prints only what you gave it.
- `c` — `pol` · `war` · `econ` · `shock`
- `i` — `1` landmark, `2` major, `3` notable. Drives mark size, label priority and which events survive the importance filter. Landmarks get the rows nearest the axis.
- `r` — `Global` · `Europe` · `Americas` · `Asia` · `Africa` · `MidEast` · `Oceania`
- `s` — one or two sentences: what happened, and why it mattered.
- Images are filtered to public-domain, CC, GFDL and similar free licences; files with a non-free or unstated licence are skipped rather than guessed at, and the credit line Wikipedia supplies is kept and shown under each picture.
- **Coverage and its limits:** every year 1900–2025 has at least one event and there is no gap longer than eight years anywhere back to 1600 (the longest today is six, 1631 to 1637); 1945 is the deepest year at ten. The seventeenth and eighteenth centuries are genuinely sparser than the twentieth, and the board shows that rather than padding it out. Coverage thins after 2024 and 2026 is empty. What counts as "important", and which of four buckets an event belongs in, are judgement calls — several events could sit in two categories, and the emphasis leans toward events with consequences beyond one country.

## Related

- Listed on the `apps-hub` router page (`/apps`, group *Life*, id `timeline`). It reads nothing from the other apps and shares no data with them; its only outside source is Wikipedia.
- Its serve mapping lives in `/home/ubuntu/bin/tailscale-serve-apps.sh`, shared with every other app on the box.
- The palette check under Gotchas uses `validate_palette.js` from the dataviz skill, which is not in this repo.

## Gotchas

- **Check what the matcher did before trusting it.** Automated matching is confidently wrong a useful fraction of the time — on the first run it sent *"Whatever it takes"* to a Leona Lewis song, *"Nikkei peaks"* to **Eight-thousander**, *"Mugabe ousted"* to **Grace Mugabe** and *"OEEC founded"* to the article on the year **1948**. `enrich.js` prints every match whose article title shares no word with the event, which is where most of those surface; fix them in `data/wiki-overrides.js`, which always wins and skips the year heuristic. Extending the board to 1600 produced a second crop of the same thing: *"French Revolution begins"* → **Brabant Revolution**, *"Bismarck dismissed"* → his **son**, *"Death of Louis XIV"* → a **2016 film**, and two events resolved to bare year articles. 112 events now carry an override (107 are applied, see the next item).
- **A new override only reaches events that are not cached yet.** Cached events never go back through the override lookup, so after adding one run `node enrich.js --refetch "<event title>"`. Five overrides currently have no effect for this reason: *NATO founded*, *Dutch abolish slavery*, *Batavia founded*, *Piet Heyn takes the silver fleet*, *Witwatersrand gold discovered* (whether those override titles resolve was not tested).
- The year check in `enrich.js` is the other thing to watch when you extend the range — it originally only recognised 18xx–20xx years, which silently failed every seventeenth- and eighteenth-century match at once.
- **Rate limits are the thing that will bite you on images.** `upload.wikimedia.org` starts returning 429 after roughly 45 rapid downloads. `images.js` waits `--delay` (550 ms) between files and backs off on 429, which is why a full run takes minutes rather than seconds. Don't lower it.
- **Page weight is mostly pictures, and it is the one real cost here.** Text enrichment costs ~1.4 MB of extract text (`details.json` is 1.7 MB with links and descriptions); 656 images at `--width 240` cost ~8.6 MB more, because the Artifact host blocks external requests and every image has to travel inside the page. The built file is ~10 MB — fine once cached, slow on a first load over a poor connection.
- Images are deliberately narrower than the panel they render in: a mild upscale is a better trade than tripling the download for scanned photographs. To halve the page, re-run everything with `--width 180 --quality 50` (a full re-download, about seven minutes; delete `data/images.json` first, because `images.js` skips every title it already has). To drop images entirely and get back to ~1.9 MB, delete `data/images.json` and rebuild.
- `index.html` is only as fresh as the last `node build.js`: rebuild after every `enrich.js` or `images.js` run.
- **Design notes worth knowing before changing things.**
  - **Only three category hues.** Categorical colour has to survive red–green colour blindness, and marks here can sit next to any other mark, so every *pair* must separate — not just neighbours. Under that test the palette caps out at three hues. `shock` is therefore drawn hollow rather than in a fourth colour. Adding a fifth category means a fifth shape, not a fifth hue.
  - Validate any palette change with the dataviz skill's checker rather than by eye (run it from that skill's directory):
    `node scripts/validate_palette.js "#2a78d6,#eb6834,#1baf7a" --mode light --surface "#f6f7f9" --pairs all`
  - **Orange and aqua sit below 3:1 on the light surface** (2.99:1 and 2.63:1). That is allowed only because the board always offers a readable alternative — direct labels once you zoom in, and the List view. Don't remove the List view.
  - **Rows are packed by importance, then date.** Each row keeps its own occupied intervals in absolute pixel space, so panning never repacks — only zooming and filtering do.
  - **Time is never rescaled.** Empty stretches stay empty and crowded years look crowded; that is the entire point of the horizontal axis.

## License

MIT. See [LICENSE](LICENSE).
