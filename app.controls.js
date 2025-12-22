(() => {
  const App = window.ExchangeApp || (window.ExchangeApp = {});

  App.setupControls = () => {
    if (App.dom.pairSelect) {
      App.PAIRS.forEach((pair) => {
        const option = document.createElement("option");
        option.value = pair.id;
        option.textContent = App.getDatasetLabel(pair);
        App.dom.pairSelect.appendChild(option);
      });
      App.dom.pairSelect.value = App.state.chartPairId;
      App.dom.pairSelect.addEventListener("change", () => {
        App.state.chartPairId = App.dom.pairSelect.value;
        App.updateChart();
      });
    }

    if (App.dom.rangeButtons) {
      App.RANGE_PRESETS.forEach((range) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = App.getRangeLabel(range.id);
        button.dataset.range = range.id;
        if (range.id === App.state.rangeId) {
          button.classList.add("active");
        }
        button.addEventListener("click", () => {
          App.setRange(range.id);
          App.updateChart();
        });
        App.dom.rangeButtons.appendChild(button);
      });
    }

    if (App.dom.updateChartBtn) {
      App.dom.updateChartBtn.addEventListener("click", App.updateChart);
    }
    if (App.dom.refreshBtn) {
      App.dom.refreshBtn.addEventListener("click", App.updateLiveRates);
    }
  };

  App.setRange = (rangeId) => {
    App.state.rangeId = rangeId;
    if (!App.dom.rangeButtons) {
      return;
    }
    Array.from(App.dom.rangeButtons.children).forEach((button) => {
      button.classList.toggle("active", button.dataset.range === rangeId);
    });
  };

  App.setChartPair = (pairId) => {
    App.state.chartPairId = pairId;
    if (App.dom.pairSelect) {
      App.dom.pairSelect.value = pairId;
    }
    App.updateChart();
  };

  App.scrollToHistory = () => {
    const historySection = document.getElementById("history");
    if (!historySection) {
      return;
    }
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    historySection.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "start",
    });
  };
})();
