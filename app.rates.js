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
      const displayAmount = App.getDisplayAmount(pair);
      const offshoreBadge = App.isOffshorePair(pair)
        ? `<span class="offshore-badge" title="${App.t(
            "card.offshoreTip"
          )}">${App.t("card.offshore")}</span>`
        : "";

      card.innerHTML = `
        <div class="pair">
          <span>${pair.base}</span>
          <span>→</span>
          <span>${pair.quote}</span>
          ${offshoreBadge}
        </div>
        <div class="rate-value" id="rate-${pair.id}" aria-live="polite">--</div>
        <div class="rate-change" id="rate-change-${pair.id}"></div>
        <div class="rate-sub">
          ${displayAmount} ${pair.base} = <span id="rate-text-${pair.id}">--</span> ${pair.quote}
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
        change: card.querySelector(`#rate-change-${pair.id}`),
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

  // Briefly flash a value green (up) / red (down) when it changes, like Google Finance.
  App.flashRate = (el, direction) => {
    if (!el) {
      return;
    }
    el.classList.remove("up", "down");
    // Force reflow so the animation restarts even on consecutive ticks.
    void el.offsetWidth;
    el.classList.add(direction);
    window.clearTimeout(el._flashTimer);
    el._flashTimer = window.setTimeout(() => {
      el.classList.remove(direction);
    }, 900);
  };

  // ---- Data sources -------------------------------------------------------

  // Primary: one call to the Cloudflare Worker returns all pairs at once.
  App.fetchLiveFromWorker = async () => {
    const response = await fetch(`${App.LIVE_API_BASE}/rates`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch live rates");
    }
    return response.json(); // { asOf, source, pairs: { ID: {rate, prev, state, t} } }
  };

  // Fallback: ECB daily reference rates (no realtime movement, but never breaks).
  App.fetchLatestRate = async (pair) => {
    const response = await fetch(
      `${App.API_BASE}/latest?base=${pair.base}&symbols=${pair.quote}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch latest rate");
    }
    const data = await response.json();
    return { pairId: pair.id, rate: data.rates[pair.quote], date: data.date };
  };

  App.fetchLiveFromFrankfurter = async () => {
    const results = await Promise.all(App.PAIRS.map(App.fetchLatestRate));
    const pairs = {};
    results.forEach((result) => {
      pairs[result.pairId] = {
        rate: result.rate,
        prev: null,
        state: null,
        date: result.date,
        source: "frankfurter",
      };
    });
    return { asOf: Date.now(), source: "frankfurter", pairs };
  };

  // ---- Rendering ----------------------------------------------------------

  App.renderLiveRates = (data) => {
    App.PAIRS.forEach((pair) => {
      const quote = data.pairs ? data.pairs[pair.id] : null;
      const elements = App.rateElements.get(pair.id);
      if (!quote || !elements || quote.rate == null) {
        return;
      }
      const pairObj = App.pairById.get(pair.id);
      const displayValue = App.formatRate(
        App.scaleRateForDisplay(quote.rate, pairObj)
      );

      // Flash on tick.
      const prevTick = App.lastRates[pair.id];
      if (typeof prevTick === "number" && quote.rate !== prevTick) {
        App.flashRate(elements.value, quote.rate > prevTick ? "up" : "down");
      }
      App.lastRates[pair.id] = quote.rate;

      elements.value.textContent = displayValue;
      elements.text.textContent = displayValue;

      // Day change vs previous close (Google-Finance-style colored %).
      if (elements.change) {
        if (
          typeof quote.prev === "number" &&
          quote.prev > 0 &&
          typeof quote.rate === "number"
        ) {
          const pct = ((quote.rate - quote.prev) / quote.prev) * 100;
          const up = pct >= 0;
          elements.change.textContent = `${up ? "▲" : "▼"} ${
            up ? "+" : ""
          }${pct.toFixed(2)}%`;
          elements.change.classList.toggle("up", up);
          elements.change.classList.toggle("down", !up);
          elements.change.style.display = "";
        } else {
          elements.change.textContent = "";
          elements.change.style.display = "none";
        }
      }

      // Meta line: daily base date (fallback) / market closed / live.
      if (elements.date) {
        if (quote.date) {
          elements.date.textContent = App.t("card.baseDate", {
            date: quote.date,
          });
        } else if (quote.state && quote.state !== "REGULAR") {
          elements.date.textContent = App.t("status.marketClosed");
        } else {
          elements.date.textContent = App.t("card.live");
        }
      }
    });

    const now = new Date();
    if (App.dom.lastUpdated) {
      App.dom.lastUpdated.textContent = App.t("status.updated", {
        time: now.toLocaleTimeString(App.getLocale(), {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      });
    }
  };

  App.updateLiveRates = async () => {
    App.setLiveStatus(App.t("status.loading"));
    let data = null;

    if (App.isLiveConfigured()) {
      try {
        data = await App.fetchLiveFromWorker();
      } catch (error) {
        data = null; // fall through to Frankfurter
      }
    }

    if (!data) {
      try {
        data = await App.fetchLiveFromFrankfurter();
      } catch (error) {
        App.setLiveStatus(App.t("status.liveError"));
        return;
      }
    }

    App.renderLiveRates(data);
    App.setLiveStatus("");
  };
})();
