import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = process.cwd();

function loadScripts(files, overrides = {}) {
  const storage = new Map();
  const elements = new Map(Object.entries(overrides.elements || {}));

  const documentStub = {
    documentElement: { lang: "zh-CN" },
    title: "",
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelector(selector) {
      if (overrides.querySelector) {
        return overrides.querySelector(selector);
      }
      return null;
    },
    querySelectorAll() {
      return [];
    },
    createElement(tag) {
      return createFakeElement(tag);
    },
    ...(overrides.document || {}),
  };

  const sandbox = {
    window: null,
    document: documentStub,
    navigator: { language: "zh-CN" },
    localStorage: {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (k) => storage.delete(k),
    },
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    Number,
    String,
    Array,
    Object,
    Map,
    ...overrides.globals,
  };

  sandbox.window = sandbox;
  sandbox.window.matchMedia =
    overrides.matchMedia || (() => ({ matches: false, addEventListener() {} }));
  sandbox.window.addEventListener =
    overrides.addEventListener || (() => {});
  sandbox.window.getComputedStyle =
    overrides.getComputedStyle ||
    (() => ({ getPropertyValue: () => "" }));

  vm.createContext(sandbox);
  for (const file of files) {
    const code = fs.readFileSync(path.join(ROOT, file), "utf8");
    vm.runInContext(code, sandbox, { filename: file });
  }
  return { App: sandbox.ExchangeApp, sandbox, storage };
}

