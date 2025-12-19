(() => {
  const App = window.ExchangeApp || (window.ExchangeApp = {});

  App.renderChart = (labels, values, pair) => {
    const canvas = document.getElementById("rateChart");
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (App.state.chart) {
      App.state.chart.destroy();
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 300);
    gradient.addColorStop(0, "rgba(224, 122, 95, 0.35)");
    gradient.addColorStop(1, "rgba(224, 122, 95, 0)");

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;

    App.state.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: `${pair.base} → ${pair.quote}`,
            data: values,
            borderColor: "#e07a5f",
            backgroundColor: gradient,
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: prefersReduced ? false : { duration: 700 },
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) =>
                `${context.dataset.label}: ${App.formatRate(
                  context.parsed.y
                )}`,
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              maxTicksLimit: 6,
              color: "#5f6e76",
            },
          },
          y: {
            grid: {
              color: "rgba(16, 33, 42, 0.08)",
            },
            ticks: {
              color: "#5f6e76",
              callback: (value) => App.formatRate(value),
            },
          },
        },
      },
    });
  };

  App.updateChart = async () => {
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
    const { start, end } = App.getRangeDates(range);
    const rangeLabel = App.getRangeLabel(range.id);

    if (App.dom.chartTitle) {
      App.dom.chartTitle.textContent = `${pair.base} → ${pair.quote}`;
    }
    if (App.dom.chartMeta) {
      App.dom.chartMeta.textContent = App.t("chart.range", {
        range: rangeLabel,
        start,
        end,
      });
    }
    if (App.dom.chartLegend) {
      App.dom.chartLegend.textContent = App.t("chart.legend", {
        base: pair.base,
        quote: pair.quote,
      });
    }
    App.setChartStatus(App.t("status.loading"));

    try {
      const response = await fetch(
        `${App.API_BASE}/${start}..${end}?from=${pair.base}&to=${pair.quote}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }
      const data = await response.json();
      const labels = Object.keys(data.rates).sort();
      const values = labels.map((date) => data.rates[date][pair.quote]);

      if (labels.length === 0) {
        App.setChartStatus(App.t("status.empty"));
        return;
      }

      App.renderChart(labels, values, pair);
      if (App.dom.chartMeta) {
        App.dom.chartMeta.textContent = App.t("chart.range", {
          range: rangeLabel,
          start: labels[0],
          end: labels[labels.length - 1],
        });
      }
      App.setChartStatus("");
    } catch (error) {
      App.setChartStatus(App.t("status.chartError"));
    }
  };
})();
