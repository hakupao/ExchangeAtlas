# Exchange Atlas Braun Tactile Instrument Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Exchange Atlas into a single-screen Dieter Rams / Braun tactile FX instrument featuring a dual-finish (Ceramic Ivory / Anodized Slate) one-click theme toggle, 6 mechanical channel keys, a recessed dot-matrix plotter chart with period high/low/delta stats, and a bidirectional quick currency converter.

**Architecture:** Preserve the existing zero-build vanilla HTML/CSS/JS + Chart.js 4.4.1 modular script architecture (`window.ExchangeApp`) and Cloudflare Worker / Frankfurter API logic. Extract pure logic helpers (theme state machine, period stats, bidirectional currency conversion) onto `window.ExchangeApp` so Node's built-in `node:test` runner can unit-test them directly without adding dependencies, while CSS custom properties + `<meta name="color-scheme">` drive both UI finishes and Chart.js canvas styling.

**Tech Stack:** Vanilla HTML5, Modern CSS (`color-scheme`, `light-dark()` with `prefers-color-scheme` fallback, CSS Grid, `tabular-nums`), Vanilla ES6+ JS, Chart.js 4.4.1 (CDN), Node.js built-in `node:test` (v26) for unit verification.

**Spec:** `docs/superpowers/specs/2026-11-25-braun-instrument-redesign-design.md`

## Global Constraints

- Stay vanilla HTML/CSS/JS with no build step, bundler, or framework migration; keep Chart.js 4.4.1 CDN.
- Do not modify `worker/worker.js`, `App.LIVE_API_BASE`, `App.API_BASE`, or the 6 currency pairs in `App.PAIRS`.
- Preserve 15s live polling, silent intraday chart extension (`App.updateChart({ live: true })`), and automatic Frankfurter fallback.
- Full bilingual parity (`zh` and `en`) persisted via `localStorage["lang"]`; keep honest `CNH` offshore labels/tooltips and footer disclaimers.
- Use `<meta name="color-scheme" content="light dark">` + `:root { color-scheme: light dark; }` mapped back via `:has(> head > meta[name="color-scheme"][content="..."])`, with an inline non-deferred FOUC-prevention script in `<head>` reading `localStorage["color-scheme"]`.
- Two-state theme toggle: toggling back to match the OS preference removes `localStorage["color-scheme"]` and resets `<meta>` to `"light dark"`; listen to both `window` `storage` and `matchMedia("(prefers-color-scheme: dark)")` `change` events.
- Enforce `font-variant-numeric: tabular-nums` on all numeric readouts, WCAG AA contrast + non-color trend markers (`▲`/`▼`), `@media (forced-colors: active)` boundary support, and `@media (prefers-reduced-motion: reduce)`.
- Bump asset cache-busting query strings in `index.html` (e.g. `?v=20261125a`).

## Review Focus

- **`JPY_CNY` unit-rate scaling in converter:** Card displays `100 JPY → CNY` (`~4.33`), but the quick converter must calculate from the raw 1-unit rate (`~0.04329`) so `100 JPY = 4.33 CNY` and `10000 JPY = 432.90 CNY` (pinned in Task 1 & Task 5 tests).
- **Empty, zero, negative, or malformed converter input + live tick preservation:** Clearing an input or entering invalid/negative values must never render `NaN` or `Infinity`, and a 15s live tick must only update the opposite field—never overwrite the field the user is typing in (pinned in Task 1 & Task 5 tests).
- **Theme toggle OS-revert & Chart.js synchronization:** Clicking toggle when target matches OS must remove `localStorage["color-scheme"]` and reset `<meta>` to `"light dark"`; OS or cross-tab theme changes must re-color Chart.js cleanly without refetching or throwing if the chart isn't initialized yet (pinned in Task 1, Task 4, Task 5 tests).
- **Frankfurter fallback (`prev: null`) & missing quotes:** When Worker fails and Frankfurter returns daily rates without `prev`, 24h delta badges must hide cleanly, channel meta shows base date, and `App.lastRates` still populates for the converter (pinned in Task 3 tests).
- **Empty, single-point, or flat chart series:** `computePeriodStats` must return `null` for empty/non-numeric series and `0` delta for flat/single-point or zero-baseline series without `NaN`/`Infinity` (pinned in Task 1 & Task 4 tests).

