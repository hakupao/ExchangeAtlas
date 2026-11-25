(() => {
  const App = window.ExchangeApp || (window.ExchangeApp = {});

  const init = () => {
    if (typeof App.getInitialLanguage === "function") {
      App.state.language = App.getInitialLanguage();
    }
    if (typeof App.setupThemeToggle === "function") {
      App.setupThemeToggle();
    }
    if (typeof App.setupRateCards === "function") {
      App.setupRateCards();
    }
    if (typeof App.setupControls === "function") {
      App.setupControls();
    }
    if (typeof App.setupConverter === "function") {
      App.setupConverter();
    }
    if (typeof App.applyTranslations === "function") {
      App.applyTranslations();
    }
    if (typeof App.setupLanguageToggle === "function") {
      App.setupLanguageToggle();
    }
    if (typeof App.syncActiveChannel === "function") {
      App.syncActiveChannel();
    }
    if (typeof App.renderActiveReadout === "function") {
      App.renderActiveReadout();
    }
    if (typeof App.updateLiveRates === "function") {
      App.updateLiveRates();
      // Poll every 15s; the Worker caches ~20s so upstream load stays tiny.
      setInterval(() => {
        App.updateLiveRates();
        // If the chart is on an intraday range, extend its line live too.
        const range = App.RANGE_PRESETS.find(
          (item) => item.id === App.state.rangeId
        );
        if (
          range &&
          range.intraday &&
          App.isLiveConfigured() &&
          typeof App.updateChart === "function"
        ) {
          App.updateChart({ live: true });
        }
      }, 15 * 1000);
    }
    if (typeof App.updateChart === "function") {
      App.updateChart();
    }
  };

  init();
})();
