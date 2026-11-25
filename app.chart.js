(() => {
  const App = window.ExchangeApp || (window.ExchangeApp = {});

  const getChartThemeTokens = () => {
    const style = window.getComputedStyle(document.documentElement);
    const read = (name, fallback) => {
      const value = style ? style.getPropertyValue(name).trim() : "";
      return value || fallback;
    };
    return {
      line: read("--chart-line", "#1c1e22"),
      fillTop: read("--chart-fill-top", "rgba(217, 67, 24, 0.22)"),
      fillBottom: read("--chart-fill-bottom", "rgba(217, 67, 24, 0)"),
      grid: read("--chart-grid", "rgba(26, 27, 30, 0.09)"),
      tick: read("--chart-tick", "#5c5d57"),
      crosshair: read("--chart-crosshair", "rgba(26, 27, 30, 0.28)"),
      refLine: read("--chart-ref-line", "rgba(26, 27, 30, 0.18)"),
      tooltipBg: read("--chart-tooltip-bg", "#1e2024"),
      tooltipBorder: read("--chart-tooltip-border", "#3a3d45"),
      tooltipInk: read("--chart-tooltip-ink", "#f5f4f0"),
      point: read("--chart-point", "#d94318"),
    };
  };

  const makeAreaGradient = (ctx, height, tokens) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height || 268);
    gradient.addColorStop(0, tokens.fillTop);
    gradient.addColorStop(1, tokens.fillBottom);
    return gradient;
  };

  const highLowRefPlugin = {
    id: "highLowRef",
    beforeDatasetsDraw(chart, _args, options) {
      const dataset = chart.data?.datasets?.[0];
      if (!dataset || !Array.isArray(dataset.data) || dataset.data.length < 2) {
        return;
      }
      const stats = App.computePeriodStats(dataset.data);
      if (!stats || stats.high === stats.low) {
        return;
      }
      const yScale = chart.scales?.y;
      const { ctx, chartArea } = chart;
      if (!yScale || !chartArea) {
        return;
      }
      const yHigh = yScale.getPixelForValue(stats.high);
      const yLow = yScale.getPixelForValue(stats.low);

      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = options.color || "rgba(26, 27, 30, 0.18)";
      ctx.setLineDash([4, 4]);

      [yHigh, yLow].forEach((y) => {
        if (y >= chartArea.top && y <= chartArea.bottom) {
          ctx.beginPath();
          ctx.moveTo(chartArea.left, y);
          ctx.lineTo(chartArea.right, y);
          ctx.stroke();
        }
      });

      ctx.restore();
    },
  };

  const crosshairPlugin = {
    id: "crosshair",
    afterInit(chart) {
      chart.$crosshair = { active: false, x: 0, y: 0 };
    },
    afterEvent(chart, args) {
      const { event, inChartArea } = args;
      const state = chart.$crosshair || (chart.$crosshair = {});

      if (!inChartArea) {
        if (state.active) {
          state.active = false;
          args.changed = true;
        }
        return;
      }

      const points = chart.getElementsAtEventForMode(
        event,
        "index",
        { intersect: false },
        false
      );

      if (points.length) {
        const { x, y } = points[0].element;
        if (!state.active || state.x !== x || state.y !== y) {
          state.active = true;
          state.x = x;
          state.y = y;
          args.changed = true;
        }
      } else if (state.active) {
        state.active = false;
        args.changed = true;
      }
    },
    afterDatasetsDraw(chart, _args, options) {
      const state = chart.$crosshair;
      if (!state?.active) {
        return;
      }
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.lineWidth = options.lineWidth || 1;
      ctx.strokeStyle = options.color || "rgba(26, 27, 30, 0.28)";
      ctx.setLineDash(options.dash || [4, 4]);

      ctx.beginPath();
      ctx.moveTo(state.x, chartArea.top);
      ctx.lineTo(state.x, chartArea.bottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(chartArea.left, state.y);
      ctx.lineTo(chartArea.right, state.y);
      ctx.stroke();
      ctx.restore();
    },
  };

  App.renderPeriodStats = (values, source) => {
    const stats = App.computePeriodStats(values);

    if (App.dom.statHigh) {
      App.dom.statHigh.textContent = stats ? App.formatRate(stats.high) : "--";
    }
    if (App.dom.statLow) {
      App.dom.statLow.textContent = stats ? App.formatRate(stats.low) : "--";
    }
    if (App.dom.statDelta) {
      if (stats) {
        const up = stats.pctChange >= 0;
        App.dom.statDelta.textContent = `${up ? "▲" : "▼"} ${
          up ? "+" : ""
        }${stats.pctChange.toFixed(2)}%`;
        App.dom.statDelta.classList.toggle("up", up);
        App.dom.statDelta.classList.toggle("down", !up);
      } else {
        App.dom.statDelta.textContent = "--";
        App.dom.statDelta.classList.remove("up", "down");
      }
    }
    if (App.dom.statSource && source) {
      App.dom.statSource.textContent =
        source === "yahoo"
          ? App.t("stats.sourceYahoo")
          : App.t("stats.sourceEcb");
    }
  };

  App.applyChartTheme = () => {
    const chart = App.state.chart;
    if (!chart) {
      return;
    }
    const tokens = getChartThemeTokens();
    const dataset = chart.data?.datasets?.[0];
    if (dataset) {
      dataset.borderColor = tokens.line;
      dataset.pointHoverBackgroundColor = tokens.point;
      dataset.pointHoverBorderColor = tokens.tooltipInk;
      if (chart.ctx && typeof chart.ctx.createLinearGradient === "function") {
        dataset.backgroundColor = makeAreaGradient(
          chart.ctx,
          chart.canvas?.height || 268,
          tokens
        );
      }
    }

    if (chart.options?.plugins?.tooltip) {
      chart.options.plugins.tooltip.backgroundColor = tokens.tooltipBg;
      chart.options.plugins.tooltip.borderColor = tokens.tooltipBorder;
      chart.options.plugins.tooltip.titleColor = tokens.tooltipInk;
      chart.options.plugins.tooltip.bodyColor = tokens.tooltipInk;
    }
    if (chart.options?.plugins?.crosshair) {
      chart.options.plugins.crosshair.color = tokens.crosshair;
    }
    if (chart.options?.plugins?.highLowRef) {
      chart.options.plugins.highLowRef.color = tokens.refLine;
    }
    if (chart.options?.scales?.x?.ticks) {
      chart.options.scales.x.ticks.color = tokens.tick;
    }
    if (chart.options?.scales?.y?.grid) {
      chart.options.scales.y.grid.color = tokens.grid;
    }
    if (chart.options?.scales?.y?.ticks) {
      chart.options.scales.y.ticks.color = tokens.tick;
    }

    chart.update("none");
  };

  App.renderChart = (labels, values, pair, source = "yahoo") => {
    const canvas = document.getElementById("rateChart");
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (App.state.chart) {
      App.state.chart.destroy();
    }

    App.state.lastChartData = { labels, values, pair, source };

    const tokens = getChartThemeTokens();
    const gradient = makeAreaGradient(ctx, canvas.height || 268, tokens);
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;

    App.state.chart = new Chart(ctx, {
      type: "line",
      plugins: [highLowRefPlugin, crosshairPlugin],
      data: {
        labels,
        datasets: [
          {
            label: App.getDatasetLabel(pair),
            data: values,
            borderColor: tokens.line,
            backgroundColor: gradient,
            borderWidth: 2,
            tension: 0,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: tokens.point,
            pointHoverBorderColor: tokens.tooltipInk,
            pointHoverBorderWidth: 1.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: prefersReduced ? false : { duration: 480 },
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: tokens.tooltipBg,
            borderColor: tokens.tooltipBorder,
            borderWidth: 1,
            titleColor: tokens.tooltipInk,
            bodyColor: tokens.tooltipInk,
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            titleFont: {
              family: '"IBM Plex Mono", monospace',
              size: 11,
            },
            bodyFont: {
              family: '"IBM Plex Mono", monospace',
              size: 12,
              weight: "600",
            },
            callbacks: {
              label: (context) =>
                `${context.dataset.label}: ${App.formatRate(
                  context.parsed.y
                )}`,
            },
          },
          crosshair: {
            color: tokens.crosshair,
            dash: [4, 4],
            lineWidth: 1,
          },
          highLowRef: {
            color: tokens.refLine,
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              maxTicksLimit: 6,
              color: tokens.tick,
              font: {
                family: '"IBM Plex Mono", monospace',
                size: 11,
              },
            },
          },
          y: {
            grid: {
              color: tokens.grid,
            },
            ticks: {
              color: tokens.tick,
              font: {
                family: '"IBM Plex Mono", monospace',
                size: 11,
              },
              callback: (value) => App.formatAxisTick(value),
            },
          },
        },
      },
    });
  };

  // Realtime/historical series from the Worker (Yahoo, offshore-tracking).
  App.fetchHistoryFromWorker = async (pair, range) => {
    let qs;
    if (range.intraday) {
      qs = `pair=${pair.id}&range=${range.yRange}&interval=${range.yInterval}`;
    } else {
      const { period1, period2 } = App.getRangeUnix(range);
      qs = `pair=${pair.id}&period1=${period1}&period2=${period2}&interval=${range.yInterval}`;
    }
    const response = await fetch(`${App.LIVE_API_BASE}/history?${qs}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch history");
    }
    const data = await response.json();
    if (!data.ok || !Array.isArray(data.points)) {
      throw new Error("History unavailable");
    }
    const labels = data.points.map(([t]) =>
      range.intraday
        ? new Date(t).toLocaleTimeString(App.getLocale(), {
            hour: "2-digit",
            minute: "2-digit",
          })
        : App.formatDate(new Date(t))
    );
    const values = data.points.map(([, v]) => App.scaleRateForDisplay(v, pair));
    return { labels, values, intraday: !!range.intraday, source: "yahoo" };
  };

  // Daily fallback (ECB reference rates). No intraday equivalent exists here.
  App.fetchHistoryFromFrankfurter = async (pair, range) => {
    const { start, end } = App.getRangeDates(range);
    const response = await fetch(
      `${App.API_BASE}/${start}..${end}?base=${pair.base}&symbols=${pair.quote}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch history");
    }
    const data = await response.json();
    const labels = Object.keys(data.rates).sort();
    const values = labels.map((date) =>
      App.scaleRateForDisplay(data.rates[date][pair.quote], pair)
    );
    return { labels, values, intraday: false, source: "frankfurter" };
  };

  // opts.live = true → silent in-place refresh of the intraday line (called by
  // the poll loop). Otherwise a full (re)draw triggered by user interaction.
  App.updateChart = async (opts = {}) => {
    const live = opts && opts.live === true;
    const pair = App.pairById.get(App.state.chartPairId);
    if (!pair) {
      return;
    }
    const range = App.RANGE_PRESETS.find(
      (item) => item.id === App.state.rangeId
    );
    if (!range) {
      return;
    }
    const rangeLabel = App.getRangeLabel(range.id);

    if (!live) {
      if (typeof App.renderActiveReadout === "function") {
        App.renderActiveReadout();
      }
      App.setChartStatus(App.t("status.loading"));
    }

    let result = null;
    try {
      if (App.isLiveConfigured()) {
        try {
          result = await App.fetchHistoryFromWorker(pair, range);
        } catch (error) {
          result = null;
        }
      }
      if (!result && !range.intraday) {
        result = await App.fetchHistoryFromFrankfurter(pair, range);
      }
    } catch (error) {
      if (!live) {
        App.setChartStatus(App.t("status.chartError"));
      }
      return;
    }

    if (!result || result.labels.length === 0) {
      if (!live) {
        App.renderPeriodStats([]);
        App.setChartStatus(App.t("status.empty"));
      }
      return;
    }

    const key = `${pair.id}:${range.id}`;
    if (live && App.state.chart && App.state.chartKey === key) {
      // Extend the existing line in place — no flicker, no re-animation.
      App.state.chart.data.labels = result.labels;
      App.state.chart.data.datasets[0].data = result.values;
      App.state.lastChartData = {
        labels: result.labels,
        values: result.values,
        pair,
        source: result.source,
      };
      App.state.chart.update("none");
    } else {
      App.renderChart(result.labels, result.values, pair, result.source);
      App.state.chartKey = key;
    }

    App.renderPeriodStats(result.values, result.source);

    if (App.dom.chartMeta) {
      App.dom.chartMeta.textContent = App.t("chart.range", {
        range: rangeLabel,
        start: result.labels[0],
        end: result.labels[result.labels.length - 1],
      });
    }
    if (!live) {
      App.setChartStatus("");
    }
  };
})();
