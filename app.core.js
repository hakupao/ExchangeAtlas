(() => {
  const App = window.ExchangeApp || (window.ExchangeApp = {});

  // History/baseline source (ECB daily reference rates) — used by the chart.
  App.API_BASE = "https://api.frankfurter.dev/v1";

  // Realtime source: your deployed Cloudflare Worker (see worker/README.md).
  // Leave as the placeholder to run on Frankfurter daily rates; the app
  // automatically falls back to Frankfurter if this is unset or the Worker is down.
  App.LIVE_API_BASE = "https://exchangeatlas-rates.bojiang.workers.dev";

  // Last raw rate per pair, used to flash the value up/down on each tick.
  App.lastRates = {};

  App.PAIRS = [
    { id: "USD_CNY", base: "USD", quote: "CNY" },
    { id: "USD_JPY", base: "USD", quote: "JPY" },
    { id: "CNY_JPY", base: "CNY", quote: "JPY" },
    { id: "JPY_CNY", base: "JPY", quote: "CNY" },
    { id: "AUD_CNY", base: "AUD", quote: "CNY" },
    { id: "AUD_JPY", base: "AUD", quote: "JPY" },
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
    language: "zh",
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
    pairSelect: document.getElementById("pairSelect"),
    rangeButtons: document.getElementById("rangeButtons"),
    updateChartBtn: document.getElementById("updateChart"),
    chartTitle: document.getElementById("chartTitle"),
    chartMeta: document.getElementById("chartMeta"),
    chartLegend: document.getElementById("chartLegend"),
    chartStatus: document.getElementById("chartStatus"),
    langSwitch: document.getElementById("langSwitch"),
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
