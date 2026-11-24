# Product — Ghostfolio Token Radar

## Purpose
Ghostfolio is a Frankenstein web app for Kiroween 2026: it stitches three
incompatible things into one working product —
1. a serious DeFi token radar (live TVL / market-cap data),
2. a Halloween trick-or-treat collection game, and
3. a 60-second binary prediction market —
so that a fun game mechanic makes a real data tool more engaging, and the
data makes the game more than a toy.

## Users
- DeFi-curious visitors who want a quick "undervalued vs TVL?" read on a protocol.
- Hackathon judges who need to see the Frankenstein stitch in under 3 minutes.
- Casual players who just want to knock on haunted houses and win Ghost Coins.

## Goals
- One page, no login, no build step: open index.html and it works.
- Live data first (DefiLlama, CoinGecko, no API keys), bundled sample data as
  fallback so the app never shows a blank page.
- Every game action is honest: virtual Ghost Coins only, odds and payouts
  stated in the UI, daily market resolution date shown, never faked.
- Demonstrable in 3 minutes: radar → trick-or-treat → 60-second bet.

## Non-goals
- Real money, real crypto, real wallets. Ghost Coins are virtual.
- Financial advice. Ghost Score is a descriptive TVL-vs-mcap heuristic,
  not a recommendation.
- A backend. All state lives in localStorage.
