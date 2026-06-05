/**
 * ExchangeAtlas — realtime FX proxy (Cloudflare Worker)
 *
 * Why this exists:
 *  - The free realtime sources (Yahoo, Twelve Data) are CORS-blocked from the
 *    browser, need a User-Agent, and have rate limits. This Worker proxies them,
 *    caches the result for a few seconds (so N visitors only hit the upstream
 *    once per TTL), and adds the CORS headers the static frontend needs.
 *
 * Endpoint:
 *  GET /rates  ->  { asOf, source, pairs: { USD_CNY: {rate, prev, state, t}, ... } }
 *
 * Sources:
 *  - PRIMARY  : Yahoo Finance v8 chart endpoint (keyless). v8 is used instead of
 *               v7 /quote because v7 now requires a crumb/cookie.
 *  - FALLBACK : Twelve Data /quote (free 800 req/day). Only used to fill pairs
 *               Yahoo failed to return, and only if the TWELVEDATA_KEY secret is set.
 *
 * Deploy: see README.md in this folder.
 */

// App pair id -> Yahoo symbol
const YAHOO_SYMBOLS = {
  USD_CNY: "USDCNY=X",
  USD_JPY: "USDJPY=X",
  CNY_JPY: "CNYJPY=X",
  JPY_CNY: "JPYCNY=X",
  AUD_CNY: "AUDCNY=X",
  AUD_JPY: "AUDJPY=X",
};

// App pair id -> Twelve Data symbol (slash format, onshore CNY; no CNH available there)
const TWELVE_SYMBOLS = {
  USD_CNY: "USD/CNY",
  USD_JPY: "USD/JPY",
  CNY_JPY: "CNY/JPY",
  JPY_CNY: "JPY/CNY",
  AUD_CNY: "AUD/CNY",
  AUD_JPY: "AUD/JPY",
};

const RATES_TTL = 20; // seconds /rates is cached at the edge
const HISTORY_TTL = 30; // seconds /history is cached at the edge
const ALLOW_ORIGIN = "*"; // tighten to your GitHub Pages origin if you prefer
const YAHOO_UA = "Mozilla/5.0 (compatible; ExchangeAtlas/1.0)";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    let builder = null;
    let ttl = RATES_TTL;
    if (url.pathname === "/rates") {
      builder = () => buildRates(env);
      ttl = RATES_TTL;
    } else if (url.pathname === "/history") {
      builder = () => buildHistory(url);
      ttl = HISTORY_TTL;
    } else {
      return withCors(new Response("Not found", { status: 404 }));
    }

    // Edge cache, keyed by full path+query so each range caches separately.
    const cache = caches.default;
    const cacheKey = new Request(url.origin + url.pathname + url.search);
    const cached = await cache.match(cacheKey);
    if (cached) {
      return withCors(cached);
    }

    const data = await builder();
    const response = new Response(JSON.stringify(data), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": `public, max-age=${ttl}`,
      },
    });
    // Store a clone in the edge cache; serve the original to this client.
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return withCors(response);
  },
};

