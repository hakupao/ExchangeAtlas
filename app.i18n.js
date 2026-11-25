(() => {
  const App = window.ExchangeApp || (window.ExchangeApp = {});

  App.I18N = {
    zh: {
      htmlLang: "zh-CN",
      title: "Exchange Atlas | 汇率观测仪",
      instrument: {
        subtitle: "汇率观测仪 · FX-06",
        liveTag: "15S 实时",
        channelsLabel: "汇率通道列表",
        spotTag: "即期",
        offshoreTag: "CNH 离岸",
      },
      pairs: {
        USD_CNY: "美元兑人民币",
        USD_JPY: "美元兑日元",
        CNY_JPY: "人民币兑日元",
        JPY_CNY: "100 日元兑人民币",
        AUD_CNY: "澳元兑人民币",
        AUD_JPY: "澳元兑日元",
      },
      controls: {
        refresh: "刷新",
        refreshAria: "手动刷新实时汇率",
        rangeLabel: "时间范围",
      },
      theme: {
        toDark: "切换至阳极暗灰涂装",
        toLight: "切换至陶瓷浅灰涂装",
      },
      status: {
        updating: "同步中...",
        loading: "加载中...",
        liveError: "实时汇率获取失败",
        chartError: "图表加载失败，请重试",
        empty: "暂无数据",
        updated: "{time}",
        marketClosed: "休市中",
      },
      chart: {
        prompt: "选择时间范围查看走势",
        legend: "{amount} {base} 兑 {quote}",
        range: "{range} · {start} 至 {end}",
      },
      stats: {
        high: "区间高",
        low: "区间低",
        delta: "区间涨跌",
        sourceYahoo: "Yahoo 实时",
        sourceEcb: "ECB 日参考",
      },
      converter: {
        label: "换算",
        baseAria: "输入基准币种金额",
        quoteAria: "输入目标币种金额",
        presetsAria: "快捷换算金额",
      },
      range: {
        "1d": "今日",
        "7d": "7天",
        "30d": "30天",
        "6m": "6月",
        "1y": "1年",
        "3y": "3年",
      },
      footer: {
        source: "实时源：Yahoo Finance（Cloudflare Worker 代理）· 历史回退：Frankfurter (ECB)",
        note: "提示：人民币实时价为离岸参考（CNH-tracking），行情略有延迟",
        projectLabel: "GitHub",
      },
      card: {
        baseDate: "基准日 {date}",
        live: "实时",
        offshore: "CNH",
        offshoreTip: "免费源提供的是离岸人民币（CNH-tracking）参考价，非央行在岸中间价",
      },
      language: {
        label: "语言切换",
      },
    },
    en: {
      htmlLang: "en",
      title: "Exchange Atlas | FX Monitor",
      instrument: {
        subtitle: "FX MONITOR · FX-06",
        liveTag: "15S LIVE",
        channelsLabel: "Currency channels",
        spotTag: "SPOT",
        offshoreTag: "CNH OFFSHORE",
      },
      pairs: {
        USD_CNY: "US Dollar / Yuan",
        USD_JPY: "US Dollar / Yen",
        CNY_JPY: "Yuan / Yen",
        JPY_CNY: "100 Yen / Yuan",
        AUD_CNY: "Australian Dollar / Yuan",
        AUD_JPY: "Australian Dollar / Yen",
      },
      controls: {
        refresh: "Sync",
        refreshAria: "Refresh live exchange rates",
        rangeLabel: "Time range",
      },
      theme: {
        toDark: "Switch to Anodized Slate dark finish",
        toLight: "Switch to Ceramic Ivory light finish",
      },
      status: {
        updating: "Syncing...",
        loading: "Loading...",
        liveError: "Live feed unavailable",
        chartError: "Chart failed to load",
        empty: "No data",
        updated: "{time}",
        marketClosed: "Closed",
      },
      chart: {
        prompt: "Select a range to inspect trend",
        legend: "{amount} {base} to {quote}",
        range: "{range} · {start} to {end}",
      },
      stats: {
        high: "HIGH",
        low: "LOW",
        delta: "DELTA",
        sourceYahoo: "Yahoo Live",
        sourceEcb: "ECB Daily",
      },
      converter: {
        label: "CONVERT",
        baseAria: "Enter base currency amount",
        quoteAria: "Enter quote currency amount",
        presetsAria: "Quick amount presets",
      },
      range: {
        "1d": "1D",
        "7d": "7D",
        "30d": "30D",
        "6m": "6M",
        "1y": "1Y",
        "3y": "3Y",
      },
      footer: {
        source: "Live: Yahoo Finance (via Cloudflare Worker) · History fallback: Frankfurter (ECB)",
        note: "Note: CNY quotes track offshore yuan (CNH) with slight delay",
        projectLabel: "GitHub",
      },
      card: {
        baseDate: "As of {date}",
        live: "Live",
        offshore: "CNH",
        offshoreTip: "Free feeds quote offshore yuan (CNH-tracking), not the PBOC onshore fixing",
      },
      language: {
        label: "Language switch",
      },
    },
  };

  App.getInitialLanguage = () => {
    let saved = null;
    try {
      saved = localStorage.getItem("lang");
    } catch (error) {
      saved = null;
    }
    if (saved && App.SUPPORTED_LANGS.includes(saved)) {
      return saved;
    }
    return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
  };

  App.getLocale = () => (App.state.language === "zh" ? "zh-CN" : "en-US");

  App.t = (key, vars = {}) => {
    const dictionary = App.I18N[App.state.language] || App.I18N.en;
    const template = key.split(".").reduce((result, part) => {
      if (!result || typeof result !== "object") {
        return null;
      }
      return result[part];
    }, dictionary);

    if (template === null || template === undefined) {
      return key;
    }

    return String(template).replace(/\{(\w+)\}/g, (match, token) => {
      if (Object.prototype.hasOwnProperty.call(vars, token)) {
        return vars[token];
      }
      return match;
    });
  };

  App.updateLanguageButtons = () => {
    App.dom.langButtons.forEach((button) => {
      const isActive = button.dataset.lang === App.state.language;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  };

  App.getRangeLabel = (rangeId) => App.t(`range.${rangeId}`);

  App.updateRangeButtonsText = () => {
    if (!App.dom.rangeButtons) {
      return;
    }
    Array.from(App.dom.rangeButtons.children).forEach((button) => {
      const rangeId = button.dataset.range;
      if (rangeId) {
        button.textContent = App.getRangeLabel(rangeId);
      }
    });
  };

  App.applyTranslations = () => {
    const langPack = App.I18N[App.state.language] || App.I18N.en;
    document.documentElement.lang = langPack.htmlLang;
    document.title = App.t("title");
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = App.t(element.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-title]").forEach((element) => {
      element.setAttribute("title", App.t(element.dataset.i18nTitle));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
      element.setAttribute("aria-label", App.t(element.dataset.i18nAria));
    });
    if (App.dom.langSwitch) {
      App.dom.langSwitch.setAttribute("aria-label", App.t("language.label"));
    }
    if (App.dom.lastUpdated) {
      if (App.state.lastUpdatedAt instanceof Date) {
        App.dom.lastUpdated.textContent = App.t("status.updated", {
          time: App.state.lastUpdatedAt.toLocaleTimeString(App.getLocale(), {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        });
      } else {
        App.dom.lastUpdated.textContent = App.t("status.updating");
      }
    }
    if (App.dom.chartMeta) {
      const cached = App.state.lastChartData;
      if (cached && Array.isArray(cached.labels) && cached.labels.length > 0) {
        App.dom.chartMeta.textContent = App.t("chart.range", {
          range: App.getRangeLabel(cached.rangeId || App.state.rangeId),
          start: cached.labels[0],
          end: cached.labels[cached.labels.length - 1],
        });
      } else {
        App.dom.chartMeta.textContent = App.t("chart.prompt");
      }
    }
    App.updateRangeButtonsText();
    App.updateLanguageButtons();
  };

  App.setLanguage = (lang) => {
    if (!App.I18N[lang] || lang === App.state.language) {
      return;
    }
    App.state.language = lang;
    try {
      localStorage.setItem("lang", lang);
    } catch (error) {
      // Ignore storage failures in private/restricted modes.
    }
    App.applyTranslations();
    if (typeof App.refreshChannelLabels === "function") {
      App.refreshChannelLabels();
    }
    if (typeof App.updateThemeToggleMeta === "function") {
      const prefersDark =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      App.updateThemeToggleMeta(prefersDark);
    }
    if (typeof App.renderActiveReadout === "function") {
      App.renderActiveReadout();
    }
    if (
      App.state.lastChartData &&
      typeof App.renderPeriodStats === "function"
    ) {
      App.renderPeriodStats(
        App.state.lastChartData.values,
        App.state.lastChartData.source
      );
    }
    if (typeof App.updateLiveRates === "function") {
      App.updateLiveRates();
    }
    if (typeof App.updateChart === "function") {
      App.updateChart();
    }
  };

  App.setupLanguageToggle = () => {
    if (!App.dom.langButtons.length) {
      return;
    }
    App.dom.langButtons.forEach((button) => {
      button.addEventListener("click", () =>
        App.setLanguage(button.dataset.lang)
      );
    });
    App.updateLanguageButtons();
  };
})();
