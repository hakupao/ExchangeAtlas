# Exchange Atlas — Braun Tactile Instrument UI & Layout Redesign

**Date:** 2026-11-25
**Status:** Draft (pending user approval)

---

## 1. Intent & Why

Exchange Atlas is a bilingual (`zh` / `en`) live FX tracker for 6 currency pairs (`USD/CNY`, `USD/JPY`, `CNY/JPY`, `JPY/CNY`, `AUD/CNY`, `AUD/JPY`) backed by a Cloudflare Worker (Yahoo Finance 15s polling + intraday series) with Frankfurter ECB daily fallback.

The owner checks the site casually from time to time and found the current page rough and template-like:
- An oversized pastel-gradient Hero and 3 static metadata cards push live rates below the fold.
- The 6 rate cards wrap into an awkward 4+2 desktop grid with duplicate rate numbers and redundant "View trend" buttons.
- The chart panel sits far below, requires scrolling, uses an unrefined native `<select>` + wrapping range pills + a redundant "Update chart" CTA, and lacks period summary stats (high/low/change).

**Goal:** Elevate visual craftsmanship and ergonomics into a refined, tactile **Dieter Rams / Braun / Teenage Engineering desktop FX instrument** that presents all 6 live rates, the interactive trend chart, and a quick converter in one cohesive screen—effortless for quick glances, with deliberate industrial-design polish.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Single-screen desktop workbench:** Compact instrument header + 6 tactile channel keys on the left + recessed dot-matrix plotter chart and quick converter deck on the right. Clicking a channel immediately switches the chart and converter in place (no forced scrolling on desktop).
- **Palmtop mobile layout:** Compact header + 2×3 tactile keypad matrix + recessed chart + converter deck, comfortable for one-handed use.
- **Dual-finish theme with one-click toggle:**
  - **Ceramic Ivory (Light)** — warm matte off-white chassis, crisp dark charcoal active keycap, signal-orange LED accents.
  - **Anodized Slate (Dark)** — deep slate-aluminum chassis, warm ivory active keycap, signal-orange LED accents, high-contrast crisp white trend line.
  - Defaults to system `prefers-color-scheme` on first visit; manual toggle in the top bar persists in `localStorage` (`theme`: `"light" | "dark"`).
- **Industrial-design craft & live data precision:**
  - Braun-inspired perforated dot grille motif, subtle chassis bevel and inner highlight, raised/depressed keycap physics, glowing signal-orange active indicator bar, recessed dot-matrix plotter screen.
  - `font-variant-numeric: tabular-nums` on all prices, percentages, and axis/stat numbers to prevent 15s tick jitter.
  - Preserve Google-Finance-style brief green/red tick flash on live updates, 24h `%` change indicator, and honest `CNH` offshore badge/tooltip for CNY pairs.
- **High-signal chart & period summary:**
  - Active channel readout inside the plotter header (`CH-01 · USD → CNY`, large spot rate, 24h delta badge).
  - Recessed physical segmented switch for time ranges (`1d`, `7d`, `30d`, `6m`, `1y`, `3y`).
  - Period summary strip computed from the loaded series: **Period High**, **Period Low**, **Period Change (%)**, and active data source (`Yahoo · ECB` / `Frankfurter`).
  - Dashed horizontal high/low reference lines or crisp grid + crosshair hover inspection.
- **Quick Converter Deck:**
  - Docked directly beneath the chart screen, synced to the currently active currency pair.
  - Bidirectional numeric conversion (editing base updates quote; editing quote updates base) using the latest raw unit rate, plus quick base-amount preset buttons (`100`, `1K`, `10K`).
- **Full bilingual parity (`zh` / `en`)** across all new labels, tooltips, and status messages.

### Non-Goals
- No changes to the Cloudflare Worker (`worker/worker.js`) or external API endpoints.
- No build pipeline, bundler, or JS framework migration (stay vanilla HTML/CSS/JS + Chart.js 4.4.1).
- No changes to the 6 tracked currency pairs (`App.PAIRS`).
- No candlestick/OHLC charts, alerts, or accounts.

### Anti-Goals
- Do **not** flatten into generic grey SaaS cards — tactile bevels, pressed key state, recessed dot-matrix screen, and signal-orange LED indicators are essential to the aesthetic.
- Do **not** break 15s live polling, intraday silent chart updates (`App.updateChart({ live: true })`), or Frankfurter fallback when the Worker is unavailable.
- Do **not** introduce layout jitter during rate ticks or lose keyboard focus visibility / `prefers-reduced-motion` compliance.

---

## 3. Approaches Considered