export function createFakeElement(tag = "div") {
  const classes = new Set();
  const attrs = new Map();
  const listeners = new Map();
  const children = [];
  let _innerHTML = "";
  const el = {
    tagName: tag.toUpperCase(),
    textContent: "",
    value: "",
    dataset: {},
    style: {},
    children,
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      toggle: (c, force) => {
        if (force === undefined) {
          if (classes.has(c)) classes.delete(c);
          else classes.add(c);
        } else if (force) {
          classes.add(c);
        } else {
          classes.delete(c);
        }
      },
      contains: (c) => classes.has(c),
    },
    setAttribute(k, v) {
      attrs.set(k, String(v));
    },
    getAttribute(k) {
      return attrs.has(k) ? attrs.get(k) : null;
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    dispatchEvent(type, evt = {}) {
      (listeners.get(type) || []).forEach((fn) => fn(evt));
    },
    appendChild(child) {
      children.push(child);
      return child;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    get innerHTML() {
      return _innerHTML;
    },
    set innerHTML(val) {
      _innerHTML = val;
      if (val === "") children.length = 0;
    },
    get offsetWidth() {
      return 100;
    },
  };
  return el;
}

function flattenKeys(obj, prefix = "") {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys.sort();
}

const plain = (value) => JSON.parse(JSON.stringify(value));

test("Task 1: PAIRS include CH-01..CH-06 channel codes and extended state", () => {
  const { App } = loadScripts(["app.core.js"]);
  assert.equal(App.PAIRS.length, 6);
  assert.deepEqual(
    plain(App.PAIRS.map((p) => p.ch)),
    ["CH-01", "CH-02", "CH-03", "CH-04", "CH-05", "CH-06"]
  );
  assert.deepEqual(plain(App.state.lastQuotes), {});
  assert.equal(App.state.lastChartData, null);
  assert.equal(App.state.converter.side, "base");
  assert.equal(App.state.converter.baseAmount, "100");
});

test("Task 1: computePeriodStats calculates high, low, pctChange and edge cases", () => {
  const { App } = loadScripts(["app.core.js"]);
  assert.equal(typeof App.computePeriodStats, "function");

  const stats = App.computePeriodStats([6.86, 6.93, 6.91]);
  assert.equal(stats.high, 6.93);
  assert.equal(stats.low, 6.86);
  assert.ok(Math.abs(stats.pctChange - ((6.91 - 6.86) / 6.86) * 100) < 1e-9);

  assert.equal(App.computePeriodStats([]), null);
  assert.equal(App.computePeriodStats(null), null);

  assert.deepEqual(plain(App.computePeriodStats([7])), {
    high: 7,
    low: 7,
    pctChange: 0,
  });
  assert.deepEqual(plain(App.computePeriodStats([0, 5])), {
    high: 5,
    low: 0,
    pctChange: 0,
  });
});

test("Task 1: convertAmount handles JPY_CNY unit rate, reverse direction, zero and invalid inputs", () => {
  const { App } = loadScripts(["app.core.js"]);
  assert.equal(typeof App.convertAmount, "function");

  // 100 JPY at raw unit rate 0.04329 -> 4.329 CNY
  assert.ok(
    Math.abs(App.convertAmount(100, 0.04329, "baseToQuote") - 4.329) < 1e-9
  );
  // Reverse: 691.02 CNY at 6.9102 -> 100 USD
  assert.ok(
    Math.abs(App.convertAmount(691.02, 6.9102, "quoteToBase") - 100) < 1e-9
  );
  assert.equal(App.convertAmount(0, 6.9102, "baseToQuote"), 0);
  assert.equal(App.convertAmount(0, 6.9102, "quoteToBase"), 0);
  assert.equal(App.convertAmount(NaN, 6.9102, "baseToQuote"), null);
  assert.equal(App.convertAmount(-5, 6.9102, "baseToQuote"), null);
  assert.equal(App.convertAmount(100, 0, "baseToQuote"), null);
  assert.equal(App.convertAmount(100, -1, "baseToQuote"), null);
  assert.equal(App.convertAmount(Infinity, 6.9102, "baseToQuote"), null);
});

test("Task 1: resolveThemeToggle and getEffectiveTheme follow two-state OS-revert rules", () => {
  const { App } = loadScripts(["app.core.js"]);
  assert.equal(typeof App.resolveThemeToggle, "function");
  assert.equal(typeof App.getEffectiveTheme, "function");

  // OS light, currently system -> toggle to dark override
  assert.deepEqual(plain(App.resolveThemeToggle(null, false)), {
    nextStored: "dark",
    metaContent: "dark",
    effective: "dark",
  });
  // OS light, currently dark override -> toggle back to system (remove stored!)
  assert.deepEqual(plain(App.resolveThemeToggle("dark", false)), {
    nextStored: null,
    metaContent: "light dark",
    effective: "light",
  });
  // OS dark, currently dark override -> toggle to light override
  assert.deepEqual(plain(App.resolveThemeToggle("dark", true)), {
    nextStored: "light",
    metaContent: "light",
    effective: "light",
  });
  // OS dark, currently light override -> toggle back to system (remove stored!)
  assert.deepEqual(plain(App.resolveThemeToggle("light", true)), {
    nextStored: null,
    metaContent: "light dark",
    effective: "dark",
  });

  assert.equal(App.getEffectiveTheme("dark", false), "dark");
  assert.equal(App.getEffectiveTheme("light", true), "light");
  assert.equal(App.getEffectiveTheme("light dark", true), "dark");
  assert.equal(App.getEffectiveTheme("light dark", false), "light");
});

test("Task 1: i18n zh and en dictionaries have identical keys including instrument, pairs, stats, converter, theme", () => {
  const { App } = loadScripts(["app.core.js", "app.i18n.js"]);
  const zhKeys = flattenKeys(App.I18N.zh);
  const enKeys = flattenKeys(App.I18N.en);
  assert.deepEqual(zhKeys, enKeys);

  for (const pair of App.PAIRS) {
    assert.ok(
      zhKeys.includes(`pairs.${pair.id}`),
      `Missing zh key pairs.${pair.id}`
    );
  }
  for (const required of [
    "instrument.subtitle",
    "theme.toDark",
    "theme.toLight",
    "stats.high",
    "stats.low",
    "stats.delta",
    "converter.label",
  ]) {
    assert.ok(zhKeys.includes(required), `Missing required i18n key ${required}`);
  }
});

test("Task 2: index.html and styles.css satisfy Braun instrument DOM, FOUC, and dual-finish CSS contracts", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const css = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");

  assert.match(html, /<meta\s+name="color-scheme"\s+content="light dark"\s*\/?>/);
  assert.match(
    html,
    /<meta\s+name="color-scheme"[^>]*>\s*<script>[\s\S]*?localStorage\.getItem\("color-scheme"\)[\s\S]*?<\/script>/
  );
  assert.match(html, /IBM\+Plex\+Mono/);
  assert.match(html, /Space\+Grotesk/);
  assert.match(html, /Noto\+Sans\+SC/);

  const requiredIds = [
    "lastUpdated",
    "liveStatus",
    "ratesGrid",
    "refreshRates",
    "themeToggle",
    "langSwitch",
    "rangeButtons",
    "screenChannel",
    "screenPrice",
    "screenDelta",
    "chartMeta",
    "chartStatus",
    "rateChart",
    "statHigh",
    "statLow",
    "statDelta",
    "statSource",
    "convBaseInput",
    "convQuoteInput",
    "convBaseCode",
    "convQuoteCode",
    "convPresets",
  ];
  for (const id of requiredIds) {
    assert.ok(
      html.includes(`id="${id}"`),
      `index.html missing required id="${id}"`
    );
  }

  assert.match(css, /color-scheme:\s*light dark/);
  assert.match(css, /:has\(>\s*head\s*>\s*meta\[name="color-scheme"\]\[content="dark"\]\)/);
  assert.match(css, /:has\(>\s*head\s*>\s*meta\[name="color-scheme"\]\[content="light"\]\)/);
  assert.match(css, /font-variant-numeric:\s*tabular-nums/);
  assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /--chart-line:/);
});

