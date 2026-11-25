(() => {
  const App = window.ExchangeApp || (window.ExchangeApp = {});

  // History/baseline source (ECB daily reference rates) — used by the chart.
  App.API_BASE = "https://api.frankfurter.dev/v1";

  // Realtime source: your deployed Cloudflare Worker (see worker/README.md).
  // Leave as the placeholder to run on Frankfurter daily rates; the app
  // automatically falls back to Frankfurter if this is unset or the Worker is down.
  App.LIVE_API_BASE = "https://exchangeatlas-rates.bojiang.workers.dev";

  // Last raw 1-unit rate per pair, used for tick flash & exact quick conversion.
  App.lastRates = {};

  App.PAIRS = [
    { id: "USD_CNY", ch: "CH-01", base: "USD", quote: "CNY" },
    { id: "USD_JPY", ch: "CH-02", base: "USD", quote: "JPY" },
    { id: "CNY_JPY", ch: "CH-03", base: "CNY", quote: "JPY" },
    { id: "JPY_CNY", ch: "CH-04", base: "JPY", quote: "CNY" },
    { id: "AUD_CNY", ch: "CH-05", base: "AUD", quote: "CNY" },
    { id: "AUD_JPY", ch: "CH-06", base: "AUD", quote: "JPY" },
  ];

  // Each preset carries the Yahoo params used by the realtime chart (via the
  // Worker /history endpoint). `intraday` ranges auto-refresh on each poll.
  // Non-intraday ranges fall back to Frankfurter daily history if the Worker is
  // unavailable; intraday has no Frankfurter equivalent.
  App.RANGE_PRESETS = [
    { id: "1d", intraday: true, yRange: "1d", yInterval: "5m" },
    { id: "7d", days: 7, yInterval: "1d" },
    { id: "30d", days: 30, yInterval: "1d" },
    { id: "6m", months: 6, yInterval: "1d" },
    { id: "1y", years: 1, yInterval: "1d" },
    { id: "3y", years: 3, yInterval: "1wk" },
  ];

  App.SUPPORTED_LANGS = ["zh", "en"];

  App.state = {
    chartPairId: "USD_CNY",
    rangeId: "30d",
    chart: null,
    chartKey: null, // "<pairId>:<rangeId>" of the currently drawn chart
    lastChartData: null, // { labels, values, pair, rangeId, source } for instant theme/lang redraw
    lastQuotes: {}, // pairId -> latest quote payload
    lastUpdatedAt: null, // Date instance of latest live rate render
    language: "zh",
    converter: {
      side: "base",
      baseAmount: "100",
      quoteAmount: "",
    },
  };

  App.getDisplayAmount = (pair) => {
    const pairId = typeof pair === "string" ? pair : pair?.id;
    return pairId === "JPY_CNY" ? 100 : 1;
  };

  // Free realtime feeds quote OFFSHORE yuan (CNH-tracking), not the PBOC onshore
  // fixing — flag any CNY pair so the UI can label it honestly.
  App.isOffshorePair = (pair) => pair.base === "CNY" || pair.quote === "CNY";

  // True only when a real Worker URL has been wired in (not the placeholder).
  App.isLiveConfigured = () =>
    typeof App.LIVE_API_BASE === "string" &&
    App.LIVE_API_BASE &&
    !App.LIVE_API_BASE.includes("YOUR-WORKER");

  App.getDatasetLabel = (pair) => {
    const amount = App.getDisplayAmount(pair);
    if (amount === 1) {
      return `${pair.base} → ${pair.quote}`;
    }
    return `${amount} ${pair.base} → ${pair.quote}`;
  };

  App.scaleRateForDisplay = (rate, pair) => {
    if (typeof rate !== "number" || Number.isNaN(rate)) {
      return rate;
    }
    return rate * App.getDisplayAmount(pair);
  };

  App.pairById = new Map(App.PAIRS.map((pair) => [pair.id, pair]));
  App.rateElements = new Map();

  App.dom = {
    lastUpdated: document.getElementById("lastUpdated"),
    liveStatus: document.getElementById("liveStatus"),
    ratesGrid: document.getElementById("ratesGrid"),
    refreshBtn: document.getElementById("refreshRates"),
    themeToggle: document.getElementById("themeToggle"),
    langSwitch: document.getElementById("langSwitch"),
    rangeButtons: document.getElementById("rangeButtons"),
    screenChannel: document.getElementById("screenChannel"),
    screenPrice: document.getElementById("screenPrice"),
    screenDelta: document.getElementById("screenDelta"),
    chartMeta: document.getElementById("chartMeta"),
    chartStatus: document.getElementById("chartStatus"),
    statHigh: document.getElementById("statHigh"),
    statLow: document.getElementById("statLow"),
    statDelta: document.getElementById("statDelta"),
    statSource: document.getElementById("statSource"),
    convBaseInput: document.getElementById("convBaseInput"),
    convQuoteInput: document.getElementById("convQuoteInput"),
    convBaseCode: document.getElementById("convBaseCode"),
    convQuoteCode: document.getElementById("convQuoteCode"),
    convPresets: document.getElementById("convPresets"),
  };
  App.dom.langButtons = App.dom.langSwitch
    ? Array.from(App.dom.langSwitch.querySelectorAll("button"))
    : [];

  App.normalizeNumber = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return null;
    }
    const normalized = Number(value.toPrecision(12));
    return Number.isFinite(normalized) ? normalized : value;
  };

  App.getRatePrecision = (value) => {
    const absValue = Math.abs(value);
    if (absValue >= 100) {
      return 2;
    }
    if (absValue >= 1) {
      return 4;
    }
    return 6;
  };

  App.formatRate = (value) => {
    const normalized = App.normalizeNumber(value);
    if (normalized === null) {
      return "--";
    }
    return normalized.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: App.getRatePrecision(normalized),
    });
  };

  App.formatAxisTick = (value) => {
    const normalized = App.normalizeNumber(value);
    if (normalized === null) {
      return "--";
    }
    return normalized.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: App.getRatePrecision(normalized),
    });
  };

  // Pure helper: period high, low, and % change across a numeric series.
  App.computePeriodStats = (values) => {
    if (!Array.isArray(values) || values.length === 0) {
      return null;
    }
    const numeric = values.filter(
      (v) => typeof v === "number" && Number.isFinite(v)
    );
    if (numeric.length === 0) {
      return null;
    }
    let high = numeric[0];
    let low = numeric[0];
    for (let i = 1; i < numeric.length; i += 1) {
      if (numeric[i] > high) high = numeric[i];
      if (numeric[i] < low) low = numeric[i];
    }
    const first = numeric[0];
    const last = numeric[numeric.length - 1];
    const pctChange =
      numeric.length > 1 && first > 0 ? ((last - first) / first) * 100 : 0;
    return { high, low, pctChange };
  };

  // Pure helper: exact bidirectional currency conversion using raw 1-unit rate.
  App.convertAmount = (amount, rawUnitRate, direction = "baseToQuote") => {
    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      typeof rawUnitRate !== "number" ||
      !Number.isFinite(rawUnitRate) ||
      rawUnitRate <= 0
    ) {
      return null;
    }
    if (amount === 0) {
      return 0;
    }
    const result =
      direction === "quoteToBase" ? amount / rawUnitRate : amount * rawUnitRate;
    return Number.isFinite(result) ? result : null;
  };

  // Pure helper: resolve effective rendered theme from <meta name="color-scheme"> + OS.
  App.getEffectiveTheme = (metaContent, systemPrefersDark) => {
    if (metaContent === "dark") return "dark";
    if (metaContent === "light") return "light";
    return systemPrefersDark ? "dark" : "light";
  };

  // Pure helper: two-state theme toggle with OS-revert semantics (no invisible pinning).
  App.resolveThemeToggle = (storedOverride, systemPrefersDark) => {
    const current =
      storedOverride === "dark" || storedOverride === "light"
        ? storedOverride
        : systemPrefersDark
        ? "dark"
        : "light";
    const target = current === "dark" ? "light" : "dark";
    const systemTheme = systemPrefersDark ? "dark" : "light";
    if (target === systemTheme) {
      return {
        nextStored: null,
        metaContent: "light dark",
        effective: target,
      };
    }
    return {
      nextStored: target,
      metaContent: target,
      effective: target,
    };
  };

  App.formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  App.getRangeDates = (range) => {
    const end = new Date();
    const start = new Date(end);

    if (range.days) {
      start.setDate(start.getDate() - range.days);
    }
    if (range.months) {
      start.setMonth(start.getMonth() - range.months);
    }
    if (range.years) {
      start.setFullYear(start.getFullYear() - range.years);
    }

    return {
      start: App.formatDate(start),
      end: App.formatDate(end),
    };
  };

  // Same window as getRangeDates, but as UNIX seconds for the Yahoo chart API.
  App.getRangeUnix = (range) => {
    const end = new Date();
    const start = new Date(end);

    if (range.days) {
      start.setDate(start.getDate() - range.days);
    }
    if (range.months) {
      start.setMonth(start.getMonth() - range.months);
    }
    if (range.years) {
      start.setFullYear(start.getFullYear() - range.years);
    }

    return {
      period1: Math.floor(start.getTime() / 1000),
      period2: Math.floor(end.getTime() / 1000),
    };
  };

  App.setLiveStatus = (message) => {
    if (!App.dom.liveStatus) {
      return;
    }
    App.dom.liveStatus.textContent = message || "";
  };

  App.setChartStatus = (message) => {
    if (!App.dom.chartStatus) {
      return;
    }
    App.dom.chartStatus.textContent = message || "";
  };
})();
