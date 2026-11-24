# Ghostfolio Token Radar 👻🎃

**Kiroween 2026 — Frankenstein category.** A Frankenstein: three incompatible
things stitched into one working web app —

1. **A serious DeFi token radar** — live TVL / market-cap data from DefiLlama,
   ranked by a Ghost Score.
2. **A Halloween trick-or-treat game** — every protocol is a haunted house.
   Knock once a day: 70% treat (+10–50 Ghost Coins), 30% trick (−5).
3. **A prediction market** — 60-second "Ghost Hour" markets on SOL/BTC/ETH
   (live CoinGecko prices, win pays 1.9×), plus one daily market: pick
   tomorrow's top TVL gainer (2× payout, resolution date shown, never faked).

Plus three Kiro Crew ghost agents in the UI — Radar Ghost 👻, Treat Ghost 🎃
and Oracle Ghost 🔮 — each with its own personality and tips drawn from
live state (current top FARM, current SOL price).

## Run it (no build step, no keys)

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Or just open `index.html` in a browser. Tests:

```bash
node --test tests/ghost-score.test.js   # 11 property tests, all passing
```

## Ghost Score

Adapted as an **idea only** from an earlier radar concept (no code copied):

```
log10(mcap) ≈ 6.965 + 0.522 × log10(TVL in $M)
ratio  = mcap / 10^(6.965 + 0.522 × log10(TVL in $M))
score  = clamp(50 − 25 × log10(ratio), 0, 100)
```

A protocol whose market cap is far *below* its TVL-implied market cap is
"undervalued vs its TVL" and scores high.

| Score | Label |
|-------|-------|
| ≥ 65  | FARM |
| 55–64 | FARM SMALL |
| < 55  | WATCH ONLY |

Missing market cap → score 50, WATCH ONLY, flagged in the UI.

## Data sources

- **DefiLlama** `api.llama.fi/protocols` — top 40 protocols by TVL, no key.
  If unreachable, the app falls back to bundled sample data in `logic.js`
  and shows an orange **OFFLINE SAMPLE DATA** banner.
- **CoinGecko** simple price API — SOL/BTC/ETH, polled every 30s, no key.
  Last known prices are kept if a poll fails.

## Game rules (honest, in the UI)

- Wallet starts at **1,000 Ghost Coins** (virtual — no real money, no crypto).
  Balance never goes below 0. Reset button restores 1,000.
- Trick-or-treat: one visit per house per day. Treats grow your streak;
  a trick resets it.
- Ghost Hour: stake 10/25/50/100, entry price locks at bet time, resolves
  after 60s. Win = 1.9×, unchanged price = stake refunded.
- Daily market: 25-coin stake, one pick per day, resolves on the date shown
  against live 24h TVL changes. It stays open until then.

## Repo layout

```
index.html  style.css  app.js  logic.js
tests/ghost-score.test.js
.kiro/
  steering/product.md  tech.md  structure.md
  specs/ghostfolio/requirements.md  design.md  tasks.md
  hooks/on-save-tests.json
  agents/radar-ghost.md  treat-ghost.md  oracle-ghost.md
KIRO_USAGE.md  SUBMISSION_NOTES.md  LICENSE (Apache-2.0)
```

## Demo in 3 minutes

1. **0:00–0:45** Radar — live DefiLlama data, sort by Ghost Score, click a
   FARM row, show the score breakdown and formula.
2. **0:45–1:30** Trick-or-treat — knock on two houses, show a treat and the
   streak; ask Treat Ghost for a tip.
3. **1:30–2:30** Ghost Hour — place a 50-coin SOL UP bet, watch the 60s
   countdown resolve live; show the daily market pick.
4. **2:30–3:00** The `.kiro/` folder — specs, steering, hooks, three ghost
   agents; explain the Frankenstein stitch.

## Kiro usage

See [KIRO_USAGE.md](KIRO_USAGE.md) — an honest record: kiro-cli was
installed and verified (v3.5.0), but agent/chat features need sign-in, which
was not available, so the `.kiro` artifacts were hand-written following the
Kiro docs format and the code was written by hand against those specs.

## License

Apache-2.0. See [LICENSE](LICENSE).
