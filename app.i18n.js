(() => {
  const App = window.ExchangeApp || (window.ExchangeApp = {});

  App.I18N = {
    zh: {
      htmlLang: "zh-CN",
      title: "汇率观测站 | Frankfurter",
      eyebrow: "Frankfurter 汇率接口 · 每 60 秒刷新",
      headline: "汇率观测站",
      subhead:
        "关注 USD/CNY、AUD/JPY 等 6 组热门币种对。实时获取最新价，并查看近几天、几个月、几年的趋势曲线。",
      metrics: {
        pairsLabel: "覆盖币种对",
        pairsValue: "6",
        spanLabel: "历史跨度",
        spanValue: "3 年",
        sourceLabel: "数据来源",
        sourceValue: "Frankfurter",
      },
      sections: {
        liveTitle: "实时汇率",
        liveSubtitle: "点击卡片即可快速切换到对应走势。",
        historyTitle: "历史走势",
        historySubtitle: "可查看近几天、近几个月、近几年的折线图。",
      },
      controls: {
        refresh: "刷新",
        updateChart: "更新图表",
        pairLabel: "币种对",
        rangeLabel: "时间范围",
      },
      status: {
        updating: "更新中...",
        loading: "加载中...",
        liveError: "实时汇率获取失败，请稍后重试。",
        chartError: "图表加载失败，请稍后重试。",
        empty: "暂无数据",
        updated: "更新时间: {time}",
      },
      chart: {
        prompt: "请选择范围查看走势",
        legend: "1 {base} 兑 {quote}",
        range: "{range} · {start} 至 {end}",
      },
      range: {
        "7d": "近7天",
        "30d": "近30天",
        "6m": "近6个月",
        "1y": "近1年",
        "3y": "近3年",
      },
      footer: {
        source: "数据源：Frankfurter",
        note: "提示：Frankfurter 以工作日汇率为准",
        projectLabel: "项目地址",
      },
      card: {
        baseDate: "基准日: {date}",
        view: "查看走势",
      },
      language: {
        label: "语言切换",
      },
    },
    en: {
      htmlLang: "en",
      title: "Exchange Atlas | Frankfurter",
      eyebrow: "Frankfurter FX feed · refreshes every 60s",
      headline: "Exchange Atlas",
      subhead:
        "Track USD/CNY, AUD/JPY, and 6 key currency pairs. Get live quotes and trend lines across days, months, and years.",
      metrics: {
        pairsLabel: "Pairs covered",
        pairsValue: "6",
        spanLabel: "History span",
        spanValue: "3 years",
        sourceLabel: "Data source",
        sourceValue: "Frankfurter",
      },
      sections: {
        liveTitle: "Live Rates",
        liveSubtitle: "Tap a card to jump to its trend.",
        historyTitle: "History Trends",
        historySubtitle: "See line charts for days, months, or years.",
      },
      controls: {
        refresh: "Refresh",
        updateChart: "Update chart",
        pairLabel: "Currency pair",
        rangeLabel: "Time range",
      },
      status: {
        updating: "Updating...",
        loading: "Loading...",
        liveError: "Live rates failed to load. Please try again.",
        chartError: "Chart failed to load. Please try again.",
        empty: "No data yet.",
        updated: "Updated: {time}",
      },
      chart: {
        prompt: "Select a range to view the trend",
        legend: "1 {base} to {quote}",
        range: "{range} · {start} to {end}",
      },
      range: {
        "7d": "Last 7 days",
        "30d": "Last 30 days",
        "6m": "Last 6 months",
        "1y": "Last 1 year",
        "3y": "Last 3 years",
      },
      footer: {
        source: "Source: Frankfurter",
        note: "Tip: Frankfurter provides weekday rates",
        projectLabel: "Project",
      },
      card: {
        baseDate: "Base date: {date}",
        view: "View trend",
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
    if (App.dom.langSwitch) {
      App.dom.langSwitch.setAttribute("aria-label", App.t("language.label"));
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
    }
    App.applyTranslations();
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
      button.addEventListener("click", () => App.setLanguage(button.dataset.lang));
    });
    App.updateLanguageButtons();
  };
})();
