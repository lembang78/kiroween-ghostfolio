# Tasks — Ghostfolio Token Radar (Kiro spec)

Status: V1 complete 24 Nov 2026 (hand-written; Kiro CLI could not run
agent tasks without sign-in — see KIRO_USAGE.md).

- [x] 1. Scaffold repo: index.html, style.css, app.js, logic.js, tests/
- [x] 2. Implement Ghost Score in logic.js (power-law formula + labels)
- [x] 3. DefiLlama fetch with bundled sample fallback + SAMPLE banner
- [x] 4. Radar table: search, sort (TVL/score/mcap/change), label + chain filters
- [x] 5. Detail panel with score breakdown and formula
- [x] 6. Trick-or-treat: once per house per day, 70/30 odds, streak, floor at 0
- [x] 7. Ghost Hour: CoinGecko polling, 60s markets, 1.9× / refund / 0
- [x] 8. Daily market: one pick per day, resolve date shown, resolve on/after date
- [x] 9. Three ghost agents with state-derived tips
- [x] 10. Wallet in localStorage (start 1,000), reset button
- [x] 11. Property tests (11 tests, node --test) — all passing
- [x] 12. .kiro steering, specs, hooks, agents; KIRO_USAGE.md; README; LICENSE
- [x] 13. Verify: local server HTTP 200, live + fallback rendering, test run
- [ ] 14. (Roby) Create/reset GitHub account access, push repo public
- [ ] 15. (Roby) Register on Devpost, request 4,000 Kiro credits by 1 Dec 12:00 PT
- [ ] 16. (Roby) Record demo video <3 min, submit by Sat 5 Dec 05:00 WIB

## Nice-to-have (V2, only if time remains before 5 Dec)
- [ ] Live TVL sparklines per protocol (DefiLlama historical endpoint)
- [ ] Sound effects on treat/trick (WebAudio, no assets)
- [ ] Share-card image of your Ghost Score / wallet for the Social Blitz post
