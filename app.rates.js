(() => {
  const App = window.ExchangeApp || (window.ExchangeApp = {});

  App.setupRateCards = () => {
    if (!App.dom.ratesGrid) {
      return;
    }
    App.dom.ratesGrid.innerHTML = "";
    App.PAIRS.forEach((pair, index) => {
      const card = document.createElement("article");
      card.className = "rate-card";
      card.style.animationDelay = `${index * 70}ms`;

      card.innerHTML = `
        <div class="pair">
          <span>${pair.base}</span>
          <span>→</span>
          <span>${pair.quote}</span>
        </div>
        <div class="rate-value" id="rate-${pair.id}" aria-live="polite">--</div>
        <div class="rate-sub">
          1 ${pair.base} = <span id="rate-text-${pair.id}">--</span> ${pair.quote}
        </div>
        <div class="rate-meta" id="rate-date-${pair.id}">
          ${App.t("card.baseDate", { date: "--" })}
        </div>
        <div class="card-actions">
          <button
            class="ghost-button"
            data-pair="${pair.id}"
            type="button"
            data-i18n="card.view"
          >
            ${App.t("card.view")}
          </button>
        </div>
      `;

      App.dom.ratesGrid.appendChild(card);

      const button = card.querySelector("button");
      App.rateElements.set(pair.id, {
        value: card.querySelector(`#rate-${pair.id}`),
        text: card.querySelector(`#rate-text-${pair.id}`),
        date: card.querySelector(`#rate-date-${pair.id}`),
        button,
      });

      button.addEventListener("click", () => {
        App.setChartPair(pair.id);
        App.scrollToHistory();
      });
    });
  };

  App.fetchLatestRate = async (pair) => {
    const response = await fetch(
      `${App.API_BASE}/latest?from=${pair.base}&to=${pair.quote}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch latest rate");
    }
    const data = await response.json();
    return {
      pairId: pair.id,
      rate: data.rates[pair.quote],
      date: data.date,
    };
  };

  App.updateLiveRates = async () => {
    App.setLiveStatus(App.t("status.loading"));
    try {
      const results = await Promise.all(App.PAIRS.map(App.fetchLatestRate));
      results.forEach((result) => {
        const elements = App.rateElements.get(result.pairId);
        if (!elements) {
          return;
        }
        const displayValue = App.formatRate(result.rate);
        elements.value.textContent = displayValue;
        elements.text.textContent = displayValue;
        elements.date.textContent = App.t("card.baseDate", {
          date: result.date,
        });
      });
      const now = new Date();
      if (App.dom.lastUpdated) {
        App.dom.lastUpdated.textContent = App.t("status.updated", {
          time: now.toLocaleTimeString(App.getLocale(), {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      }
      App.setLiveStatus("");
    } catch (error) {
      App.setLiveStatus(App.t("status.liveError"));
    }
  };
})();