---

## File Map

| File | Responsibility |
|---|---|
| `.gitignore` | Add `.superpowers/` to ignore brainstorm artifacts |
| `tests/app.logic.test.mjs` | Zero-dependency `node:test` unit suite for core pure helpers, i18n parity, period stats, theme state machine, and converter math |
| `app.core.js` | Pair channel metadata (`ch`), extended state (`lastQuotes`, `lastChartData`, `converter`), updated `App.dom` bindings, pure helpers (`computePeriodStats`, `convertAmount`, `resolveThemeToggle`, `getEffectiveTheme`) |
| `app.i18n.js` | Bilingual (`zh`/`en`) strings for instrument header, pair names, theme toggle, period stats, converter deck, and footer |
| `index.html` | `<meta name="color-scheme">` + inline FOUC script, Google Fonts (`IBM Plex Mono`, `Space Grotesk`, `Noto Sans SC`), single-chassis Braun instrument HTML structure, bumped `?v=20261125a` |
| `styles.css` | Dual-finish Ceramic Ivory & Anodized Slate CSS tokens, Braun dot grille, tactile raised/depressed channel keys, recessed dot-matrix plotter screen, quick converter deck, responsive Desktop/Tablet/Mobile breakpoints, focus/forced-colors/reduced-motion rules |
| `app.rates.js` | Render 6 `<button class="channel-key">` keys, `App.syncActiveChannel()`, `App.renderActiveReadout()`, tick flash on active key + screen price, converter refresh on live tick |
| `app.chart.js` | Cache latest chart payload, theme-aware Chart.js palette reading CSS custom properties, `App.applyChartTheme()`, dashed high/low reference plugin, period stats DOM rendering |
| `app.controls.js` | Channel switching (in-place on desktop, gentle scroll on mobile if needed), range buttons, refresh button loading state, two-state theme toggle + OS/storage sync, bidirectional converter + `100/1K/10K` presets |
| `app.js` | Updated initialization sequence wiring theme, keys, controls, converter, i18n, live polling |

---

### Task 1: Core Pure Logic, Pair Metadata, i18n Parity & `.gitignore`

**Files:**
- Modify: `.gitignore`
- Modify: `app.core.js`
- Modify: `app.i18n.js`
- Create: `tests/app.logic.test.mjs`

**Interfaces:**
- Produces on `window.ExchangeApp`:
  - `App.PAIRS`: each entry adds `ch` (`"CH-01"` .. `"CH-06"`).
  - `App.state`: `{ chartPairId: "USD_CNY", rangeId: "30d", chart: null, chartKey: null, lastChartData: null, lastQuotes: {}, language: "zh", converter: { side: "base", baseAmount: "100", quoteAmount: "" } }`
  - `App.dom`: updated element references (`lastUpdated`, `liveStatus`, `ratesGrid`, `refreshBtn`, `themeToggle`, `langSwitch`, `langButtons`, `rangeButtons`, `screenChannel`, `screenPrice`, `screenDelta`, `chartMeta`, `chartStatus`, `statHigh`, `statLow`, `statDelta`, `statSource`, `convBaseInput`, `convQuoteInput`, `convBaseCode`, `convQuoteCode`, `convPresets`).
  - `App.computePeriodStats(values: number[]) -> { high: number, low: number, pctChange: number } | null`
  - `App.convertAmount(amount: number, rawUnitRate: number, direction: "baseToQuote" | "quoteToBase") -> number | null`
  - `App.resolveThemeToggle(storedOverride: "light" | "dark" | null, systemPrefersDark: boolean) -> { nextStored: "light" | "dark" | null, metaContent: "light dark" | "light" | "dark", effective: "light" | "dark" }`
  - `App.getEffectiveTheme(metaContent: string, systemPrefersDark: boolean) -> "light" | "dark"`
  - `App.I18N.zh` and `App.I18N.en` with matching key trees including `pairs.<id>`, `instrument.*`, `theme.*`, `stats.*`, `converter.*`.

- [ ] **Step 1: Write failing unit tests in `tests/app.logic.test.mjs`**