test("Task 3: setupRateCards, syncActiveChannel, and renderLiveRates handle Worker and Frankfurter fallback payloads", () => {
  const ratesGrid = createFakeElement("div");
  const lastUpdated = createFakeElement("span");
  const screenChannel = createFakeElement("div");
  const screenPrice = createFakeElement("span");
  const screenDelta = createFakeElement("span");

  const { App } = loadScripts(["app.core.js", "app.i18n.js", "app.rates.js"], {
    elements: {
      ratesGrid,
      lastUpdated,
      screenChannel,
      screenPrice,
      screenDelta,
    },
  });

  assert.equal(typeof App.syncActiveChannel, "function");
  assert.equal(typeof App.renderActiveReadout, "function");

  let converterRefreshed = 0;
  App.refreshConverterFromRate = () => {
    converterRefreshed += 1;
  };

  App.setupRateCards();
  assert.equal(ratesGrid.children.length, 6);
  assert.equal(ratesGrid.children[0].tagName, "BUTTON");

  App.syncActiveChannel();
  assert.equal(ratesGrid.children[0].classList.contains("active"), true);
  assert.equal(ratesGrid.children[0].getAttribute("aria-pressed"), "true");
  assert.equal(ratesGrid.children[1].classList.contains("active"), false);

  // Worker payload with prev close
  App.renderLiveRates({
    asOf: Date.now(),
    source: "yahoo",
    pairs: {
      USD_CNY: { rate: 6.9102, prev: 6.8978, state: "REGULAR" },
      JPY_CNY: { rate: 0.04329, prev: 0.04325, state: "REGULAR" },
    },
  });

  assert.equal(App.lastRates.USD_CNY, 6.9102);
  assert.equal(App.lastRates.JPY_CNY, 0.04329);
  assert.equal(App.state.lastQuotes.USD_CNY.rate, 6.9102);
  assert.equal(App.rateElements.get("USD_CNY").value.textContent, "6.9102");
  assert.equal(App.rateElements.get("JPY_CNY").value.textContent, "4.329");
  assert.match(App.rateElements.get("USD_CNY").change.textContent, /^▲ \+0\.18%$/);
  assert.equal(screenPrice.textContent, "6.9102");
  assert.match(screenDelta.textContent, /^▲ \+0\.18%$/);
  assert.match(screenChannel.textContent, /CH-01/);
  assert.ok(converterRefreshed >= 1);

  // Frankfurter fallback payload (prev: null, date present)
  App.state.chartPairId = "JPY_CNY";
  App.syncActiveChannel();
  assert.equal(ratesGrid.children[3].classList.contains("active"), true);

  App.renderLiveRates({
    asOf: Date.now(),
    source: "frankfurter",
    pairs: {
      JPY_CNY: { rate: 0.0435, prev: null, date: "2026-11-24", source: "frankfurter" },
    },
  });

  assert.equal(App.lastRates.JPY_CNY, 0.0435);
  assert.equal(App.rateElements.get("JPY_CNY").value.textContent, "4.35");
  assert.equal(App.rateElements.get("JPY_CNY").change.style.display, "none");
  assert.match(App.rateElements.get("JPY_CNY").meta.textContent, /2026-11-24/);
  assert.equal(screenPrice.textContent, "4.35");
  assert.equal(screenDelta.textContent, "");
});

