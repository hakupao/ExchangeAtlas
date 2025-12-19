(() => {
  const App = window.ExchangeApp || (window.ExchangeApp = {});

  const init = () => {
    if (typeof App.getInitialLanguage === "function") {
      App.state.language = App.getInitialLanguage();
    }

    if (typeof App.setupRateCards === "function") {
      App.setupRateCards();
    }
    if (typeof App.setupControls === "function") {
      App.setupControls();
    }
    if (typeof App.applyTranslations === "function") {
      App.applyTranslations();
    }
    if (typeof App.setupLanguageToggle === "function") {
      App.setupLanguageToggle();
    }
    if (typeof App.updateLiveRates === "function") {
      App.updateLiveRates();
      setInterval(App.updateLiveRates, 60 * 1000);
    }
    if (typeof App.updateChart === "function") {
      App.updateChart();
    }
  };

  init();
})();