Create a Node `node:test` harness that evaluates `app.core.js` and `app.i18n.js` in a minimal `vm` sandbox (`window`, `document`, `navigator`, `localStorage`) and asserts:
- `App.PAIRS` has 6 items with `ch` `"CH-01"`..`"CH-06"`.
- `App.computePeriodStats([6.86, 6.93, 6.91])` returns `{ high: 6.93, low: 6.86, pctChange: ((6.91 - 6.86) / 6.86) * 100 }`; returns `null` for `[]` and returns `{ high: 7, low: 7, pctChange: 0 }` for `[7]` or `[0, 5]`.
- `App.convertAmount(100, 0.04329, "baseToQuote")` ≈ `4.329` (pins `JPY_CNY` unit-rate accuracy); `App.convertAmount(691.02, 6.9102, "quoteToBase")` ≈ `100`; returns `null` for `NaN`, `-1`, `0` rate, or non-finite inputs, and `0` for amount `0`.
- `App.resolveThemeToggle(null, false)` -> `{ nextStored: "dark", metaContent: "dark", effective: "dark" }`; `App.resolveThemeToggle("dark", false)` -> `{ nextStored: null, metaContent: "light dark", effective: "light" }` (reverts to system!); `App.resolveThemeToggle("dark", true)` -> `{ nextStored: "light", metaContent: "light", effective: "light" }`; `App.resolveThemeToggle("light", true)` -> `{ nextStored: null, metaContent: "light dark", effective: "dark" }`.
- `App.I18N.zh` and `App.I18N.en` have identical flattened key sets, including all 6 `pairs.<id>` keys and `converter`, `stats`, `theme` keys.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/app.logic.test.mjs`
Expected: FAIL because `computePeriodStats`, `convertAmount`, `resolveThemeToggle`, `ch`, and new i18n keys do not exist yet.

- [ ] **Step 3: Update `.gitignore`, `app.core.js`, and `app.i18n.js`**

- Add `.superpowers/` to `.gitignore`.
- Update `app.core.js` with `ch` on `App.PAIRS`, extended `App.state`, updated `App.dom` selectors, and implement `App.computePeriodStats`, `App.convertAmount`, `App.getEffectiveTheme`, and `App.resolveThemeToggle`.
- Update `app.i18n.js` with complete bilingual dictionaries for the Braun instrument UI (`instrument`, `pairs`, `theme`, `stats`, `converter`, `card`, `status`, `range`, `chart`, `footer`, `language`), keeping `applyTranslations()` able to update both `textContent` (`data-i18n`) and `title`/`aria-label` (`data-i18n-title`, `data-i18n-aria`) cleanly.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/app.logic.test.mjs`
Expected: PASS (all assertions green).

- [ ] **Step 5: Commit**

```bash
git add .gitignore app.core.js app.i18n.js tests/app.logic.test.mjs
git commit -m "feat: add instrument core helpers, i18n strings, and logic tests"
```

---

### Task 2: Braun Instrument HTML Structure & Dual-Finish CSS System

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `tests/app.logic.test.mjs` (add DOM/markup contract test checking all required IDs, `<meta name="color-scheme">`, and FOUC inline script exist in `index.html`)

**Interfaces:**
- Consumes: `App.dom` IDs and `data-i18n` keys from Task 1.
- Produces:
  - Semantic HTML IDs in `index.html`: `lastUpdated`, `liveStatus`, `ratesGrid`, `refreshRates`, `themeToggle`, `langSwitch`, `rangeButtons`, `screenChannel`, `screenPrice`, `screenDelta`, `chartMeta`, `chartStatus`, `rateChart`, `statHigh`, `statLow`, `statDelta`, `statSource`, `convBaseInput`, `convQuoteInput`, `convBaseCode`, `convQuoteCode`, `convPresets`.
  - CSS theme tokens on `:root` for both Ceramic Ivory (`light`) and Anodized Slate (`dark`), including `--chart-line`, `--chart-fill-top`, `--chart-fill-bottom`, `--chart-grid`, `--chart-tick`, `--chart-crosshair`, `--chart-ref-line`, `--chart-tooltip-bg`, `--chart-tooltip-border`, `--chart-tooltip-ink`, `--accent-orange` for Chart.js consumption in Task 4.