### Round 1 — Layout & High-Level Direction
1. **A. Editorial Paper Workbench** (compact header + left list + right live chart) — *Chosen layout skeleton*, but initial mockup felt too bare/wireframe-like.
2. **B. Swiss 3×2 Card Grid + Wide Chart** — symmetric scanning, but still vertical-scroll on desktop.
3. **C. Dark Slate Terminal** — high contrast, but narrower appeal as a dark-only look.

### Round 2 — Art Direction on Layout A
1. **A1. Editorial Atlas** (*Financial Times* / *Monocle* serif broadsheet) — strong literary elegance, less tool-like.
2. **A2. Braun Tactile Instrument** (*Dieter Rams* × *Teenage Engineering*) — **Selected by user**, specifically with **dual-finish one-click toggle** (Ceramic Ivory + Anodized Slate) and **keeping the Quick Converter Deck**.
3. **A3. Luminous Aurora Glass** — atmospheric dark glass, less crisp/instrument-like.

---

## 4. Detailed Design Specification

### 4.1 Layout & Responsive Structure

**Outer Page Frame:**
- Centered desktop instrument chassis (`max-width: 1180px`) resting on a subtle matte desk surface (`--desk`) with comfortable outer breathing room.
- Compact honest footer sits cleanly outside and below the chassis: live/history data source attribution, CNH offshore note, and GitHub link.

**Instrument Top Bar (inside chassis):**
- **Left:** 4×3 perforated Braun dot grille motif + `EXCHANGE ATLAS` monospace wordmark + subtle localized subtitle (`汇率观测仪 · FX-06` / `FX MONITOR · FX-06`).
- **Right:**
  - Recessed live-status pill with signal-orange LED + live timestamp (`15S LIVE · HH:MM:SS`, or fallback/error indicator when applicable).
  - Tactile hardware buttons:
    1. Manual Refresh (`↻`) with subtle spin feedback while loading.
    2. Theme Finish Toggle (`☀` / `☾` icon + accessible label) switching `data-theme="light" | "dark"` on `<html>`.
    3. Language Toggle (`中文` / `EN`) — either compact segmented pill or single toggle button; **design call:** compact two-button segmented switch (`中` | `EN`) matching the hardware switch aesthetic while preserving explicit active state and `aria-pressed`.

**Main Workbench Body:**
- **Desktop (`>= 960px`):** Two-column grid: `300px` left channel column + `minmax(0, 1fr)` right display column, `16px` gap. Entire instrument (header + 6 keys + chart + converter) fits comfortably within a standard `1440×900` / `1280×800` viewport without scrolling.
- **Tablet (`640px – 959px`):** Single-column chassis stack: 6 channel keys arranged in a symmetric **3×2 grid** above the plotter screen and converter deck.
- **Mobile (`< 640px`):** Tight outer padding; 6 channel keys arranged in a **2×3 palmtop calculator keypad** above the plotter screen and converter deck. Compact header wraps cleanly without overflow.

### 4.2 Left Column: 6 Tactile Channel Keys
- Rendered as `<button type="button" class="channel-key">` elements inside `role="listbox"` or `role="group"` (no nested buttons, entire key is the click target; removes the old redundant "View trend" button and removes the `<select id="pairSelect">` dropdown).
- Each key displays:
  - Vertical LED indicator bar on the left edge (muted slot when inactive; glowing `--accent-orange` when active).
  - Top-left: Pair code (`USD → CNY`, or `100 JPY → CNY` for `JPY_CNY`) + compact `CNH` badge with native `title` tooltip on CNY pairs.
  - Bottom-left: Localized pair name (e.g. `美元兑人民币` / `US Dollar / Yuan`) or concise status (`休市中` / `Base date` only when fallback/closed).
  - Top-right: Tabular spot rate (`#rate-<id>`), retaining green/red tick flash animation (`.up` / `.down`).
  - Bottom-right: 24h percentage change (`▲ +0.18%` / `▼ -0.11%`), hidden gracefully if unavailable (e.g. Frankfurter fallback).
- **Physical states:**
  - Default: raised subtle vertical gradient + 2px bottom key ledge (`--key-ledge`) + 1px top highlight.
  - Hover: subtle signal-orange border tint.
  - Active (`.active`, `aria-pressed="true"`): inverted high-contrast keycap (dark charcoal in Light mode; warm ivory in Dark mode), `translateY(1.5px)` physically depressed with inset shadow, glowing orange LED bar.

