# Tech — Ghostfolio Token Radar

## Stack
- Static web app, NO build step: `index.html` + `style.css` + `app.js` + `logic.js`.
- Vanilla JavaScript (ES2019, no framework, no bundler, no npm dependencies).
- Node.js 22+ only for tests (`node --test`) and local serving
  (`python3 -m http.server`).

## Data sources (no keys)
- DefiLlama `https://api.llama.fi/protocols` — top 40 protocols by TVL.
  Falls back to `SAMPLE_PROTOCOLS` in `logic.js` when unreachable.
- CoinGecko `https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd`
  — polled every 30s; last known prices kept on failure.

## Architecture rule
- All pure maths lives in `logic.js` (UMD: works in browser and Node).
  `app.js` does DOM, fetch and localStorage only, and never re-implements
  scoring, payouts or wallet maths.
- That split is what makes the property tests meaningful: tests exercise
  the exact code the browser runs.

## Ghost Score
- Formula: `log10(mcap) ≈ 6.965 + 0.522 × log10(TVL)`.
- `ratio = mcap / 10^(6.965 + 0.522×log10(TVL))`,
  `score = clamp(50 − 25×log10(ratio), 0, 100)`.
- Labels: ≥65 FARM, 55–64 FARM SMALL, <55 WATCH ONLY.
- Missing mcap → score 50, WATCH ONLY, flagged in the UI.

## Game rules
- Trick-or-treat: 70% treat +10–50 coins, 30% trick −5. One visit per
  house per day (localStorage, date-stamped). Treats grow the streak;
  a trick resets it.
- Ghost Hour: 60-second market, SOL/BTC/ETH up/down, stake 10/25/50/100,
  win pays 1.9×, unchanged price refunds the stake.
- Daily market: pick tomorrow's top TVL gainer, 25-coin stake, 2× payout.
  Resolution date is shown; the market stays open until that date.
- Wallet starts at 1,000 Ghost Coins. Balance never goes below 0.

## Constraints
- Must run by opening `index.html` or `python3 -m http.server`.
- No secrets, no keys, no tracking, no third-party JS libraries.
- `.kiro/` must be committed at the repo root and must NOT be in `.gitignore`.