test("Task 4: renderPeriodStats computes DOM values and applyChartTheme safely updates or no-ops", () => {
  const statHigh = createFakeElement("strong");
  const statLow = createFakeElement("strong");
  const statDelta = createFakeElement("strong");
  const statSource = createFakeElement("span");

  const { App } = loadScripts(["app.core.js", "app.i18n.js", "app.chart.js"], {
    elements: { statHigh, statLow, statDelta, statSource },
    getComputedStyle: () => ({
      getPropertyValue: (name) =>
        ({
          "--chart-line": "#f2f3f5",
          "--chart-fill-top": "rgba(255, 92, 46, 0.28)",
          "--chart-fill-bottom": "rgba(255, 92, 46, 0)",
          "--chart-grid": "rgba(255, 255, 255, 0.08)",
          "--chart-tick": "#989da8",
          "--chart-crosshair": "rgba(242, 243, 245, 0.28)",
          "--chart-ref-line": "rgba(242, 243, 245, 0.16)",
          "--chart-tooltip-bg": "#f0efe9",
          "--chart-tooltip-border": "#d2d1c8",
          "--chart-tooltip-ink": "#17181c",
          "--chart-point": "#ff5c2e",
        }[name] || ""),
    }),
  });

  assert.equal(typeof App.renderPeriodStats, "function");
  assert.equal(typeof App.applyChartTheme, "function");

  App.renderPeriodStats([6.8615, 6.934, 6.9102], "yahoo");
  assert.equal(statHigh.textContent, "6.934");
  assert.equal(statLow.textContent, "6.8615");
  assert.equal(statDelta.textContent, "▲ +0.71%");
  assert.equal(statDelta.classList.contains("up"), true);
  assert.equal(statSource.textContent, "Yahoo 实时");

  App.renderPeriodStats([7.0, 6.5], "frankfurter");
  assert.equal(statDelta.classList.contains("down"), true);
  assert.match(statDelta.textContent, /^▼ -7\.14%$/);
  assert.equal(statSource.textContent, "ECB 日参考");

  App.renderPeriodStats([]);
  assert.equal(statHigh.textContent, "--");
  assert.equal(statLow.textContent, "--");
  assert.equal(statDelta.textContent, "--");

  // No-op safely when chart is null
  assert.doesNotThrow(() => App.applyChartTheme());

  // Updates existing chart instance in place without refetching
  let updatedMode = null;
  App.state.chart = {
    canvas: { height: 260 },
    ctx: {
      createLinearGradient: () => ({ addColorStop() {} }),
    },
    data: { datasets: [{ borderColor: "", backgroundColor: "", pointHoverBackgroundColor: "" }] },
    options: {
      plugins: {
        tooltip: { backgroundColor: "", borderColor: "", titleColor: "", bodyColor: "" },
        crosshair: { color: "" },
        highLowRef: { color: "" },
      },
      scales: {
        x: { ticks: { color: "" } },
        y: { grid: { color: "" }, ticks: { color: "" } },
      },
    },
    update(mode) {
      updatedMode = mode;
    },
  };
  App.applyChartTheme();
  assert.equal(App.state.chart.data.datasets[0].borderColor, "#f2f3f5");
  assert.equal(App.state.chart.options.scales.y.ticks.color, "#989da8");
  assert.equal(updatedMode, "none");
});

