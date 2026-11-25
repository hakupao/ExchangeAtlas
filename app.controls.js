(() => {
  const App = window.ExchangeApp || (window.ExchangeApp = {});

  const SCHEME_KEY = "color-scheme";

  const formatConvertedValue = (value) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return "";
    }
    if (value === 0) {
      return "0";
    }
    const decimals = Math.abs(value) < 0.01 ? 4 : 2;
    const rounded = Number(value.toFixed(decimals));
    return Number.isFinite(rounded) ? String(rounded) : "";
  };

  const getColorSchemeMeta = () =>
    document.querySelector('meta[name="color-scheme"]');

  const readStoredScheme = () => {
    try {
      const value = localStorage.getItem(SCHEME_KEY);
      if (value === "light" || value === "dark") {
        return value;
      }
      return null;
    } catch (error) {
      const meta = getColorSchemeMeta();
      const content = meta ? meta.content : "";
      return content === "light" || content === "dark" ? content : null;
    }
  };

  const writeStoredScheme = (nextStored) => {
    try {
      if (nextStored === "light" || nextStored === "dark") {
        localStorage.setItem(SCHEME_KEY, nextStored);
      } else {
        localStorage.removeItem(SCHEME_KEY);
      }
    } catch (error) {
      // Theme still applies via <meta> even when storage is unavailable.
    }
  };

  App.updateThemeToggleMeta = (systemPrefersDark) => {
    const meta = getColorSchemeMeta();
    const effective = App.getEffectiveTheme(
      meta ? meta.content : "light dark",
      systemPrefersDark
    );
    if (App.dom.themeToggle) {
      const tipKey = effective === "dark" ? "theme.toLight" : "theme.toDark";
      App.dom.themeToggle.setAttribute("title", App.t(tipKey));
    }
  };

  App.setupThemeToggle = () => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");

    const syncFromExternal = (newValue) => {
      const meta = getColorSchemeMeta();
      if (meta) {
        meta.content =
          newValue === "light" || newValue === "dark" ? newValue : "light dark";
      }
      App.updateThemeToggleMeta(!!mql.matches);
      if (typeof App.applyChartTheme === "function") {
        App.applyChartTheme();
      }
    };

    if (App.dom.themeToggle) {
      App.dom.themeToggle.addEventListener("click", () => {
        const stored = readStoredScheme();
        const next = App.resolveThemeToggle(stored, !!mql.matches);
        writeStoredScheme(next.nextStored);
        const meta = getColorSchemeMeta();
        if (meta) {
          meta.content = next.metaContent;
        }
        App.updateThemeToggleMeta(!!mql.matches);
        if (typeof App.applyChartTheme === "function") {
          App.applyChartTheme();
        }
      });
    }

    if (mql && typeof mql.addEventListener === "function") {
      mql.addEventListener("change", () => {
        App.updateThemeToggleMeta(!!mql.matches);
        if (typeof App.applyChartTheme === "function") {
          App.applyChartTheme();
        }
      });
    }

    window.addEventListener("storage", (event) => {
      if (!event || event.key === SCHEME_KEY) {
        syncFromExternal(event ? event.newValue : readStoredScheme());
      }
    });

    App.updateThemeToggleMeta(!!mql.matches);
  };

  App.refreshConverterFromRate = () => {
    const pair = App.pairById.get(App.state.chartPairId);
    if (!pair) return;

    if (App.dom.convBaseCode) {
      App.dom.convBaseCode.textContent = pair.base;
    }
    if (App.dom.convQuoteCode) {
      App.dom.convQuoteCode.textContent = pair.quote;
    }

    const baseEl = App.dom.convBaseInput;
    const quoteEl = App.dom.convQuoteInput;
    if (!baseEl || !quoteEl) return;

    const rawRate = App.lastRates[pair.id];
    const side = App.state.converter.side || "base";

    if (side === "quote") {
      const rawText = String(quoteEl.value ?? "").trim();
      if (!rawText) {
        baseEl.value = "";
        return;
      }
      const amount = Number(rawText);
      const converted = App.convertAmount(amount, rawRate, "quoteToBase");
      baseEl.value = converted === null ? "" : formatConvertedValue(converted);
    } else {
      const rawText = String(baseEl.value ?? "").trim();
      if (!rawText) {
        quoteEl.value = "";
        return;
      }
      const amount = Number(rawText);
      const converted = App.convertAmount(amount, rawRate, "baseToQuote");
      quoteEl.value = converted === null ? "" : formatConvertedValue(converted);
    }
  };

  App.setupConverter = () => {
    const baseEl = App.dom.convBaseInput;
    const quoteEl = App.dom.convQuoteInput;

    if (baseEl) {
      baseEl.addEventListener("input", () => {
        App.state.converter.side = "base";
        App.state.converter.baseAmount = baseEl.value;
        App.refreshConverterFromRate();
      });
    }

    if (quoteEl) {
      quoteEl.addEventListener("input", () => {
        App.state.converter.side = "quote";
        App.state.converter.quoteAmount = quoteEl.value;
        App.refreshConverterFromRate();
      });
    }

    if (App.dom.convPresets) {
      App.dom.convPresets.addEventListener("click", (event) => {
        const target = event?.target;
        const btn =
          target && typeof target.closest === "function"
            ? target.closest("button[data-amount]")
            : target?.dataset?.amount
            ? target
            : null;
        if (!btn || !btn.dataset?.amount) {
          return;
        }
        App.state.converter.side = "base";
        App.state.converter.baseAmount = btn.dataset.amount;
        if (baseEl) {
          baseEl.value = btn.dataset.amount;
        }
        App.refreshConverterFromRate();
      });
    }

    App.refreshConverterFromRate();
  };

  App.setupControls = () => {
    if (App.dom.rangeButtons) {
      App.dom.rangeButtons.innerHTML = "";
      App.RANGE_PRESETS.forEach((range) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = App.getRangeLabel(range.id);
        button.dataset.range = range.id;
        const isActive = range.id === App.state.rangeId;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
        button.addEventListener("click", () => {
          App.setRange(range.id);
          if (typeof App.updateChart === "function") {
            App.updateChart();
          }
        });
        App.dom.rangeButtons.appendChild(button);
      });
    }

    if (App.dom.refreshBtn) {
      App.dom.refreshBtn.addEventListener("click", () => {
        if (typeof App.updateLiveRates === "function") {
          App.updateLiveRates();
        }
      });
    }
  };

  App.setRange = (rangeId) => {
    App.state.rangeId = rangeId;
    if (!App.dom.rangeButtons) {
      return;
    }
    Array.from(App.dom.rangeButtons.children).forEach((button) => {
      const isActive = button.dataset.range === rangeId;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  };

  App.scrollToPlotterIfNeeded = () => {
    if (typeof window.innerWidth === "number" && window.innerWidth >= 960) {
      return;
    }
    const screen = document.querySelector(".plotter-screen");
    if (!screen || typeof screen.getBoundingClientRect !== "function") {
      return;
    }
    const rect = screen.getBoundingClientRect();
    const outOfView =
      rect.top > (window.innerHeight || 800) * 0.65 || rect.top < 0;
    if (!outOfView || typeof screen.scrollIntoView !== "function") {
      return;
    }
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    screen.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "nearest",
    });
  };

  App.setChartPair = (pairId) => {
    if (!App.pairById.has(pairId)) {
      return;
    }
    App.state.chartPairId = pairId;
    if (typeof App.syncActiveChannel === "function") {
      App.syncActiveChannel();
    }
    if (typeof App.renderActiveReadout === "function") {
      App.renderActiveReadout();
    }
    if (typeof App.refreshConverterFromRate === "function") {
      App.refreshConverterFromRate();
    }
    if (typeof App.updateChart === "function") {
      App.updateChart();
    }
    App.scrollToPlotterIfNeeded();
  };
})();
