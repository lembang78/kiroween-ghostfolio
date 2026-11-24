# Design — Ghostfolio Token Radar (Kiro spec)

## Overview
Static single-page app. No backend, no build step, no dependencies.
Two JS layers: `logic.js` (pure, tested) and `app.js` (browser I/O).

## Components

### logic.js (pure, UMD)
- `ghostScore(tvl, mcap)` — power-law residual score, see steering/tech.md.
  TVL is in dollars as input; the formula converts to $M internally.
- `labelForScore(score)` — FARM / FARM SMALL / WATCH ONLY thresholds.
- `treatOrTrick(rng)` — injectable RNG so tests can seed it.
- `resolveGhostHour(entry, exit, direction, stake)` — 1.9× / refund / 0.
- `resolveDailyPick(pick, changes)` / `topGainer(changes)` — max 24h gainer wins.
- `newWallet / applyTreat / placeBet / applyPayout` — immutable wallet
  transitions (each returns a new object; app.js persists it).
- `SAMPLE_PROTOCOLS` — 12 protocols with approximate TVL/mcap, fallback only.
- `fmtUSD(n)` — $2.50B / $1.5M formatting.

### app.js (browser)
- `loadRadar()` — fetch DefiLlama, top 40 by TVL, score, render; catch →
  sample data + SAMPLE banner.
- `loadPrices()` — CoinGecko simple price, 30s poll, keeps last-known on error.
- `renderRadar()` — search/sort/label/chain filters, row click → detail panel.
- `trickOrTreat()` — date-stamped visit per house per day, wallet update.
- Ghost Hour — stake deducted at bet time, 1s countdown, resolution fetch,
  payout applied, last 10 markets logged.
- Daily market — one pick per day in localStorage with resolve date;
  `checkDaily()` resolves only on/after that date against live 24h changes.
- Ghost agents — rule-based tips; Radar tip names the current top FARM,
  Oracle tip names the live SOL price.

### index.html / style.css
- Sections: hero + wallet bar, Kiro Crew ghost cards, radar table,
  detail panel, Ghost Hour + daily market, footer with data sources.
- Spooky theme: dark purple background, orange treats, floating ghosts.
  Colour is functional: FARM green, FARM SMALL gold, WATCH ONLY grey;
  price moves green/red.

## Data flow
```
DefiLlama / CoinGecko ──fetch──▶ app.js ──score──▶ logic.js ──render──▶ DOM
localStorage wallet ◀──persist── app.js ──pure transitions──▶ logic.js
```

## Testing
- `tests/ghost-score.test.js`, `node --test`: property tests with a seeded
  PRNG (mulberry32) — bounded scores (500 random pairs), monotonicity in
  TVL and in mcap, fair-value = 50, label thresholds, treat/trick bounds
  (1000 draws), payout table, daily resolution, wallet flow, sample validity.
- Hook (`.kiro/hooks/on-save-tests.json`): on save of `logic.js`, run the
  test file. The hook is a config artifact; it was not executed by Kiro
  CLI in this environment (see KIRO_USAGE.md — CLI needs sign-in).

## Risks
- DefiLlama / CoinGecko rate limits → fallback data + last-known prices.
- CoinGecko free tier can be slow → bet resolution re-fetches and, if the
  fetch fails, resolves against the entry price (draw/refund), never a fake win.
