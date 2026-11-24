/* Ghostfolio Token Radar — browser app.
 * Uses GhostfolioLogic (logic.js) for all scoring / game maths.
 * Live data: DefiLlama /protocols (no key), CoinGecko simple price (no key).
 * If either API fails, the app falls back to bundled sample data / last
 * known prices and says so in the UI — it never shows a blank page.
 */
(function () {
  'use strict';
  var L = window.GhostfolioLogic;
  var WALLET_KEY = 'ghostfolio-wallet-v1';
  var DAILY_KEY = 'ghostfolio-daily-v1';

  var state = {
    protocols: [], usingSample: false, prices: {}, prevPrices: {},
    selected: null, sortBy: 'tvl', labelFilter: '', chainFilter: '', query: '',
    activeBet: null, betTimer: null
  };

  // ---------- wallet ----------
  function loadWallet() {
    try {
      var raw = localStorage.getItem(WALLET_KEY);
      if (raw) { var w = JSON.parse(raw); if (typeof w.balance === 'number') return w; }
    } catch (e) { /* fresh wallet */ }
    return L.newWallet();
  }
  function saveWallet(w) { try { localStorage.setItem(WALLET_KEY, JSON.stringify(w)); } catch (e) {} }
  var wallet = loadWallet();

  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function tomorrowStr() { var d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }

  function renderWallet() {
    document.getElementById('balance').textContent = Math.round(wallet.balance).toLocaleString();
    document.getElementById('streak').textContent = wallet.streak;
    var today = todayStr();
    var visited = Object.keys(wallet.visited || {}).filter(function (k) { return wallet.visited[k] === today; }).length;
    document.getElementById('visitedCount').textContent = visited;
  }

  // ---------- data ----------
  function scoreAll(list) {
    return list.map(function (p) {
      var s = L.ghostScore(p.tvl, p.mcap);
      return { name: p.name, slug: p.slug, tvl: p.tvl, mcap: p.mcap,
        category: p.category || 'DeFi', chains: p.chains || [],
        change_1d: (typeof p.change_1d === 'number') ? p.change_1d : null,
        score: s.score, label: s.label, ratio: s.ratio, predictedMcap: s.predictedMcap, hasMcap: s.hasMcap };
    });
  }

  function loadRadar() {
    return fetch('https://api.llama.fi/protocols')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        var rows = data.filter(function (p) { return p.tvl && p.tvl > 0; })
          .sort(function (a, b) { return b.tvl - a.tvl; }).slice(0, 40);
        state.protocols = scoreAll(rows);
        state.usingSample = false;
        setDataNote('🟢 Live data from DefiLlama — top 40 protocols by TVL. Updated ' + new Date().toLocaleTimeString() + '.', false);
      })
      .catch(function () {
        state.protocols = scoreAll(L.SAMPLE_PROTOCOLS);
        state.usingSample = true;
        setDataNote('🟠 OFFLINE SAMPLE DATA — DefiLlama was unreachable, so the app runs on bundled sample data. Refresh to retry live data.', true);
      })
      .then(function () { buildChainFilter(); renderRadar(); });
  }

  function setDataNote(text, isSample) {
    var el = document.getElementById('dataNote');
    el.textContent = text;
    el.classList.toggle('sample', !!isSample);
  }

  function loadPrices() {
    return fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        state.prevPrices = state.prices;
        state.prices = {
          solana: data.solana && data.solana.usd,
          bitcoin: data.bitcoin && data.bitcoin.usd,
          ethereum: data.ethereum && data.ethereum.usd
        };
        renderPrices();
      })
      .catch(function () { renderPrices(true); });
  }

  // ---------- radar rendering ----------
  function filtered() {
    var q = state.query.trim().toLowerCase();
    var rows = state.protocols.filter(function (p) {
      if (q && p.name.toLowerCase().indexOf(q) === -1) return false;
      if (state.labelFilter && p.label !== state.labelFilter) return false;
      if (state.chainFilter && p.chains.indexOf(state.chainFilter) === -1) return false;
      return true;
    });
    var key = state.sortBy;
    rows.sort(function (a, b) {
      if (key === 'score') return b.score - a.score;
      if (key === 'mcap') return (b.mcap || 0) - (a.mcap || 0);
      if (key === 'change') return (b.change_1d || 0) - (a.change_1d || 0);
      return b.tvl - a.tvl;
    });
    return rows;
  }

  function renderRadar() {
    var rows = filtered();
    var body = document.getElementById('radarBody');
    if (!rows.length) { body.innerHTML = '<tr><td colspan="8">No protocols match your filters. 👻</td></tr>'; }
    else {
      body.innerHTML = rows.map(function (p, i) {
        var chg = (p.change_1d === null) ? 'n/a'
          : '<span class="' + (p.change_1d >= 0 ? 'up' : 'down') + '">' + (p.change_1d >= 0 ? '+' : '') + p.change_1d.toFixed(1) + '%</span>';
        return '<tr data-slug="' + p.slug + '" class="' + (state.selected === p.slug ? 'selected' : '') + '">' +
          '<td>' + (i + 1) + '</td><td><strong>' + esc(p.name) + '</strong><br><small style="color:var(--muted)">' + esc(p.category) + ' · ' + esc(p.chains.slice(0, 2).join(', ')) + '</small></td>' +
          '<td class="num">' + L.fmtUSD(p.tvl) + '</td><td class="num">' + L.fmtUSD(p.mcap) + '</td>' +
          '<td class="num"><span class="score-bar"><i style="width:' + p.score + '%"></i></span>' + p.score.toFixed(1) + '</td>' +
          '<td><span class="badge ' + p.label.replace(' ', '-') + '">' + p.label + '</span></td>' +
          '<td class="num">' + chg + '</td><td>🏠</td></tr>';
      }).join('');
    }
    document.getElementById('radarCount').textContent =
      rows.length + ' protocols shown (of ' + state.protocols.length + (state.usingSample ? ' sample' : ' live') + '). Click a row for detail, trick-or-treat and the daily pick.';
    body.querySelectorAll('tr[data-slug]').forEach(function (tr) {
      tr.addEventListener('click', function () { selectProtocol(tr.getAttribute('data-slug')); });
    });
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function buildChainFilter() {
    var chains = {};
    state.protocols.forEach(function (p) { p.chains.forEach(function (c) { chains[c] = true; }); });
    var sel = document.getElementById('chainFilter');
    sel.innerHTML = '<option value="">All chains</option>' +
      Object.keys(chains).sort().map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
  }

  // ---------- detail + trick-or-treat ----------
  function selectProtocol(slug) {
    state.selected = slug;
    var p = state.protocols.find(function (x) { return x.slug === slug; });
    if (!p) return;
    renderRadar();
    var panel = document.getElementById('detailPanel');
    panel.hidden = false;
    document.getElementById('detailName').textContent = '🏠 ' + p.name + ' — ' + p.label;
    var visitedToday = wallet.visited && wallet.visited[slug] === todayStr();
    document.getElementById('detailBody').innerHTML =
      '<p><strong>TVL:</strong> ' + L.fmtUSD(p.tvl) + ' &nbsp; <strong>Market cap:</strong> ' + L.fmtUSD(p.mcap) +
      (p.hasMcap ? '' : ' (not reported — score is neutral 50)') + '<br>' +
      '<strong>Ghost Score:</strong> ' + p.score.toFixed(1) + ' / 100 &nbsp; <strong>TVL-implied mcap:</strong> ' + L.fmtUSD(p.predictedMcap) +
      (p.ratio ? ' &nbsp; <strong>mcap ÷ implied:</strong> ' + p.ratio.toFixed(2) + '×' : '') + '<br>' +
      '<strong>Category:</strong> ' + esc(p.category) + ' &nbsp; <strong>Chains:</strong> ' + esc(p.chains.join(', ')) + '<br>' +
      'Formula: log₁₀(mcap) ≈ 6.965 + 0.522 × log₁₀(TVL). ' +
      (p.score >= 65 ? 'This house is undervalued vs its TVL — the Radar Ghost likes it.' :
       p.score >= 55 ? 'Mildly undervalued vs its TVL — worth a knock.' :
       'Fairly valued or overvalued vs its TVL — knock anyway, treats are random.') + '</p>';
    document.getElementById('treatBtn').disabled = visitedToday;
    document.getElementById('treatBtn').textContent = visitedToday ? '🎃 Already visited today — come back tomorrow!' : '🎃 Trick-or-Treat this house';
    document.getElementById('detailMsg').textContent = '';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function trickOrTreat() {
    var p = state.protocols.find(function (x) { return x.slug === state.selected; });
    if (!p) return;
    if (wallet.visited && wallet.visited[p.slug] === todayStr()) return;
    var result = L.treatOrTrick(Math.random);
    wallet = L.applyTreat(wallet, result);
    wallet.visited = wallet.visited || {};
    wallet.visited[p.slug] = todayStr();
    saveWallet(wallet); renderWallet();
    document.getElementById('detailMsg').textContent =
      result.type === 'treat'
        ? '🍬 TREAT! The ghost of ' + p.name + ' gave you +' + result.amount + ' Ghost Coins. Streak: ' + wallet.streak + '.'
        : '😱 TRICK! A ghost stole 5 Ghost Coins. Streak reset to 0.';
    document.getElementById('treatBtn').disabled = true;
    document.getElementById('treatBtn').textContent = '🎃 Already visited today — come back tomorrow!';
    setGhostTip('treat', result.type === 'treat'
      ? 'Sweet! +' + result.amount + ' coins. Knock on another house!'
      : 'Ouch, a trick! −5 coins. The next house might be kinder…');
  }

  // ---------- Ghost Hour ----------
  function renderPrices(failed) {
    var el = document.getElementById('prices');
    var names = { solana: 'SOL', bitcoin: 'BTC', ethereum: 'ETH' };
    el.innerHTML = Object.keys(names).map(function (id) {
      var price = state.prices[id];
      var prev = state.prevPrices[id];
      var arrow = (price && prev) ? (price > prev ? ' <span class="up">▲</span>' : price < prev ? ' <span class="down">▼</span>' : '') : '';
      return '<div class="price-card"><div>' + names[id] + '</div><strong>' +
        (price ? '$' + price.toLocaleString() : 'n/a') + '</strong>' + arrow + '</div>';
    }).join('') + (failed ? '<p style="color:var(--orange)">CoinGecko unreachable — showing last known prices.</p>' : '');
  }

  function placeGhostHourBet() {
    if (state.activeBet) { setBetStatus('A market is already running — wait for it to resolve, ghost.'); return; }
    var coin = document.getElementById('betCoin').value;
    var dir = document.getElementById('betDir').value;
    var stake = parseInt(document.getElementById('betStake').value, 10);
    var entry = state.prices[coin];
    if (!entry) { setBetStatus('No live price for that coin yet — wait for CoinGecko to load.'); return; }
    var after = L.placeBet(wallet, stake);
    if (!after) { setBetStatus('Not enough Ghost Coins for a ' + stake + '-coin stake. Go trick-or-treating first!'); return; }
    wallet = after; saveWallet(wallet); renderWallet();
    var endsAt = Date.now() + 60000;
    state.activeBet = { coin: coin, dir: dir, stake: stake, entry: entry, endsAt: endsAt };
    logBet('⏳ ' + coin.toUpperCase() + ' ' + dir.toUpperCase() + ' — ' + stake + ' coins @ $' + entry.toLocaleString() + ' (60s)…');
    state.betTimer = setInterval(function () {
      var left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setBetStatus('⏳ Ghost Hour running: ' + coin.toUpperCase() + ' ' + dir.toUpperCase() + ', ' + stake + ' coins @ $' + entry.toLocaleString() + ' — ' + left + 's left…');
      if (left <= 0) resolveGhostHourBet();
    }, 1000);
  }

  function resolveGhostHourBet() {
    clearInterval(state.betTimer);
    var bet = state.activeBet; state.activeBet = null;
    if (!bet) return;
    loadPrices().then(function () {
      var exit = state.prices[bet.coin] || bet.entry;
      var res = L.resolveGhostHour(bet.entry, exit, bet.dir, bet.stake);
      wallet = L.applyPayout(wallet, res.payout); saveWallet(wallet); renderWallet();
      var msg = res.outcome === 'win'
        ? '🎉 WIN! ' + bet.coin.toUpperCase() + ' went ' + (exit > bet.entry ? 'UP' : 'DOWN') + ' ($' + bet.entry.toLocaleString() + ' → $' + exit.toLocaleString() + '). You won ' + res.payout + ' coins (+' + res.profit + ').'
        : res.outcome === 'draw'
          ? '😐 DRAW — price unchanged at $' + exit.toLocaleString() + '. Stake refunded.'
          : '💀 LOSE. ' + bet.coin.toUpperCase() + ' went ' + (exit > bet.entry ? 'UP' : 'DOWN') + ' ($' + bet.entry.toLocaleString() + ' → $' + exit.toLocaleString() + '), you called ' + bet.dir.toUpperCase() + '. −' + bet.stake + ' coins.';
      setBetStatus(msg);
      logBet(msg);
      setGhostTip('oracle', res.outcome === 'win' ? 'The spirits favour you today. Cash out while you are ahead?' : 'The market is a fickle ghost. Try another coin?');
      wallet.bets = wallet.bets || [];
      wallet.bets.unshift({ coin: bet.coin, dir: bet.dir, stake: bet.stake, outcome: res.outcome, at: new Date().toISOString() });
      wallet.bets = wallet.bets.slice(0, 10); saveWallet(wallet);
    });
  }

  function setBetStatus(t) { document.getElementById('betStatus').textContent = t; }
  function logBet(t) {
    var ul = document.getElementById('betsLog');
    if (ul.querySelector('li') && ul.textContent.indexOf('None yet') !== -1) ul.innerHTML = '';
    var li = document.createElement('li'); li.textContent = t; ul.prepend(li);
  }

  // ---------- daily market ----------
  function loadDaily() {
    try {
      var raw = localStorage.getItem(DAILY_KEY);
      if (raw) renderDaily(JSON.parse(raw));
    } catch (e) {}
  }
  function renderDaily(d) {
    document.getElementById('dailyStatus').textContent = d
      ? 'Your pick for ' + d.resolveDate + ': ' + d.name + ' (25 coins staked). Winner = biggest 24h TVL gainer among the top 10 that day.'
      : "No daily pick yet. Choose a protocol above and press “Pick as tomorrow's top gainer”.";
  }
  function pickDaily() {
    var p = state.protocols.find(function (x) { return x.slug === state.selected; });
    if (!p) return;
    var existing = null;
    try { existing = JSON.parse(localStorage.getItem(DAILY_KEY) || 'null'); } catch (e) {}
    if (existing && existing.resolveDate === tomorrowStr()) {
      document.getElementById('dailyMsg').textContent = 'You already picked ' + existing.name + ' for ' + existing.resolveDate + '. One pick per day, ghost.';
      return;
    }
    var after = L.placeBet(wallet, 25);
    if (!after) { document.getElementById('dailyMsg').textContent = 'Not enough Ghost Coins (need 25). Go trick-or-treating first!'; return; }
    wallet = after; saveWallet(wallet); renderWallet();
    var d = { slug: p.slug, name: p.name, resolveDate: tomorrowStr(), tvlAtPick: p.tvl, staked: 25 };
    try { localStorage.setItem(DAILY_KEY, JSON.stringify(d)); } catch (e) {}
    renderDaily(d);
    document.getElementById('dailyMsg').textContent = '📅 Locked in: ' + p.name + ' for ' + d.resolveDate + ' (25 coins). Check back tomorrow with “Check yesterday\'s pick”.';
  }
  function checkDaily() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(DAILY_KEY) || 'null'); } catch (e) {}
    var msg = document.getElementById('dailyMsg');
    if (!d) { msg.textContent = 'No daily pick to check yet.'; return; }
    if (d.resolveDate > todayStr()) { msg.textContent = d.name + ' resolves on ' + d.resolveDate + ' — not yet, ghost. Patience.'; return; }
    // Resolution day (or later): compare 24h TVL changes of the top 10.
    var top10 = state.protocols.slice(0, 10);
    var changes = {};
    top10.forEach(function (p) { changes[p.slug] = (typeof p.change_1d === 'number') ? p.change_1d : 0; });
    var res = L.resolveDailyPick(d.slug, changes);
    if (res.outcome === 'win') {
      wallet = L.applyPayout(wallet, 50); saveWallet(wallet); renderWallet();
      msg.textContent = '🎉 ' + d.name + ' was the top gainer (' + changes[d.slug].toFixed(1) + '%)! You win 50 coins (2× your 25 stake).';
    } else {
      var winner = state.protocols.find(function (p) { return p.slug === res.winner; });
      msg.textContent = '💀 ' + d.name + ' lost. Top gainer was ' + (winner ? winner.name : res.winner) + ' (' + changes[res.winner].toFixed(1) + '%). Your 25 coins are gone — the house always wins, eventually.';
    }
    try { localStorage.removeItem(DAILY_KEY); } catch (e) {}
    renderDaily(null);
  }

  // ---------- ghost agents (rule-based tips, not fake AI) ----------
  var TIPS = {
    radar: [
      'Boo! Sort by Ghost Score — the FARM rows are undervalued vs their TVL.',
      'A high TVL with a low market cap is a ghost with unfinished business.',
      'WATCH ONLY means fairly valued. It can still trick-or-treat, though.'
    ],
    treat: [
      'Treats pay 10–50 coins, tricks cost 5. Every house can be visited once a day.',
      'Your streak grows with every treat. A trick resets it to zero — spooky!',
      'Knock on a FARM house first. The ghosts there are generous.'
    ],
    oracle: [
      'Ghost Hour is 60 seconds. UP or DOWN, 1.9× if you are right.',
      'I see SOL move fastest at night. Or is that just the wind?',
      'Never bet your last coins. Even ghosts keep a reserve.'
    ]
  };
  var tipIndex = { radar: 0, treat: 0, oracle: 0 };
  function setGhostTip(ghost, text) { document.getElementById('tip-' + ghost).textContent = text; }
  function askGhost(ghost) {
    var tips = TIPS[ghost];
    var t = tips[tipIndex[ghost] % tips.length]; tipIndex[ghost] += 1;
    if (ghost === 'radar' && state.protocols.length) {
      var top = state.protocols.slice().sort(function (a, b) { return b.score - a.score; })[0];
      t = 'Right now my top FARM is ' + top.name + ' (score ' + top.score.toFixed(1) + ', TVL ' + L.fmtUSD(top.tvl) + ').';
    }
    if (ghost === 'oracle' && state.prices.solana) {
      t = 'SOL is $' + state.prices.solana.toLocaleString() + ' right now. Sixty seconds from now? Even I cannot say.';
    }
    setGhostTip(ghost, t);
  }

  // ---------- wire up ----------
  document.getElementById('search').addEventListener('input', function (e) { state.query = e.target.value; renderRadar(); });
  document.getElementById('sortBy').addEventListener('change', function (e) { state.sortBy = e.target.value; renderRadar(); });
  document.getElementById('labelFilter').addEventListener('change', function (e) { state.labelFilter = e.target.value; renderRadar(); });
  document.getElementById('chainFilter').addEventListener('change', function (e) { state.chainFilter = e.target.value; renderRadar(); });
  document.getElementById('treatBtn').addEventListener('click', trickOrTreat);
  document.getElementById('dailyBtn').addEventListener('click', pickDaily);
  document.getElementById('betBtn').addEventListener('click', placeGhostHourBet);
  document.getElementById('checkDailyBtn').addEventListener('click', checkDaily);
  document.getElementById('resetWallet').addEventListener('click', function () {
    wallet = L.newWallet(); saveWallet(wallet); renderWallet();
    setBetStatus('Wallet reset to 1,000 Ghost Coins. Fresh start, fresh haunting.');
  });
  document.querySelectorAll('[data-ghost]').forEach(function (btn) {
    btn.addEventListener('click', function () { askGhost(btn.getAttribute('data-ghost')); });
  });

  renderWallet();
  loadDaily();
  loadRadar();
  loadPrices();
  setInterval(loadPrices, 30000);
})();