test("Task 5: bidirectional converter handles JPY_CNY scaling, live tick preservation, empty input, and presets", () => {
  const convBaseInput = createFakeElement("input");
  convBaseInput.value = "100";
  const convQuoteInput = createFakeElement("input");
  const convBaseCode = createFakeElement("span");
  const convQuoteCode = createFakeElement("span");
  const convPresets = createFakeElement("div");
  const preset10k = createFakeElement("button");
  preset10k.dataset.amount = "10000";
  convPresets.appendChild(preset10k);

  const { App } = loadScripts(["app.core.js", "app.i18n.js", "app.controls.js"], {
    elements: {
      convBaseInput,
      convQuoteInput,
      convBaseCode,
      convQuoteCode,
      convPresets,
    },
  });

  assert.equal(typeof App.setupConverter, "function");
  assert.equal(typeof App.refreshConverterFromRate, "function");

  App.setupConverter();
  App.state.chartPairId = "JPY_CNY";
  App.lastRates.JPY_CNY = 0.04329;

  // Base 100 JPY -> 4.33 CNY
  convBaseInput.value = "100";
  convBaseInput.dispatchEvent("input");
  assert.equal(convBaseCode.textContent, "JPY");
  assert.equal(convQuoteCode.textContent, "CNY");
  assert.equal(convQuoteInput.value, "4.33");

  // Reverse edit: Quote 43.29 CNY -> 1000 JPY
  convQuoteInput.value = "43.29";
  convQuoteInput.dispatchEvent("input");
  assert.equal(convBaseInput.value, "1000");

  // Live tick arrives while last-edited side is quote -> quote stays "43.29", base updates
  App.lastRates.JPY_CNY = 0.05;
  App.refreshConverterFromRate();
  assert.equal(convQuoteInput.value, "43.29");
  assert.equal(convBaseInput.value, "865.8");

  // Preset click sets base to 10000 and updates quote
  convPresets.dispatchEvent("click", { target: preset10k });
  assert.equal(convBaseInput.value, "10000");
  assert.equal(convQuoteInput.value, "500");

  // Empty input clears opposite field cleanly without NaN
  convBaseInput.value = "";
  convBaseInput.dispatchEvent("input");
  assert.equal(convQuoteInput.value, "");
});

test("Task 5: setupThemeToggle switches meta color-scheme, reverts to system on 2nd click, and syncs chart theme", () => {
  const themeToggle = createFakeElement("button");
  const metaEl = { content: "light dark" };
  let mediaChangeListener = null;
  let storageListener = null;
  let chartThemeCalls = 0;

  const { App, storage } = loadScripts(
    ["app.core.js", "app.i18n.js", "app.controls.js"],
    {
      elements: { themeToggle },
      querySelector: (sel) =>
        sel === 'meta[name="color-scheme"]' ? metaEl : null,
      matchMedia: () => ({
        matches: false, // OS is light
        addEventListener: (_type, fn) => {
          mediaChangeListener = fn;
        },
      }),
      addEventListener: (type, fn) => {
        if (type === "storage") storageListener = fn;
      },
    }
  );

  assert.equal(typeof App.setupThemeToggle, "function");
  App.applyChartTheme = () => {
    chartThemeCalls += 1;
  };

  App.setupThemeToggle();

  // 1st click: OS light -> override to dark
  themeToggle.dispatchEvent("click");
  assert.equal(metaEl.content, "dark");
  assert.equal(storage.get("color-scheme"), "dark");
  assert.equal(chartThemeCalls, 1);

  // 2nd click: back to light (matches OS) -> removes localStorage and restores "light dark"
  themeToggle.dispatchEvent("click");
  assert.equal(metaEl.content, "light dark");
  assert.equal(storage.has("color-scheme"), false);
  assert.equal(chartThemeCalls, 2);

  // OS preference change & cross-tab storage event both re-sync chart theme
  assert.equal(typeof mediaChangeListener, "function");
  assert.equal(typeof storageListener, "function");
  mediaChangeListener();
  assert.equal(chartThemeCalls, 3);

  storage.set("color-scheme", "dark");
  storageListener({ key: "color-scheme", newValue: "dark" });
  assert.equal(metaEl.content, "dark");
  assert.equal(chartThemeCalls, 4);
});