### 4.3 Right Column Top: Recessed Plotter Screen
- Recessed container (`inset` shadow, 1px hairline border, 16px subtle coordinate dot-matrix background `--screen-dot`).
- **Screen Header:**
  - Left:
    - Channel identifier line: `CH-01 · USD → CNY · CNH OFFSHORE` (or `SPOT` for non-CNY pairs; localized cleanly).
    - Large monospace spot price synced with the active pair's latest live quote (flashes on tick too!) + 24h delta pill.
    - Subtle date/range meta line (`近30天 · 2026-02-25 至 2026-03-26`).
  - Right:
    - Recessed range switch well (`.range-well`) holding all 6 range buttons (`1d`, `7d`, `30d`, `6m`, `1y`, `3y`) on a single crisp row (wrapping neatly only on very narrow screens). Active range button uses `--accent-orange` fill with white text.
    - Removes the old redundant orange "Update chart" CTA button (selecting a pair or range already updates the chart automatically, and the top bar has manual Refresh).
- **Chart Canvas (`Chart.js 4.4.1`):**
  - Theme-aware rendering: reads live CSS custom properties (`getComputedStyle(document.documentElement)`) for line color (`--chart-line`), area gradient (`--chart-fill-top`), grid lines (`--chart-grid`), tick text (`--chart-tick`), crosshair (`--chart-crosshair`), and tooltip surface.
  - On theme toggle, immediately updates Chart.js colors (`App.applyChartTheme()` or re-renders with cached last series) **without** re-fetching network data.
  - Keep existing `crosshairPlugin`; enhance with subtle dashed high/low reference lines or clean horizontal grid + custom high-contrast monospace tooltip.
- **Screen Footer / Period Stats Strip:**
  - Separated by a dashed hairline (`1px dashed var(--screen-border)`).
  - Displays values computed directly from the currently loaded `values` array:
    - **Period High** (`区间高` / `HIGH`): `Math.max(...values)` formatted via `App.formatRate`.
    - **Period Low** (`区间低` / `LOW`): `Math.min(...values)` formatted via `App.formatRate`.
    - **Period Change** (`区间涨跌` / `DELTA`): `((last - first) / first) * 100` colored up/down.
    - Inline subtle status slot (`#chartStatus`) for loading/error/empty messages without jarring layout jumps.

### 4.4 Right Column Bottom: Quick Converter Deck
- Recessed mechanical tray directly below the plotter screen.
- **Controls:**
  - Label (`换算` / `CONVERT`).
  - Base amount input (`<input type="number" inputmode="decimal">`) + base currency code (`USD`, `JPY`, etc.).
  - Visual exchange icon (`⇄`) in `--accent-orange`.
  - Quote amount input (`<input type="number" inputmode="decimal">`) + quote currency code (`CNY`, `JPY`, etc.).
  - Quick base-amount preset buttons: `100`, `1K`, `10K` (clicking sets base amount and recalculates quote).
- **Calculation Accuracy (Important Edge Case):**
  - Always compute from the **raw 1-unit rate** stored in `App.lastRates[pair.id]` (e.g., for `JPY_CNY`, raw rate is `~0.04329`, whereas card display scales by `100`).
  - Thus typing `100` JPY yields `4.33` CNY, and `10000` JPY yields `432.90` CNY — mathematically exact regardless of display scaling.
  - **Default base amount on pair switch (our call):** Keep the user's typed base amount across pair switches if they edited it; otherwise default to `100` (and `1000` or `10000` for `JPY_CNY`? Simpler & predictable: default `100` on initial load, with `100 / 1K / 10K` one tap away).
  - When live rates tick every 15s, re-evaluate whichever side was last edited so the readout stays live without overwriting the field the user is actively typing in.
  - While initial live rates are still loading (`App.lastRates[pair.id]` unset), show placeholder `--` in the computed box.

### 4.5 Theme Tokens & Typography
- **Fonts (Google Fonts):**
  - Monospace (data, codes, prices, labels): `"IBM Plex Mono"`
  - Geometric Sans + CJK: `"Space Grotesk"`, `"Noto Sans SC"`
  - Drop unused `"ZCOOL XiaoWei"` to save font download weight.
- **Color Palettes:**
  - **Ceramic Ivory (`data-theme="light"`):**
    - Desk `#dbd9d2`, Chassis `#eeede7`→`#e3e2db`, Key `#f9f8f4`→`#ecebe5`, Active Key `#1e2024` (ink `#f4f3ef`), Screen `#f8f8f3` (dot `#d6d5cc`), Ink `#1a1b1e`, Muted `#64655f`, Signal Orange `#ea4c1f`, Up `#15803d` (`#4ade80` on dark key), Down `#c8322b` (`#f87171` on dark key).
  - **Anodized Slate (`data-theme="dark"`):**
    - Desk `#111317`, Chassis `#23262c`→`#1b1e23`, Key `#2b2f37`→`#24272e`, Active Key `#f0efe9` (ink `#17181b`), Screen `#12151a` (dot `#232833`), Ink `#f1f2f4`, Muted `#9499a3`, Signal Orange `#ff5a2a`, Up `#4ade80` (`#15803d` on light key), Down `#f87171` (`#c8322b` on light key).
