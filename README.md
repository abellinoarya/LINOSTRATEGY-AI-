# LinoStrategy Fund

A clean, NBIM-style ([nbim.no](https://www.nbim.no)) website for a personal investment fund.
It opens with the signature live-ticking **“Market value of the fund”** counter, then shows a
performance chart, asset allocation, full holdings and key return figures.

> Built from the owner's actual portfolio (Bitcoin via a wallet tracker + Indonesian equities
> via Growin / Mandiri Sekuritas). Figures are indicative, not official statements.

## What's inside

| File | Purpose |
|------|---------|
| `index.html` | Page structure |
| `styles.css` | Dark-navy + white theme, responsive |
| `script.js`  | Portfolio data, live counter, chart, donuts, tables, stats |

## Features

- **Live market-value counter** in IDR or USD (toggle), gently ticking with the BTC price.
- **Performance chart** with `1D · 1W · 1M · 6M · 1Y · ALL` ranges and hover tooltips.
- **Asset-allocation donuts** — by asset class and within equities.
- **Holdings tables** for digital assets and Indonesian equities.
- **Key figures** — total value, all-time return, unrealised profit, best performer.
- Fully responsive (looks right on phone and desktop). No build step, no dependencies.

## Current holdings

**Digital assets**
- ₿ Bitcoin — 0.70094143 BTC (~$51.6k, all-time **+197%**)

**Indonesian equities** (1 lot = 100 shares)
- **GOTO** GoTo Gojek Tokopedia — 4,149 lots
- **SRTG** Saratoga Investama Sedaya — 32 lots
- **BMRI** Bank Mandiri — 7 lots

## View it

Just open `index.html` in a browser. Or serve locally:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Update your portfolio

All numbers are derived from the `CONFIG` block at the top of `script.js`:

```js
const CONFIG = {
  usdIdr: 16250,                 // USD -> IDR rate
  crypto:   [ { symbol: 'BTC', amount: 0.70094143, priceUSD: 73578, allTimePct: 197 } ],
  equities: [ { symbol: 'GOTO', lots: 4149, avg: 50.98, last: 50 }, ... ],
};
```

Change the amounts / prices and everything (totals, weights, charts, stats) recalculates.