test("Task 6: updateChart discards stale out-of-order responses when user switches pairs rapidly", async () => {
  const statHigh = createFakeElement("strong");
  const statLow = createFakeElement("strong");
  const statDelta = createFakeElement("strong");
  const statSource = createFakeElement("span");
  const chartMeta = createFakeElement("div");

  const { App } = loadScripts(["app.core.js", "app.i18n.js", "app.chart.js"], {
    elements: { statHigh, statLow, statDelta, statSource, chartMeta },
  });

  const resolvers = new Map();
  App.fetchHistoryFromWorker = (pair) =>
    new Promise((resolve) => {
      resolvers.set(pair.id, resolve);
    });

  const renderedPairs = [];
  App.renderChart = (_labels, _values, pair) => {
    renderedPairs.push(pair.id);
  };

  // Start slow request for JPY_CNY
  App.state.chartPairId = "JPY_CNY";
  const req1 = App.updateChart();

  // Immediately switch to USD_CNY before JPY_CNY finishes
  App.state.chartPairId = "USD_CNY";
  const req2 = App.updateChart();

  // USD_CNY finishes first
  resolvers.get("USD_CNY")({
    labels: ["2026-11-01", "2026-11-25"],
    values: [6.65, 6.66],
    intraday: false,
    source: "yahoo",
  });
  await req2;

  // Stale JPY_CNY finishes second -> MUST be ignored
  resolvers.get("JPY_CNY")({
    labels: ["2026-11-01", "2026-11-25"],
    values: [4.17, 4.25],
    intraday: false,
    source: "yahoo",
  });
  await req1;

  assert.deepEqual(renderedPairs, ["USD_CNY"]);
  assert.equal(statHigh.textContent, "6.66");
  assert.equal(statLow.textContent, "6.65");
});

test("Final fix 1: overlapping live intraday poll never leaves chartStatus stuck on loading", async () => {
  const chartStatus = createFakeElement("span");
  const statHigh = createFakeElement("strong");
  const statLow = createFakeElement("strong");
  const statDelta = createFakeElement("strong");
  const chartMeta = createFakeElement("div");

  const { App } = loadScripts(["app.core.js", "app.i18n.js", "app.chart.js"], {
    elements: { chartStatus, statHigh, statLow, statDelta, chartMeta },
  });

  App.state.rangeId = "1d";
  const pending = [];
  App.fetchHistoryFromWorker = () =>
    new Promise((resolve) => {
      pending.push(resolve);
    });
  App.renderChart = () => {};

  const manualReq = App.updateChart();
  assert.equal(chartStatus.textContent, "加载中...");

  // 15s poll fires while manual 1d fetch is still in flight
  const liveReq = App.updateChart({ live: true });

  // Resolve any pending fetches in order
  while (pending.length) {
    pending.shift()({
      labels: ["10:00", "10:05"],
      values: [6.66, 6.661],
      intraday: true,
      source: "yahoo",
    });
    await Promise.resolve();
  }
  await Promise.all([manualReq, liveReq]);

  assert.equal(chartStatus.textContent, "");
});

