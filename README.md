[English](ExchangeAtlas--README.md) | [中文](ExchangeAtlas--README_CN.md)

<div align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=700&size=32&duration=3000&pause=1000&color=10B981&center=true&vCenter=true&width=800&height=100&lines=ExchangeAtlas;Real-Time+Currency+Dashboard;Six+Major+Pairs" alt="ExchangeAtlas"/>
</div>

<div align="center">

[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat-square&logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
[![ES2023](https://img.shields.io/badge/ES2023-Support-success?style=flat-square)](https://tc39.es/ecma262/)
[![Frankfurter API](https://img.shields.io/badge/Frankfurter-Free%20API-blue?style=flat-square)](https://www.frankfurter.app/)
[![Bilingual](https://img.shields.io/badge/Bilingual-EN%2FZH-success?style=flat-square)](https://exchange.bojiang.org)
[![Live Demo](https://img.shields.io/badge/Live-exchange.bojiang.org-green?style=flat-square)](https://exchange.bojiang.org)

**Monitor 6 major currency pairs in real-time · Beautiful interactive charts · Free, privacy-first API**

</div>

---

## About This Project

I'm **Bojiang**, an expat living in Japan. I work across multiple currencies—JPY (work), CNY (family), USD (international projects)—and need to track exchange rates at a glance.

Existing currency apps? Bloated, ad-ridden, collecting your data. So I built **ExchangeAtlas**—a clean, lightweight dashboard for the six currency pairs I care about most.

---

## 🎯 Features

### Six Currency Pairs Tracked

| Pair | Use Case | Current Support |
|------|----------|-----------------|
| **USD/CNY** | RMB ↔ US Dollar | ✅ Real-time |
| **USD/JPY** | Yen ↔ US Dollar | ✅ Real-time |
| **CNY/JPY** | RMB ↔ Yen | ✅ Real-time |
| **JPY/CNY** | Yen ↔ RMB (inverse) | ✅ Real-time |
| **AUD/CNY** | Australian Dollar ↔ RMB | ✅ Real-time |
| **AUD/JPY** | Australian Dollar ↔ Yen | ✅ Real-time |

### Real-Time Updates

- 📊 **Instant Charts**: Interactive Chart.js visualizations
- 🔄 **Auto-Refresh**: Updates at configurable intervals (default: 5 minutes)
- 📈 **7-Day History**: Track trends with historical data
- 🌍 **No Ads, No Tracking**: Privacy-first architecture
- 🚀 **Lightning Fast**: Lightweight, pure vanilla JavaScript

### Smart Features

| Feature | Details |
|---------|---------|
| 💱 **Quick Conversion** | Convert amounts between pairs instantly |
| 📉 **Price Alerts** | Set thresholds and get notified (localStorage) |
| 🕐 **Historical Trend** | See 7-day price movements |
| 🌓 **Dark/Light Mode** | Eye-friendly interface, any time |
| 🔀 **Pair Switching** | Focus on any pair with one click |

---

## 🌐 Live Demo

Visit **[exchange.bojiang.org](https://exchange.bojiang.org)** to use it now.

---

## 🚀 Getting Started

### Prerequisites
- Modern browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for API calls)
- No backend required!

### Installation

```bash
# Clone the repository
git clone https://github.com/hakupao/ExchangeAtlas.git
cd ExchangeAtlas

# Open in browser
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

---

## 📂 Project Structure

```
ExchangeAtlas/
├── index.html          # Main entry point
├── styles.css          # Layout and theming
├── app.core.js         # Core application logic
├── app.rates.js        # Exchange rate fetching
├── app.chart.js        # Chart.js wrapper
├── app.controls.js     # UI controls & events
├── app.i18n.js         # Internationalization (EN/ZH)
└── assets/
    ├── icons/          # Currency pair icons
    └── fonts/          # System fonts
```

### Module Breakdown

| File | Purpose |
|------|---------|
| **app.core.js** | State management, data models |
| **app.rates.js** | Frankfurter API integration |
| **app.chart.js** | Chart rendering and updates |
| **app.controls.js** | Event handlers, UI interactions |
| **app.i18n.js** | English/Chinese translations |

---

## 🔌 API Integration

### Frankfurter API

Uses the free, open-source **[Frankfurter](https://www.frankfurter.app/)** service:

```javascript
// Example API call
const response = await fetch(
  'https://api.frankfurter.app/latest?from=USD&to=JPY'
);
const data = await response.json();
console.log(data.rates.JPY);  // 149.35 (example)
```

**Why Frankfurter?**
- ✅ No authentication required
- ✅ Free tier with reasonable rate limits
- ✅ Privacy-respecting (no analytics)
- ✅ Always-available free service
- ✅ Based on European Central Bank data

### Automatic Refresh

The app fetches rates every 5 minutes (configurable):

```javascript
// In app.core.js
const REFRESH_INTERVAL = 5 * 60 * 1000;  // 5 minutes
setInterval(updateRates, REFRESH_INTERVAL);
```

---

## 🎨 User Interface

### Dashboard Layout

```
┌─────────────────────────────────────────┐
│  ExchangeAtlas  [🌓 Theme]  [🇬🇧 Lang]  │
├─────────────────────────────────────────┤
│  Pair Selector: [USD/JPY ▼]              │
├─────────────────────────────────────────┤
│  Current Rate: 149.35  [▲ 0.23%] 24h    │
├─────────────────────────────────────────┤
│  [Chart: 7-day trend graph]              │
├─────────────────────────────────────────┤
│  Quick Convert:  [100] USD = 14,935 JPY │
├─────────────────────────────────────────┤
│  [Pair buttons: USD/CNY  USD/JPY ...]    │
└─────────────────────────────────────────┘
```

### Responsive Design

- **Desktop**: Full dashboard with large charts
- **Tablet**: Stacked pairs, touch-friendly buttons
- **Mobile**: Vertical layout, optimized for one-handed use

---

## 🌍 Internationalization

Complete support for:

| Language | Coverage |
|----------|----------|
| 🇬🇧 **English** | 100% - All labels, help text |
| 🇨🇳 **中文** (Simplified) | 100% - Chinese interface |

Toggle in the top-right corner or change default in `app.i18n.js`:

```javascript
let currentLanguage = 'en';  // 'en' or 'zh'
```

---

## 💡 Real-World Use Cases

### Use Case 1: Expat Salary Planning

**Scenario:** Freelancer earning USD, living in Japan

```
Daily check:
1. Open ExchangeAtlas
2. Check USD/JPY rate
3. Calculate expected JPY salary in real-time
4. Plan monthly expenses
```

### Use Case 2: Investment Opportunities

**Scenario:** Watching AUD/CNY for exchange rate arbitrage

```
Set up price alerts:
- Alert when AUD/CNY > 5.2
- Alert when AUD/CNY < 4.8
- Make trading decisions
```

### Use Case 3: Travel Planning

**Scenario:** Budgeting trip to different countries

```
1. Enter trip budget in home currency
2. Switch between currency pairs
3. See instant converted amounts
4. Plan spending by country
```

---

## 🔧 Technology Stack

| Category | Technology |
|----------|------------|
| 📄 **Markup** | HTML5 semantic structure |
| 🎨 **Styling** | CSS3 (flexbox, grid, animations) |
| ⚙️ **Logic** | Vanilla JavaScript ES2023 |
| 📊 **Charts** | Chart.js 3.x |
| 🌐 **API** | Frankfurter (free, no auth) |
| 🌍 **Hosting** | Static file service |

---

## 📊 Data Flow

```
┌─────────────────┐
│  Frankfurter    │ (Free currency API)
│    API          │
└────────┬────────┘
         │ (JSON response)
         ▼
┌─────────────────┐
│  app.rates.js   │ (Parse & cache)
└────────┬────────┘
         │ (Rate objects)
         ▼
┌─────────────────┐
│  app.core.js    │ (State management)
└────────┬────────┘
         │ (Updated state)
         ▼
┌─────────────────┐
│  app.chart.js   │ (Visualize)
│  app.controls.js│ (Display & interact)
└─────────────────┘
```

---

## ⚙️ Configuration

### Customize Refresh Interval

In `app.core.js`:

```javascript
// Change from 5 minutes to 10 minutes
const REFRESH_INTERVAL = 10 * 60 * 1000;
```

### Add More Currency Pairs

In `app.core.js`, add to pairs array:

```javascript
const PAIRS = [
  // Existing pairs...
  { from: 'EUR', to: 'GBP', label: 'EUR/GBP' }
];
```

### Modify Default Theme

In `styles.css`:

```css
:root {
  --color-bg: #ffffff;
  --color-text: #000000;
  --color-chart: #4F46E5;
  /* Customize as needed */
}
```

---

## 🚨 Known Limitations

| Limitation | Reason | Workaround |
|-----------|--------|-----------|
| No historical data beyond 7 days | API limit | Use external services for long-term analysis |
| Update interval ≥ 5 min | API rate limits | Adjust as needed, don't exceed 100 calls/day |
| JPY/CNY is calculated | Not direct pair | Rate = 1 / (CNY/JPY) |
| No alerts via push notification | Privacy first | Uses localStorage alerts only |

---

## 🤝 Contributing

Found a rate display bug? Idea for a new currency pair?

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/new-pair`)
3. Commit your changes
4. Push and open a Pull Request

---

## 📝 License

MIT License - Use freely, modify as needed.

---

## 🙋 FAQ

**Q: Is my data safe?**
A: Completely—no backend, no database, no tracking. Everything runs locally in your browser.

**Q: Can I download historical data?**
A: Currently limited to 7 days in-app. The Frankfurter API provides longer history via direct API calls.

**Q: Why not use a real-time WebSocket connection?**
A: Frankfurter API uses REST with 5-min caching. Fine for daily use; overkill for high-frequency trading.

**Q: Can I use this offline?**
A: No—needs internet for current rates. Browser caching helps, but live data requires connectivity.

---

## 📞 Contact

- 🌐 Website: [bojiang.org](https://bojiang.org)
- 📧 Email: hi@bojiang.org
- 🐙 GitHub: [@hakupao](https://github.com/hakupao)
- 🔗 Live: [exchange.bojiang.org](https://exchange.bojiang.org)

---

<div align="center">

**Monitor global currency flows, make informed decisions 💱**

Made with ❤️ in Yokohama, Japan

</div>