// Proxy + parse a Yahoo chart series (intraday or daily) for one pair.
//   /history?pair=USD_CNY&range=1d&interval=5m              (intraday)
//   /history?pair=USD_CNY&period1=..&period2=..&interval=1d (daily)
async function buildHistory(url) {
  const pair = url.searchParams.get("pair");
  const sym = YAHOO_SYMBOLS[pair];
  const interval = url.searchParams.get("interval") || "1d";
  const range = url.searchParams.get("range");
  const period1 = url.searchParams.get("period1");
  const period2 = url.searchParams.get("period2");

  if (!sym) {
    return { ok: false, error: "unknown pair", points: [] };
  }

  let yahoo = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    sym
  )}?interval=${encodeURIComponent(interval)}`;
  if (range) {
    yahoo += `&range=${encodeURIComponent(range)}`;
  } else if (period1 && period2) {
    yahoo += `&period1=${encodeURIComponent(period1)}&period2=${encodeURIComponent(
      period2
    )}`;
  }

  try {
    const res = await fetch(yahoo, {
      headers: { "user-agent": YAHOO_UA },
      cf: { cacheTtl: 25, cacheEverything: true },
    });
    if (!res.ok) throw new Error(`yahoo ${res.status}`);
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const ts = result?.timestamp || [];
    const closes = result?.indicators?.quote?.[0]?.close || [];
    const points = [];
    for (let i = 0; i < ts.length; i++) {
      const v = closes[i];
      if (typeof v === "number" && !Number.isNaN(v)) {
        points.push([ts[i] * 1000, v]); // [unix ms, close]
      }
    }
    return {
      ok: true,
      pair,
      interval,
      isIntraday: /[mh]$/.test(interval), // 5m/30m/1h -> intraday; 1d/1wk -> daily
      points,
    };
  } catch (err) {
    return { ok: false, error: String(err), points: [] };
  }
}

async function buildRates(env) {
  const pairs = await fetchYahoo();

  // Fallback: fill any missing pair from Twelve Data, if a key is configured.
  const missing = Object.keys(YAHOO_SYMBOLS).filter(
    (id) => !pairs[id] || pairs[id].rate == null
  );
  let source = "yahoo";
  if (missing.length && env && env.TWELVEDATA_KEY) {
    const td = await fetchTwelveData(missing, env.TWELVEDATA_KEY);
    for (const id of missing) {
      if (td[id] && td[id].rate != null) {
        pairs[id] = td[id];
      }
    }
    source = Object.values(pairs).every((p) => p && p.source === "twelvedata")
      ? "twelvedata"
      : "yahoo+twelvedata";
  }

  return { asOf: Date.now(), source, pairs };
}

async function fetchYahoo() {
  const entries = await Promise.all(
    Object.entries(YAHOO_SYMBOLS).map(async ([id, sym]) => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
            sym
          )}?interval=1d&range=1d`,
          {
            headers: { "user-agent": "Mozilla/5.0 (compatible; ExchangeAtlas/1.0)" },
            cf: { cacheTtl: 15, cacheEverything: true },
          }
        );
        if (!res.ok) throw new Error(`yahoo ${res.status}`);
        const json = await res.json();
        const meta = json?.chart?.result?.[0]?.meta;
        if (!meta || typeof meta.regularMarketPrice !== "number") {
          throw new Error("yahoo no meta");
        }
        return [
          id,
          {
            rate: meta.regularMarketPrice,
            prev:
              typeof meta.chartPreviousClose === "number"
                ? meta.chartPreviousClose
                : typeof meta.previousClose === "number"
                ? meta.previousClose
                : null,
            state: meta.marketState || null, // REGULAR | CLOSED | PRE | POST
            t: meta.regularMarketTime ? meta.regularMarketTime * 1000 : null,
            source: "yahoo",
          },
        ];
      } catch (err) {
        return [id, { rate: null, error: String(err), source: "yahoo" }];
      }
    })
  );
  return Object.fromEntries(entries);
}

async function fetchTwelveData(ids, key) {
  const symbols = ids.map((id) => TWELVE_SYMBOLS[id]).filter(Boolean);
  if (!symbols.length) return {};
  try {
    const res = await fetch(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(
        symbols.join(",")
      )}&apikey=${encodeURIComponent(key)}`
    );
    if (!res.ok) throw new Error(`twelvedata ${res.status}`);
    const json = await res.json();
    // Single symbol -> flat object; multiple -> keyed by symbol.
    const bySymbol = symbols.length === 1 ? { [symbols[0]]: json } : json;
    const out = {};
    for (const id of ids) {
      const q = bySymbol[TWELVE_SYMBOLS[id]];
      if (!q || q.status === "error" || q.close == null) continue;
      out[id] = {
        rate: Number(q.close),
        prev: q.previous_close != null ? Number(q.previous_close) : null,
        state: q.is_market_open === false ? "CLOSED" : "REGULAR",
        t: null,
        source: "twelvedata",
      };
    }
    return out;
  } catch (err) {
    return {};
  }
}

function withCors(response) {
  // Response from cache.match is immutable-ish; rebuild headers safely.
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", ALLOW_ORIGIN);
  headers.set("access-control-allow-methods", "GET, OPTIONS");
  headers.set("access-control-allow-headers", "content-type");
  headers.set("access-control-max-age", "86400");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