test("Final fix 2: failed or empty non-live chart fetch clears stale previous chart, stats, and meta", async () => {
  const chartStatus = createFakeElement("span");
  const statHigh = createFakeElement("strong");
  const statLow = createFakeElement("strong");
  const statDelta = createFakeElement("strong");
  const statSource = createFakeElement("span");
  const chartMeta = createFakeElement("div");

  const { App } = loadScripts(["app.core.js", "app.i18n.js", "app.chart.js"], {
    elements: { chartStatus, statHigh, statLow, statDelta, statSource, chartMeta },
  });

  let destroyed = 0;
  App.state.chart = {
    destroy() {
      destroyed += 1;
    },
  };
  App.state.chartKey = "USD_CNY:30d";
  App.state.lastChartData = {
    labels: ["2026-10-26", "2026-11-25"],
    values: [6.648, 6.688],
    pair: App.pairById.get("USD_CNY"),
    source: "yahoo",
  };
  statHigh.textContent = "6.688";
  chartMeta.textContent = "30天 · 2026-10-26 至 2026-11-25";

  // Switch to JPY_CNY and simulate both Worker and Frankfurter failing
  App.state.chartPairId = "JPY_CNY";
  App.fetchHistoryFromWorker = async () => {
    throw new Error("offline");
  };
  App.fetchHistoryFromFrankfurter = async () => {
    throw new Error("offline");
  };

  await App.updateChart();

  assert.equal(destroyed, 1);
  assert.equal(App.state.chart, null);
  assert.equal(App.state.chartKey, null);
  assert.equal(App.state.lastChartData, null);
  assert.equal(statHigh.textContent, "--");
  assert.equal(statLow.textContent, "--");
  assert.equal(statDelta.textContent, "--");
  assert.equal(chartMeta.textContent, App.t("chart.prompt"));
});

test("Final fix 3 & 5: styles.css handles mobile key wrapping and WCAG AA active range contrast", () => {
  const css = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");

  // Fix 3: mobile/tablet .channel-key-right wraps and .rate-meta-inline takes full line
  assert.match(css, /\.channel-key-right\s*\{[^}]*flex-wrap:\s*wrap/);
  assert.match(css, /\.rate-meta-inline\s*\{[^}]*flex-basis:\s*100%/);

  // Fix 5: WCAG AA contrast tokens for active range button in light & dark finishes
  assert.match(css, /--light-accent-orange:\s*#c93b12/i);
  assert.match(css, /--accent-orange-ink:/);
  assert.match(
    css,
    /\.range-well button\.active\s*\{[^}]*color:\s*var\(--accent-orange-ink\)/
  );
});

test("Final fix 4: setLanguage preserves formatted lastUpdated and chartMeta instead of resetting to placeholders", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert.doesNotMatch(html, /id="lastUpdated"[^>]*data-i18n=/);
  assert.doesNotMatch(html, /id="chartMeta"[^>]*data-i18n=/);

  const lastUpdated = createFakeElement("span");
  const chartMeta = createFakeElement("div");
  const ratesGrid = createFakeElement("div");
  const screenChannel = createFakeElement("div");
  const screenPrice = createFakeElement("span");
  const screenDelta = createFakeElement("span");

  const { App } = loadScripts(["app.core.js", "app.i18n.js", "app.rates.js"], {
    elements: {
      lastUpdated,
      chartMeta,
      ratesGrid,
      screenChannel,
      screenPrice,
      screenDelta,
    },
  });

  App.setupRateCards();
  App.renderLiveRates({
    asOf: Date.now(),
    source: "yahoo",
    pairs: { USD_CNY: { rate: 6.6602, prev: 6.6542, state: "REGULAR" } },
  });
  App.state.lastChartData = {
    labels: ["2026-10-26", "2026-11-25"],
    values: [6.648, 6.688],
    pair: App.pairById.get("USD_CNY"),
    rangeId: "30d",
    source: "yahoo",
  };

  // Prevent network calls inside unit test
  App.updateLiveRates = () => {};
  App.updateChart = () => {};

  App.setLanguage("en");
  assert.notEqual(lastUpdated.textContent, "Syncing...");
  assert.match(lastUpdated.textContent, /\d{1,2}:\d{2}/);
  assert.equal(chartMeta.textContent, "30D · 2026-10-26 to 2026-11-25");
});