- [ ] **Step 1: Add HTML/CSS contract assertions to `tests/app.logic.test.mjs`**

Assert `index.html` contains `<meta name="color-scheme" content="light dark">`, an inline non-deferred script immediately after `<meta name="color-scheme">` referencing `localStorage.getItem("color-scheme")`, Google Fonts for `IBM Plex Mono`, `Space Grotesk`, `Noto Sans SC`, and every required DOM ID (`ratesGrid`, `themeToggle`, `screenChannel`, `screenPrice`, `screenDelta`, `statHigh`, `statLow`, `statDelta`, `convBaseInput`, `convQuoteInput`, `convPresets`, `rateChart`), and assert `styles.css` defines `color-scheme: light dark`, `:has(> head > meta[name="color-scheme"][content="dark"])`, `tabular-nums`, `@media (forced-colors: active)`, and `@media (prefers-reduced-motion: reduce)`.

- [ ] **Step 2: Run tests to verify the new contract test fails**

Run: `node --test tests/app.logic.test.mjs`
Expected: FAIL on missing new HTML IDs and CSS rules.

- [ ] **Step 3: Rewrite `index.html` and `styles.css`**

- **`index.html`**:
  - Place `<meta name="color-scheme" content="light dark">` in `<head>` followed immediately by a minimal inline `<script>` inside `try/catch` applying `localStorage.getItem("color-scheme") ?? "light dark"` to the `<meta>` tag (prevents FOUC; no `defer`/`type="module"`).
  - Load `IBM Plex Mono`, `Space Grotesk`, `Noto Sans SC` from Google Fonts; bump script/CSS query strings to `?v=20261125a`.
  - Build the single-chassis Braun instrument layout:
    - `<main class="instrument-desk">` -> `<div class="instrument-chassis">`
    - `<header class="inst-topbar">`: 4×3 Braun perforated dot grille (`aria-hidden="true"`), `EXCHANGE ATLAS` + localized subtitle, recessed live status LED pill (`#lastUpdated` + `#liveStatus`), hardware refresh button (`#refreshRates`), dual-finish theme toggle (`#themeToggle` containing both light/dark icons & visually hidden labels branched via CSS), compact 2-button language segmented switch (`#langSwitch`).
    - `<div class="inst-workbench">`:
      - `<section class="channels-panel">`: `<div class="channel-list" id="ratesGrid" role="group">`
      - `<section class="stage-panel">`:
        - Recessed plotter screen (`.plotter-screen`): header (`#screenChannel`, `#screenPrice`, `#screenDelta`, `#chartMeta`, `#rangeButtons`), `.chart-wrap` (`<canvas id="rateChart">`), dashed footer strip (`#statHigh`, `#statLow`, `#statDelta`, `#statSource`, `#chartStatus`).
        - Quick Converter Deck (`.converter-deck`): label, base input box (`#convBaseInput` + `#convBaseCode`), `⇄`, quote input box (`#convQuoteInput` + `#convQuoteCode`), preset buttons (`#convPresets` with `data-amount="100"`, `"1000"`, `"10000"`).
    - Compact `<footer class="site-footer">` outside the chassis with existing data-source, CNH note, and GitHub link.
- **`styles.css`**:
  - Implement `:root { color-scheme: light dark; }` with raw `--light-*` and `--dark-*` color variables, `@media (prefers-color-scheme: dark)` fallback, `@supports (color: light-dark(white, black))` dynamic tokens, and `:root:has(> head > meta[name="color-scheme"][content="dark"])` / `[content="light"]` overrides (also matching non-color styling such as shadow opacity and theme toggle icon visibility).
  - Style Ceramic Ivory & Anodized Slate chassis bevels, 4×3 Braun dot grille, raised/depressed mechanical `.channel-key` buttons with glowing signal-orange vertical LED bar, recessed 16px dot-matrix `.plotter-screen`, recessed `.range-well` switch, `.converter-deck`, tick flash animations (`.up`/`.down`), desktop (`>= 960px` two-column `300px 1fr`), tablet (`640px–959px` 3×2 keypad), and mobile (`< 640px` 2×3 palmtop keypad) responsive layouts.
  - Ensure `font-variant-numeric: tabular-nums` on all prices/deltas/stats/inputs, strong `:focus-visible` outlines, `@media (forced-colors: active)` border/outline fallbacks, and `@media (prefers-reduced-motion: reduce)`.

