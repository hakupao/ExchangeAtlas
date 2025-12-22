(() => {
  const App = window.ExchangeApp || (window.ExchangeApp = {});

  App.API_BASE = "https://api.frankfurter.app";
  App.PAIRS = [
    { id: "USD_CNY", base: "USD", quote: "CNY" },
    { id: "USD_JPY", base: "USD", quote: "JPY" },
    { id: "CNY_JPY", base: "CNY", quote: "JPY" },
    { id: "JPY_CNY", base: "JPY", quote: "CNY" },
    { id: "AUD_CNY", base: "AUD", quote: "CNY" },
    { id: "AUD_JPY", base: "AUD", quote: "JPY" },
  ];

  App.RANGE_PRESETS = [
    { id: "7d", days: 7 },
    { id: "30d", days: 30 },
    { id: "6m", months: 6 },
    { id: "1y", years: 1 },
    { id: "3y", years: 3 },
  ];

  App.SUPPORTED_LANGS = ["zh", "en"];

  App.state = {
    chartPairId: "USD_CNY",
    rangeId: "30d",
    chart: null,
    language: "zh",
  };

  App.getDisplayAmount = (pair) => {
    const pairId = typeof pair === "string" ? pair : pair?.id;
    return pairId === "JPY_CNY" ? 100 : 1;
  };

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

  App.formatRate = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "--";
    }
    return String(value);
  };

  App.formatAxisTick = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "--";
    }
    const normalized = Number(value.toPrecision(12));
    if (!Number.isFinite(normalized)) {
      return String(value);
    }
    return String(normalized);
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
