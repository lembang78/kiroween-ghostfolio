// Ghostfolio property-based tests. Run: node --test tests/
// Pure logic only (logic.js) — same code the browser runs.
// Seeded PRNG so the suite is deterministic.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 1. Score is always bounded 0..100, for random TVL/mcap.
test('ghostScore is bounded 0..100 (500 random pairs)', () => {
  const rng = mulberry32(42);
  for (let i = 0; i < 500; i++) {
    const tvl = Math.pow(10, 5 + rng() * 6);   // $100K .. $100B
    const mcap = Math.pow(10, 4 + rng() * 7);  // $10K .. $100B
    const s = L.ghostScore(tvl, mcap);
    assert.ok(s.score >= 0 && s.score <= 100, `score ${s.score} out of bounds`);
    assert.ok(['FARM', 'FARM SMALL', 'WATCH ONLY'].includes(s.label));
  }
});

// 2. Score is monotonic increasing in TVL for a fixed mcap.
test('ghostScore rises with TVL at fixed mcap', () => {
  const mcap = 1e9;
  let prev = -1;
  for (let tvl = 1e6; tvl <= 1e11; tvl *= 10) {
    const s = L.ghostScore(tvl, mcap).score;
    assert.ok(s >= prev, `tvl ${tvl}: score ${s} < prev ${prev}`);
    prev = s;
  }
});

// 3. Score is monotonic decreasing in mcap for a fixed TVL.
test('ghostScore falls with mcap at fixed TVL', () => {
  const tvl = 1e10;
  let prev = 101;
  for (let mcap = 1e6; mcap <= 1e11; mcap *= 10) {
    const s = L.ghostScore(tvl, mcap).score;
    assert.ok(s <= prev, `mcap ${mcap}: score ${s} > prev ${prev}`);
    prev = s;
  }
});

// 4. Fairly valued (mcap == TVL-implied mcap) scores exactly 50, WATCH ONLY.
test('fair value scores 50', () => {
  const tvl = 1e9;
  const pred = L.predictedMcap(tvl);
  const s = L.ghostScore(tvl, pred);
  assert.equal(s.score, 50);
  assert.equal(s.label, 'WATCH ONLY');
});

// 5. Labels follow thresholds, and only the three labels exist.
test('label thresholds', () => {
  assert.equal(L.labelForScore(100), 'FARM');
  assert.equal(L.labelForScore(65), 'FARM');
  assert.equal(L.labelForScore(64.9), 'FARM SMALL');
  assert.equal(L.labelForScore(55), 'FARM SMALL');
  assert.equal(L.labelForScore(54.9), 'WATCH ONLY');
  assert.equal(L.labelForScore(0), 'WATCH ONLY');
  // missing mcap -> neutral 50, WATCH ONLY
  const s = L.ghostScore(1e9, null);
  assert.equal(s.score, 50);
  assert.equal(s.label, 'WATCH ONLY');
  assert.equal(s.hasMcap, false);
});

// 6. Trick-or-treat payouts are bounded: treat 10..50, trick exactly -5.
test('treat/trick payout bounds (1000 draws)', () => {
  const rng = mulberry32(7);
  let treats = 0, tricks = 0;
  for (let i = 0; i < 1000; i++) {
    const r = L.treatOrTrick(rng);
    if (r.type === 'treat') {
      treats++;
      assert.ok(r.amount >= 10 && r.amount <= 50, `treat ${r.amount}`);
    } else {
      tricks++;
      assert.equal(r.amount, -5);
    }
  }
  assert.ok(treats > 500 && treats < 850, `treat rate ${treats}/1000, expected ~700`);
  assert.ok(tricks > 150 && tricks < 500, `trick rate ${tricks}/1000, expected ~300`);
});

// 7. Ghost Hour resolution: win pays 1.9x, draw refunds, loss pays 0.
test('resolveGhostHour payouts', () => {
  assert.deepEqual(L.resolveGhostHour(100, 101, 'up', 50), { outcome: 'win', payout: 95, profit: 45 });
  assert.deepEqual(L.resolveGhostHour(100, 99, 'down', 50), { outcome: 'win', payout: 95, profit: 45 });
  assert.deepEqual(L.resolveGhostHour(100, 99, 'up', 50), { outcome: 'lose', payout: 0, profit: -50 });
  assert.deepEqual(L.resolveGhostHour(100, 100, 'up', 50), { outcome: 'draw', payout: 50, profit: 0 });
  assert.deepEqual(L.resolveGhostHour(100, 101, 'down', 100), { outcome: 'lose', payout: 0, profit: -100 });
});

// 8. Daily market resolves to the biggest TVL gainer.
test('resolveDailyPick picks the top gainer', () => {
  const changes = { aave: 1.2, lido: 4.5, uniswap: -0.3 };
  assert.equal(L.resolveDailyPick('lido', changes).outcome, 'win');
  assert.equal(L.resolveDailyPick('aave', changes).outcome, 'lose');
  assert.equal(L.resolveDailyPick('aave', changes).winner, 'lido');
  assert.equal(L.topGainer(changes), 'lido');
});

// 9. Wallet maths: treat adds, trick never goes below 0, bet deducts, payout adds.
test('wallet flow end-to-end', () => {
  let w = L.newWallet();
  assert.equal(w.balance, 1000);
  w = L.applyTreat(w, { type: 'treat', amount: 40 });
  assert.equal(w.balance, 1040);
  assert.equal(w.streak, 1);
  w = L.applyTreat(w, { type: 'trick', amount: -5 });
  assert.equal(w.balance, 1035);
  assert.equal(w.streak, 0);
  const afterBet = L.placeBet(w, 50);
  assert.equal(afterBet.balance, 985);
  assert.equal(L.placeBet(w, 99999), null, 'cannot bet more than balance');
  w = L.applyPayout(afterBet, 95);
  assert.equal(w.balance, 1080);
  // trick at zero balance stays at zero
  let broke = L.newWallet(); broke.balance = 3;
  broke = L.applyTreat(broke, { type: 'trick', amount: -5 });
  assert.equal(broke.balance, 0);
});

// 10. Bundled sample data is valid: unique slugs, positive TVL, scorable.
test('sample protocols are valid', () => {
  const slugs = new Set();
  assert.ok(L.SAMPLE_PROTOCOLS.length >= 10, 'at least 10 sample protocols');
  for (const p of L.SAMPLE_PROTOCOLS) {
    assert.ok(p.tvl > 0, `${p.slug} tvl`);
    assert.ok(!slugs.has(p.slug), `duplicate slug ${p.slug}`);
    slugs.add(p.slug);
    const s = L.ghostScore(p.tvl, p.mcap);
    assert.ok(s.score >= 0 && s.score <= 100);
  }
});

// 11. fmtUSD formatting.
test('fmtUSD', () => {
  assert.equal(L.fmtUSD(2500000000), '$2.50B');
  assert.equal(L.fmtUSD(1500000), '$1.5M');
  assert.equal(L.fmtUSD(null), 'n/a');
});