- [ ] **Step 4: Run tests to verify contract passes**

Run: `node --test tests/app.logic.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css tests/app.logic.test.mjs
git commit -m "feat: build Braun dual-finish instrument HTML and CSS layout"
```

---

### Task 3: Tactile Channel Keys, Live Rate Rendering & Active Screen Readout

**Files:**
- Modify: `app.rates.js`
- Modify: `tests/app.logic.test.mjs`

**Interfaces:**
- Consumes: `App.PAIRS`, `App.dom`, `App.state`, `App.t`, `App.formatRate`, `App.scaleRateForDisplay`, `App.isOffshorePair` (Task 1); `.channel-key` markup contract (Task 2); `App.setChartPair` & `App.refreshConverterFromRate` (optional calls guarded by `typeof ... === "function"`).
- Produces on `window.ExchangeApp`:
  - `App.setupRateCards()` — renders 6 `<button type="button" class="channel-key" data-pair="...">` items and binds click to `App.setChartPair(pair.id)`.
  - `App.syncActiveChannel()` — toggles `.active` and `aria-pressed` on the 6 channel keys to match `App.state.chartPairId`.
  - `App.renderActiveReadout(opts?: { flashDirection?: "up" | "down" | null })` — updates `#screenChannel`, `#screenPrice`, and `#screenDelta` for `App.state.chartPairId` from `App.state.lastQuotes`.
  - `App.renderLiveRates(data)` — updates all 6 keys, caches `App.state.lastQuotes[pair.id]`, populates `App.lastRates[pair.id]`, updates active screen readout & refreshes converter.

- [ ] **Step 1: Add unit tests for `renderLiveRates` (Worker + Frankfurter fallback) and `syncActiveChannel` in `tests/app.logic.test.mjs`**

Test in `vm` with lightweight stub DOM elements:
- Worker payload with `prev`: updates `#rate-USD_CNY` text, shows 24h delta `▲ +...%`, populates `App.lastRates.USD_CNY` and `App.state.lastQuotes.USD_CNY`, updates `#screenPrice` and `#screenDelta` for active pair.
- Frankfurter fallback payload (`prev: null`, `date: "2026-11-24"`): hides 24h delta element, renders base date on key meta, still populates `App.lastRates.JPY_CNY` (unscaled raw rate) so converter works.

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `node --test tests/app.logic.test.mjs`
Expected: FAIL on missing `syncActiveChannel` / `renderActiveReadout` / `lastQuotes`.

- [ ] **Step 3: Update `app.rates.js`**

- Build 6 `<button type="button" class="channel-key">` elements with LED indicator bar, pair code (`100 JPY → CNY` when scaled), `CNH` badge + tooltip on CNY pairs, localized pair name (`App.t("pairs." + pair.id)`), tabular rate value, and 24h delta / base-date meta.
- Implement `App.syncActiveChannel()` and `App.renderActiveReadout(opts)`.
- Update `App.renderLiveRates(data)` to cache each quote in `App.state.lastQuotes[pair.id]`, flash changed rates on both the channel key and (if active) `#screenPrice`, update `#statSource` / `#lastUpdated`, and call `App.refreshConverterFromRate?.()`.
- Ensure `App.updateLiveRates()` toggles a `.is-loading` state on `#refreshRates` while fetching and preserves Worker → Frankfurter fallback.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/app.logic.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app.rates.js tests/app.logic.test.mjs
git commit -m "feat: implement tactile channel keys and active screen live readout"
```

---

### Task 4: Theme-Aware Plotter Chart & Period High/Low/Delta Stats

**Files:**
- Modify: `app.chart.js`
- Modify: `tests/app.logic.test.mjs`

**Interfaces:**
- Consumes: `App.computePeriodStats`, `App.formatRate`, `App.formatAxisTick`, `App.dom`, `App.state` (Task 1); `--chart-*` CSS custom properties (Task 2).
- Produces on `window.ExchangeApp`:
  - `App.renderPeriodStats(values: number[], sourceLabel?: string)` — renders `#statHigh`, `#statLow`, `#statDelta` (with `.up`/`.down` classes and `▲`/`▼` prefix), and `#statSource`.
  - `App.applyChartTheme()` — reads computed CSS custom properties from `document.documentElement` and updates the live Chart.js instance (line color, area gradient, grid, axis ticks, crosshair, high/low reference lines, tooltip colors) in place with `chart.update("none")` without refetching; safely no-ops when `App.state.chart` is null.
  - `App.renderChart(labels, values, pair)` — stores `App.state.lastChartData = { labels, values, pair }` and draws using current theme tokens + crosshair + subtle high/low dashed reference lines.

