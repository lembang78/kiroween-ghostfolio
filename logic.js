/**
 * Ghostfolio Token Radar — pure logic (shared by browser app.js and node tests).
 * No DOM, no network, no localStorage here. All functions are deterministic
 * given their inputs, so the same code is tested in tests/ and run in the browser.
 *
 * Ghost Score formula (adapted as an IDEA only from Roby's earlier radar work;
 * no code was copied): a power-law fit of log market-cap vs log TVL,
 *   log10(mcap) ~= 6.965 + 0.522 * log10(tvl)
 * A protocol whose actual mcap is far BELOW the TVL-implied mcap is
 * "undervalued vs its TVL" and scores high.
 */
(function (global) {
  'use strict';

  var FORMULA = { intercept: 6.965, slope: 0.522 };

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function predictedMcap(tvl) {
    if (!tvl || tvl <= 0) return null;
    return Math.pow(10, FORMULA.intercept + FORMULA.slope * Math.log10(tvl));
  }

  // score 0..100. Fixed mcap: score rises as TVL rises (predicted mcap rises,
  // ratio falls). Fixed TVL: score falls as mcap rises.
  // ratio = 1 (fairly valued) -> 50. ratio = 0.01 -> 100. ratio = 100 -> 0.
  function ghostScore(tvl, mcap) {
    if (!tvl || tvl <= 0) return { score: 0, label: 'WATCH ONLY', ratio: null, predictedMcap: null, hasMcap: false };
    var pred = predictedMcap(tvl);
    if (!mcap || mcap <= 0) {
      return { score: 50, label: 'WATCH ONLY', ratio: null, predictedMcap: pred, hasMcap: false };
    }
    var ratio = mcap / pred;
    var score = clamp(50 - 25 * Math.log10(ratio), 0, 100);
    score = Math.round(score * 10) / 10;
    return { score: score, label: labelForScore(score), ratio: ratio, predictedMcap: pred, hasMcap: true };
  }

  function labelForScore(score) {
    if (score >= 65) return 'FARM';
    if (score >= 55) return 'FARM SMALL';
    return 'WATCH ONLY';
  }

  // Trick-or-treat: rng() returns [0,1). 70% treat +10..50 Ghost Coins,
  // 30% trick -5 Ghost Coins.
  function treatOrTrick(rng) {
    var roll = rng();
    if (roll < 0.7) {
      return { type: 'treat', amount: 10 + Math.floor(rng() * 41) };
    }
    return { type: 'trick', amount: -5 };
  }

  // Ghost Hour (60s) binary market. Payout 1.9x stake on a win, stake back on
  // a draw (price unchanged), 0 on a loss. profit = payout - stake.
  function resolveGhostHour(entryPrice, exitPrice, direction, stake) {
    if (!entryPrice || !exitPrice || entryPrice <= 0 || exitPrice <= 0) {
      return { outcome: 'void', payout: stake, profit: 0 };
    }
    if (exitPrice === entryPrice) return { outcome: 'draw', payout: stake, profit: 0 };
    var up = exitPrice > entryPrice;
    var win = (direction === 'up' && up) || (direction === 'down' && !up);
    if (win) {
      var payout = Math.round(stake * 1.9);
      return { outcome: 'win', payout: payout, profit: payout - stake };
    }
    return { outcome: 'lose', payout: 0, profit: -stake };
  }

  // Daily market: winner is the slug with the largest TVL % change.
  function topGainer(changes) {
    var best = null; var bestVal = -Infinity;
    Object.keys(changes).forEach(function (slug) {
      if (changes[slug] > bestVal) { bestVal = changes[slug]; best = slug; }
    });
    return best;
  }

  function resolveDailyPick(pickSlug, changes) {
    var winner = topGainer(changes);
    if (!winner) return { outcome: 'void', winner: null };
    return { outcome: pickSlug === winner ? 'win' : 'lose', winner: winner };
  }

  // --- Wallet (pure; app.js persists the returned object to localStorage) ---
  function newWallet() {
    return { balance: 1000, visited: {}, bets: [], daily: null, streak: 0, lastTreatDay: null };
  }

  function applyTreat(wallet, result) {
    var next = JSON.parse(JSON.stringify(wallet));
    next.balance = Math.max(0, next.balance + result.amount);
    if (result.type === 'treat') next.streak += 1; else next.streak = 0;
    return next;
  }

  function placeBet(wallet, stake) {
    if (stake <= 0 || stake > wallet.balance) return null;
    var next = JSON.parse(JSON.stringify(wallet));
    next.balance -= stake;
    return next;
  }

  function applyPayout(wallet, payout) {
    var next = JSON.parse(JSON.stringify(wallet));
    next.balance += payout;
    return next;
  }

  // Bundled fallback data. Clearly labelled SAMPLE in the UI when used.
  // Approximate TVL/mcap figures (USD) — only a stand-in when DefiLlama is down.
  var SAMPLE_PROTOCOLS = [
    { name: 'Lido', slug: 'lido', tvl: 30000000000, mcap: 1100000000, category: 'Liquid Staking', chains: ['Ethereum'], change_1d: 1.2 },
    { name: 'Aave', slug: 'aave', tvl: 25000000000, mcap: 3200000000, category: 'Lending', chains: ['Ethereum', 'Arbitrum'], change_1d: 0.8 },
    { name: 'EigenLayer', slug: 'eigenlayer', tvl: 12000000000, mcap: 900000000, category: 'Restaking', chains: ['Ethereum'], change_1d: -0.5 },
    { name: 'Uniswap', slug: 'uniswap', tvl: 5000000000, mcap: 4200000000, category: 'DEX', chains: ['Ethereum', 'Arbitrum', 'Base'], change_1d: 2.1 },
    { name: 'Sky (Maker)', slug: 'sky', tvl: 5000000000, mcap: 1500000000, category: 'CDP', chains: ['Ethereum'], change_1d: 0.3 },
    { name: 'Ethena', slug: 'ethena', tvl: 6000000000, mcap: 1800000000, category: 'Yield', chains: ['Ethereum'], change_1d: 3.4 },
    { name: 'Jupiter', slug: 'jupiter', tvl: 2200000000, mcap: 1300000000, category: 'DEX Aggregator', chains: ['Solana'], change_1d: -1.1 },
    { name: 'Kamino', slug: 'kamino', tvl: 1800000000, mcap: 250000000, category: 'Lending', chains: ['Solana'], change_1d: 4.2 },
    { name: 'Pendle', slug: 'pendle', tvl: 3500000000, mcap: 800000000, category: 'Yield', chains: ['Ethereum', 'Arbitrum'], change_1d: 1.7 },
    { name: 'Morpho', slug: 'morpho', tvl: 4000000000, mcap: 600000000, category: 'Lending', chains: ['Ethereum', 'Base'], change_1d: 0.9 },
    { name: 'Pump.fun', slug: 'pump', tvl: 120000000, mcap: 900000000, category: 'Launchpad', chains: ['Solana'], change_1d: -2.3 },
    { name: 'Raydium', slug: 'raydium', tvl: 1500000000, mcap: 700000000, category: 'DEX', chains: ['Solana'], change_1d: 5.1 }
  ];

  function fmtUSD(n) {
    if (n === null || n === undefined || isNaN(n)) return 'n/a';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }

  var api = {
    FORMULA: FORMULA, predictedMcap: predictedMcap, ghostScore: ghostScore,
    labelForScore: labelForScore, treatOrTrick: treatOrTrick,
    resolveGhostHour: resolveGhostHour, topGainer: topGainer,
    resolveDailyPick: resolveDailyPick, newWallet: newWallet,
    applyTreat: applyTreat, placeBet: placeBet, applyPayout: applyPayout,
    SAMPLE_PROTOCOLS: SAMPLE_PROTOCOLS, fmtUSD: fmtUSD, clamp: clamp
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.GhostfolioLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
