# Requirements — Ghostfolio Token Radar (Kiro spec)

## Introduction
A Frankenstein web app for Kiroween 2026: a DeFi token radar stitched to a
Halloween trick-or-treat game and a 60-second prediction market, built as a
static site with no build step.

## Requirements

### Radar
- WHEN the page loads, THE SYSTEM SHALL fetch the top 40 protocols by TVL
  from DefiLlama and SHALL render name, TVL, market cap, Ghost Score, label
  and 24h change.
- WHEN DefiLlama is unreachable, THE SYSTEM SHALL fall back to bundled sample
  data and SHALL label it "OFFLINE SAMPLE DATA" in the UI.
- WHEN the user types in search, selects a sort, a label or a chain,
  THE SYSTEM SHALL filter/sort the table without a page reload.
- WHEN the user clicks a protocol row, THE SYSTEM SHALL show a detail panel
  with the Ghost Score breakdown and the formula used.

### Ghost Score
- WHEN a protocol has TVL and market cap, THE SYSTEM SHALL compute
  `score = clamp(50 − 25×log10(mcap / 10^(6.965 + 0.522×log10(TVL in $M))), 0, 100)`
  where TVL is measured in millions of USD.
- WHEN the market cap is missing, THE SYSTEM SHALL score 50, label
  WATCH ONLY and SHALL say the market cap was not reported.
- WHEN the score is ≥65, THE SYSTEM SHALL label the protocol FARM;
  55–64 FARM SMALL; below 55 WATCH ONLY.

### Trick-or-treat game
- WHEN the user clicks Trick-or-Treat on a house, THE SYSTEM SHALL award
  a treat of 10–50 Ghost Coins with 70% probability, or a trick of −5
  coins with 30% probability.
- WHEN a house has been visited today, THE SYSTEM SHALL disable its
  Trick-or-Treat button until the next day.
- WHEN a treat is awarded, THE SYSTEM SHALL increase the streak by 1;
  WHEN a trick occurs, THE SYSTEM SHALL reset the streak to 0.
- THE SYSTEM SHALL never let the balance go below 0.

### Prediction markets
- WHEN the user places a Ghost Hour bet, THE SYSTEM SHALL lock the entry
  price from CoinGecko, deduct the stake, and SHALL resolve after 60 seconds.
- WHEN the price moved in the chosen direction, THE SYSTEM SHALL pay 1.9×
  the stake; WHEN it moved the other way, THE SYSTEM SHALL pay 0;
  WHEN it is unchanged, THE SYSTEM SHALL refund the stake.
- WHEN the user picks a daily market, THE SYSTEM SHALL stake 25 coins on
  one protocol, SHALL show the resolution date (tomorrow), and SHALL NOT
  present the market as resolved before that date.

### Ghost agents
- THE SYSTEM SHALL show three ghost agents (Radar, Treat, Oracle) with
  distinct personalities and SHALL answer "Ask" with a tip derived from
  current live state (top FARM, current SOL price), not a canned fake.

### Technical
- THE SYSTEM SHALL run by opening index.html or `python3 -m http.server`,
  with no build step and no API keys.
- THE SYSTEM SHALL persist the wallet in localStorage, starting at
  1,000 Ghost Coins.
- THE SYSTEM SHALL include property-based tests runnable with `node --test`.