- [ ] **Step 1: Add unit tests for `renderPeriodStats` and `applyChartTheme` no-op safety in `tests/app.logic.test.mjs`**

Assert:
- `App.renderPeriodStats([6.8615, 6.934, 6.9102])` populates `#statHigh` (`"6.934"`), `#statLow` (`"6.8615"`), `#statDelta` containing `▲` and `+0.71%` with class `up`.
- `App.renderPeriodStats([])` resets high/low/delta to `"--"`.
- `App.applyChartTheme()` does not throw when `App.state.chart === null`.

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `node --test tests/app.logic.test.mjs`
Expected: FAIL because `renderPeriodStats` and `applyChartTheme` do not exist yet.

- [ ] **Step 3: Update `app.chart.js`**

- Add `getChartThemeTokens()` reading computed CSS variables (`--chart-line`, `--chart-fill-top`, `--chart-fill-bottom`, `--chart-grid`, `--chart-tick`, `--chart-crosshair`, `--chart-ref-line`, `--chart-tooltip-bg`, `--chart-tooltip-border`, `--chart-tooltip-ink`, `--accent-orange`) with sensible fallbacks.
- Add lightweight `highLowRefPlugin` drawing subtle dashed horizontal lines at period max and min inside `chartArea`.
- Update `App.renderChart()` to use `IBM Plex Mono` ticks, theme-aware tooltips, vertical area gradient, signal-orange hover point, and save `App.state.lastChartData`.
- Implement `App.applyChartTheme()` and `App.renderPeriodStats(values, source)`.
- Update `App.updateChart({ live })` to call `App.renderPeriodStats(result.values, result.source)` on both initial draw and silent intraday live updates, and preserve `App.renderActiveReadout?.()` sync on pair switch.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/app.logic.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app.chart.js tests/app.logic.test.mjs
git commit -m "feat: add theme-aware plotter chart and period high-low-delta stats"
```

---

### Task 5: Controls, Dual-Finish Theme Toggle, Bidirectional Converter & Boot Sequence

**Files:**
- Modify: `app.controls.js`
- Modify: `app.js`
- Modify: `tests/app.logic.test.mjs`

**Interfaces:**
- Consumes: `App.resolveThemeToggle`, `App.getEffectiveTheme`, `App.convertAmount`, `App.state`, `App.dom` (Task 1); `App.syncActiveChannel`, `App.renderActiveReadout` (Task 3); `App.updateChart`, `App.applyChartTheme` (Task 4).
- Produces on `window.ExchangeApp`:
  - `App.setupThemeToggle()` — wires `#themeToggle` click using `App.resolveThemeToggle`, persists/removes `localStorage["color-scheme"]`, updates `<meta name="color-scheme">`, calls `App.applyChartTheme?.()`, and subscribes to `window` `"storage"` and `matchMedia("(prefers-color-scheme: dark)")` `"change"` events.
  - `App.setupConverter()` — binds `#convBaseInput`, `#convQuoteInput`, and `#convPresets` buttons (`100`, `1000`, `10000`).
  - `App.refreshConverterFromRate()` — syncs `#convBaseCode`/`#convQuoteCode` and recomputes the non-edited side from `App.lastRates[App.state.chartPairId]` without clobbering the actively focused input.
  - `App.setChartPair(pairId)` — updates `App.state.chartPairId`, calls `App.syncActiveChannel()`, `App.renderActiveReadout()`, `App.refreshConverterFromRate()`, `App.updateChart()`, and on narrow screens (`window.innerWidth < 960`) scrolls gently to `.plotter-screen` only if it is out of viewport.

