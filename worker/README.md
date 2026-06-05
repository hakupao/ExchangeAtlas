# ExchangeAtlas — Realtime FX Proxy (Cloudflare Worker)

A tiny Cloudflare Worker that gives the static frontend **near-real-time** FX quotes
for the 6 pairs (USD/CNY, USD/JPY, CNY/JPY, JPY/CNY, AUD/CNY, AUD/JPY).

It exists because the free realtime sources can't be called from the browser directly:

- **CORS** — Yahoo/Twelve Data don't send `Access-Control-Allow-Origin`, so the browser blocks direct `fetch`.
- **Rate limits** — the Worker caches each response for ~20s, so 1000 visitors still only hit the upstream once per 20s.
- **User-Agent** — Yahoo's endpoint expects a UA header.

## Endpoint

```
GET https://<your-worker>.workers.dev/rates
```

Response:

```json
{
  "asOf": 1749100000000,
  "source": "yahoo",
  "pairs": {
    "USD_CNY": { "rate": 6.7737, "prev": 6.7710, "state": "REGULAR", "t": 1749099960000, "source": "yahoo" },
    "USD_JPY": { "rate": 159.946, "prev": 159.80, "state": "REGULAR", "t": 1749099960000, "source": "yahoo" }
  }
}
```

- `rate`  — latest price (1 base → quote; the frontend scales JPY_CNY ×100 for display)
- `prev`  — previous close, used for the day change % shown on each card
- `state` — `REGULAR` / `CLOSED` / `PRE` / `POST` (forex is closed on weekends)

## Deploy (one-time, free tier)

```bash
cd worker

# 1. Log in (opens a browser)
npx wrangler login

# 2. (optional) add the Twelve Data fallback key — Yahoo works without it
npx wrangler secret put TWELVEDATA_KEY     # paste your free key from twelvedata.com

# 3. Ship it
npx wrangler deploy
```

Wrangler prints the URL, e.g. `https://exchangeatlas-rates.<you>.workers.dev`.

## Wire it into the frontend

Open `../app.core.js` and set:

```js
App.LIVE_API_BASE = "https://exchangeatlas-rates.<you>.workers.dev";
```

That's it. If `LIVE_API_BASE` is left as the placeholder (or the Worker is ever down),
the frontend automatically falls back to the old Frankfurter daily rates, so the site
never breaks.

## Quick test

```bash
curl "https://exchangeatlas-rates.<you>.workers.dev/rates"
```

## Notes & limits (free tier)

- Cloudflare Workers free: 100k requests/day — at a 15s client poll that's ~5,760 req/day per always-open tab; the 20s edge cache keeps upstream calls tiny.
- Yahoo is unofficial / ToS-gray and may rate-limit datacenter IPs occasionally — that's why Twelve Data is wired as a fallback.
- **CNY is offshore-tracking** (Yahoo `USDCNY=X` ≈ `USDCNH=X`), not the PBOC onshore fixing. The UI labels CNY pairs accordingly. True onshore CNY realtime isn't available for free.