- **No flash of wrong theme (FOUC):** Add a tiny inline `<script>` in `<head>` before `styles.css` to read `localStorage.getItem("theme")` (falling back to `matchMedia("(prefers-color-scheme: dark)")`) and set `document.documentElement.dataset.theme` immediately before first paint.

### 4.6 Files Affected & Architecture
- [index.html](file:///Volumes/DevSSD/Project/ExchangeAtlas/index.html) — New single-chassis instrument markup, inline theme bootstrap script, updated Google Fonts (`IBM Plex Mono`, `Space Grotesk`, `Noto Sans SC`), bumped asset version query string.
- [styles.css](file:///Volumes/DevSSD/Project/ExchangeAtlas/styles.css) — Full rewrite with dual-finish CSS custom properties (`[data-theme="light"]` / `[data-theme="dark"]`), tactile keycaps, Braun grille, recessed dot-matrix screen, converter deck, responsive breakpoints, focus-visible rings, and `prefers-reduced-motion`.
- [app.core.js](file:///Volumes/DevSSD/Project/ExchangeAtlas/app.core.js) — Add `theme`, `lastQuotes`, `lastChartSeries`, `converter` state fields; update `App.dom` bindings; add pair channel metadata (`ch`, localized names via i18n).
- [app.i18n.js](file:///Volumes/DevSSD/Project/ExchangeAtlas/app.i18n.js) — Add bilingual strings for pair display names, theme toggle, period stats (`high`, `low`, `delta`), converter (`convert`, presets, aria labels), and instrument header/status; remove obsolete Hero metric copy.
- [app.rates.js](file:///Volumes/DevSSD/Project/ExchangeAtlas/app.rates.js) — Render 6 tactile `<button class="channel-key">` elements, manage active channel highlight (`App.syncActiveChannel()`), update active screen spot readout & 24h delta + live converter refresh on every 15s tick, preserve Worker → Frankfurter fallback and tick flash.
- [app.chart.js](file:///Volumes/DevSSD/Project/ExchangeAtlas/app.chart.js) — Cache latest `{ labels, values, pair }` for instant theme re-coloring (`App.applyChartTheme()`), compute & render period high/low/delta stats, theme-aware Chart.js colors & refined monospace tooltips.
- [app.controls.js](file:///Volumes/DevSSD/Project/ExchangeAtlas/app.controls.js) — Wire channel selection (no forced scroll on desktop; gentle scroll to screen only on narrow mobile if screen is out of view), range buttons, refresh button, theme toggle with `localStorage` persistence, and bidirectional converter input/preset listeners.
- [app.js](file:///Volumes/DevSSD/Project/ExchangeAtlas/app.js) — Initialize theme toggle, converter, channel keys, controls, i18n, polling loop (unchanged 15s cadence + intraday live chart extension).
- [.gitignore](file:///Volumes/DevSSD/Project/ExchangeAtlas/.gitignore) — Add `.superpowers/` so brainstorm session artifacts stay untracked (our call).

---

## 5. Calls Made by Designer (Verify or Override)
1. **Language switcher:** Compact 2-button hardware switch (`中` | `EN`) in the top bar (keeps explicit state vs a single ambiguous button).
2. **Converter behavior:** Bidirectional editing (type in either base or quote box) + `100` / `1K` / `10K` quick base presets, defaulting to `100` on load.
3. **Scroll behavior on channel click:** Instant in-place switch on desktop (no scroll); on narrow mobile screens, only scroll smoothly if the plotter screen is not visible.
4. **Git hygiene:** Add `.superpowers/` to `.gitignore`.

## 6. Left to the Builder
- Exact CSS bevel gradients, shadow blur radii, and micro-transition curves (following the approved A2 interactive prototype).
- Chart.js tooltip padding, border styling, and dashed high/low reference line plugin tuning.
- Consulting `modern-web-guidance` for modern CSS color-scheme, dark mode, accessibility, and responsive layout standards during implementation.
- Real browser verification across Desktop (`1440×900`), Mobile (`390×844`), Light & Dark finishes, and `zh` & `en` locales, checking live data rendering, tick updates, chart switching, and converter math.
