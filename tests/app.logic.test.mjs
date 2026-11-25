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