- [ ] **Step 1: Add unit tests for converter tick preservation & theme toggle wiring in `tests/app.logic.test.mjs`**

Assert:
- Typing `100` into base input with `JPY_CNY` raw rate `0.04329` sets quote input to `"4.33"` (2 decimals); editing quote input to `"43.29"` sets base input to `"1000"`.
- Calling `App.refreshConverterFromRate()` after a live tick updates the opposite field while leaving the last-edited field untouched, and displays `""` (placeholder `"--"`) when input is empty or rate is unavailable.
- Clicking theme toggle updates `<meta name="color-scheme">`, persists `"dark"` when overriding light OS, and removes `localStorage["color-scheme"]` + restores `"light dark"` on the second click, invoking `App.applyChartTheme()` each time.

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `node --test tests/app.logic.test.mjs`
Expected: FAIL because `setupThemeToggle`, `setupConverter`, and `refreshConverterFromRate` do not exist yet.

- [ ] **Step 3: Update `app.controls.js` and `app.js`**

- In `app.controls.js`:
  - Remove legacy `pairSelect` and `updateChartBtn` handlers.
  - Implement `App.setupThemeToggle()`, `App.setupConverter()`, `App.refreshConverterFromRate()`, updated `App.setChartPair(pairId)`, and smart mobile-only `App.scrollToPlotterIfNeeded()`.
  - Ensure `App.setLanguage()` in `app.i18n.js` (if needed, trigger `App.setupRateCards()` or in-place label refresh + `App.renderActiveReadout()` + `App.renderPeriodStats()`) keeps all pair names, channel header, stats, and converter labels synchronized when switching `中文` / `EN`.
- In `app.js`:
  - Call `setupThemeToggle()`, `setupRateCards()`, `setupControls()`, `setupConverter()`, `applyTranslations()`, `setupLanguageToggle()`, `syncActiveChannel()`, `renderActiveReadout()`, `updateLiveRates()`, 15s polling interval, and `updateChart()`.

- [ ] **Step 4: Run tests to verify all unit tests pass**

Run: `node --test tests/app.logic.test.mjs`
Expected: PASS (100% green).

- [ ] **Step 5: Commit**

```bash
git add app.controls.js app.js app.i18n.js tests/app.logic.test.mjs
git commit -m "feat: wire dual-finish theme toggle, bidirectional converter, and instrument controls"
```

---

### Task 6: Real-Browser Visual & Functional Verification

**Files:**
- Modify (only if visual/layout/runtime issues are found): `styles.css`, `index.html`, `app.*.js`

**Interfaces:**
- Consumes: Complete redesigned frontend from Tasks 1–5.
- Produces: Verified desktop (`1440×900`) and mobile (`390×844`) visual polish across Light Ceramic and Dark Anodized finishes in both `zh` and `en`, zero console errors, passing unit suite.

- [ ] **Step 1: Serve the site locally and verify live rendering in a real browser**

Start a temporary local HTTP server (`python3 -m http.server 8765`), open `http://localhost:8765/` (or inspect via headless Chromium / Chrome DevTools if available), and verify:
1. Desktop (`1440×900`) Ceramic Light & Anodized Dark: entire instrument fits comfortably on one screen without awkward scroll, zero horizontal overflow, crisp dot-matrix screen & Chart.js colors sync instantly on theme toggle.
2. Click all 6 channel keys (`USD/CNY` through `AUD/JPY`): active keycap depresses with orange LED, screen header/price/chart/converter update immediately, `JPY_CNY` converter computes `100 JPY ≈ 4.xx CNY`.
3. Switch time ranges (`今日`..`3年`) and switch `中文` / `EN`: all labels, pair names, period high/low/delta stats, and tooltips translate cleanly.
4. Mobile (`390×844`): 2×3 palmtop keypad renders cleanly without clipping, converter inputs and presets remain usable.
5. Zero browser console errors or broken asset requests.

- [ ] **Step 2: Fix any visual or runtime polish issues found, re-run full test suite**

Run: `node --test tests/app.logic.test.mjs`
Expected: PASS (0 failures).

- [ ] **Step 3: Commit any final polish and confirm clean `git status`**

```bash
git status -sb
```
Expected: Clean working tree (`.superpowers/` ignored), all tasks committed cleanly.
