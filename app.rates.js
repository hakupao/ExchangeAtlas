(() => {
  const App = window.ExchangeApp || (window.ExchangeApp = {});

  const createEl = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  App.setupRateCards = () => {
    if (!App.dom.ratesGrid) {
      return;
    }
    App.dom.ratesGrid.innerHTML = "";
    App.rateElements.clear();

    App.PAIRS.forEach((pair) => {
      const button = createEl("button", "channel-key");
      button.type = "button";
      button.dataset.pair = pair.id;
      button.setAttribute("aria-pressed", "false");

      const left = createEl("div", "channel-key-left");
      const led = createEl("span", "channel-led");
      led.setAttribute("aria-hidden", "true");

      const info = createEl("div", "channel-info");
      const pairRow = createEl("div", "channel-pair");
      const pairText = createEl("span", "", App.getDatasetLabel(pair));
      pairRow.appendChild(pairText);

      let badge = null;
      if (App.isOffshorePair(pair)) {
        badge = createEl("span", "offshore-badge", App.t("card.offshore"));
        badge.setAttribute("title", App.t("card.offshoreTip"));
        pairRow.appendChild(badge);
      }

      const nameEl = createEl("div", "channel-name", App.t(`pairs.${pair.id}`));
      info.appendChild(pairRow);
      info.appendChild(nameEl);

      left.appendChild(led);
      left.appendChild(info);

      const right = createEl("div", "channel-key-right");
      const valueEl = createEl("div", "rate-value", "--");
      valueEl.id = `rate-${pair.id}`;
      valueEl.setAttribute("aria-live", "polite");

      const changeEl = createEl("div", "rate-change", "");
      changeEl.id = `rate-change-${pair.id}`;

      const metaEl = createEl("div", "rate-meta-inline", "");
      metaEl.id = `rate-meta-${pair.id}`;
      metaEl.style.display = "none";

      right.appendChild(valueEl);
      right.appendChild(changeEl);
      right.appendChild(metaEl);

      button.appendChild(left);
      button.appendChild(right);
      App.dom.ratesGrid.appendChild(button);

      App.rateElements.set(pair.id, {
        button,
        name: nameEl,
        badge,
        value: valueEl,
        change: changeEl,
        meta: metaEl,
      });

      button.addEventListener("click", () => {
        if (typeof App.setChartPair === "function") {
          App.setChartPair(pair.id);
        }
      });
    });

    App.syncActiveChannel();
  };

  App.refreshChannelLabels = () => {
    App.PAIRS.forEach((pair) => {
      const elements = App.rateElements.get(pair.id);
      if (!elements) return;
      if (elements.name) {
        elements.name.textContent = App.t(`pairs.${pair.id}`);
      }
      if (elements.badge) {
        elements.badge.textContent = App.t("card.offshore");
        elements.badge.setAttribute("title", App.t("card.offshoreTip"));
      }
    });
  };

  App.syncActiveChannel = () => {
    App.PAIRS.forEach((pair) => {
      const elements = App.rateElements.get(pair.id);
      if (!elements || !elements.button) return;
      const isActive = pair.id === App.state.chartPairId;
      elements.button.classList.toggle("active", isActive);
      elements.button.setAttribute("aria-pressed", String(isActive));
    });
  };

  // Briefly flash a value green (up) / red (down) when it changes, like Google Finance.
  App.flashRate = (el, direction) => {
    if (!el || !direction) {
      return;
    }
    el.classList.remove("up", "down");
    void el.offsetWidth;
    el.classList.add(direction);
    window.clearTimeout(el._flashTimer);
    el._flashTimer = window.setTimeout(() => {
      el.classList.remove(direction);
    }, 900);
  };

  const formatDeltaInfo = (quote) => {
    if (
      quote &&
      typeof quote.prev === "number" &&
      quote.prev > 0 &&
      typeof quote.rate === "number" &&
      Number.isFinite(quote.rate)
    ) {
      const pct = ((quote.rate - quote.prev) / quote.prev) * 100;
      const up = pct >= 0;
      return {
        text: `${up ? "▲" : "▼"} ${up ? "+" : ""}${pct.toFixed(2)}%`,
        up,
      };
    }
    return null;
  };

  App.renderActiveReadout = (opts = {}) => {
    const pair = App.pairById.get(App.state.chartPairId);
    if (!pair) return;

    const quote = App.state.lastQuotes[pair.id] || null;
    const tag = App.isOffshorePair(pair)
      ? App.t("instrument.offshoreTag")
      : App.t("instrument.spotTag");

    if (App.dom.screenChannel) {
      App.dom.screenChannel.textContent = `${pair.ch} · ${App.getDatasetLabel(
        pair
      )} · ${tag}`;
    }

    if (App.dom.screenPrice) {
      if (quote && typeof quote.rate === "number") {
        App.dom.screenPrice.textContent = App.formatRate(
          App.scaleRateForDisplay(quote.rate, pair)
        );
        if (opts && opts.flashDirection) {
          App.flashRate(App.dom.screenPrice, opts.flashDirection);
        }
      } else {
        App.dom.screenPrice.textContent = "--";
      }
    }

    if (App.dom.screenDelta) {
      const delta = formatDeltaInfo(quote);
      if (delta) {
        App.dom.screenDelta.textContent = delta.text;
        App.dom.screenDelta.classList.toggle("up", delta.up);
        App.dom.screenDelta.classList.toggle("down", !delta.up);
      } else {
        App.dom.screenDelta.textContent = "";
        App.dom.screenDelta.classList.remove("up", "down");
      }
    }
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
    let activeFlashDirection = null;

    App.PAIRS.forEach((pair) => {
      const quote = data.pairs ? data.pairs[pair.id] : null;
      const elements = App.rateElements.get(pair.id);
      if (!quote || !elements || quote.rate == null) {
        return;
      }

      App.state.lastQuotes[pair.id] = quote;

      const displayValue = App.formatRate(
        App.scaleRateForDisplay(quote.rate, pair)
      );

      // Flash on tick.
      const prevTick = App.lastRates[pair.id];
      let direction = null;
      if (typeof prevTick === "number" && quote.rate !== prevTick) {
        direction = quote.rate > prevTick ? "up" : "down";
        App.flashRate(elements.value, direction);
        if (pair.id === App.state.chartPairId) {
          activeFlashDirection = direction;
        }
      }
      App.lastRates[pair.id] = quote.rate;

      elements.value.textContent = displayValue;

      // Day change vs previous close (colored % + directional triangle).
      const delta = formatDeltaInfo(quote);
      if (elements.change) {
        if (delta) {
          elements.change.textContent = delta.text;
          elements.change.classList.toggle("up", delta.up);
          elements.change.classList.toggle("down", !delta.up);
          elements.change.style.display = "";
        } else {
          elements.change.textContent = "";
          elements.change.classList.remove("up", "down");
          elements.change.style.display = "none";
        }
      }

      // Meta line shown only for daily fallback base date or market-closed state.
      if (elements.meta) {
        if (quote.date) {
          elements.meta.textContent = App.t("card.baseDate", {
            date: quote.date,
          });
          elements.meta.style.display = "";
        } else if (quote.state && quote.state !== "REGULAR") {
          elements.meta.textContent = App.t("status.marketClosed");
          elements.meta.style.display = "";
        } else {
          elements.meta.textContent = "";
          elements.meta.style.display = "none";
        }
      }
    });

    App.renderActiveReadout({ flashDirection: activeFlashDirection });

    if (typeof App.refreshConverterFromRate === "function") {
      App.refreshConverterFromRate();
    }

    const now = new Date();
    App.state.lastUpdatedAt = now;
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
    if (App.dom.refreshBtn) {
      App.dom.refreshBtn.classList.add("is-loading");
    }
    let data = null;

    try {
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
    } finally {
      if (App.dom.refreshBtn) {
        App.dom.refreshBtn.classList.remove("is-loading");
      }
    }
  };
})();
