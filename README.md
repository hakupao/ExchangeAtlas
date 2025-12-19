# Exchange Atlas

Exchange Atlas is a static exchange-rate dashboard built on the Frankfurter API.
It shows live rates and historical line charts for a curated set of currency pairs.

## Features
- Live quotes auto-refresh every 60 seconds
- Historical charts for 7 days, 30 days, 6 months, 1 year, and 3 years
- Bilingual UI (Chinese and English)
- Six preset pairs: USD/CNY, USD/JPY, CNY/JPY, JPY/CNY, AUD/CNY, AUD/JPY

## Usage
Open `index.html` directly in a browser.

If your browser blocks local fetch requests, run a simple static server:

```bash
python -m http.server
```

Then open `http://localhost:8000`.

## Project Structure
- `index.html`: layout and markup
- `styles.css`: styling
- `app.core.js`: shared state and utilities
- `app.i18n.js`: translations and language switching
- `app.rates.js`: live rate fetching and cards
- `app.chart.js`: historical chart rendering
- `app.controls.js`: UI controls
- `app.js`: app initialization

## Data Source
Rates are provided by the Frankfurter API:
https://www.frankfurter.app
