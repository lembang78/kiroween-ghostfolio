# Structure — Ghostfolio Token Radar

```
.
├── index.html            # Page structure: hero/wallet, ghost agents, radar, detail, prediction
├── style.css             # Spooky theme (dark, orange/purple, colour-coded labels)
├── app.js                # Browser only: fetch, DOM, localStorage, timers
├── logic.js              # Pure logic (UMD): Ghost Score, treat/trick, markets, wallet, sample data
├── tests/
│   └── ghost-score.test.js  # node --test, property-based, seeded PRNG
├── .kiro/
│   ├── steering/         # product.md, tech.md, structure.md (this file)
│   ├── specs/ghostfolio/ # requirements.md, design.md, tasks.md
│   ├── hooks/            # on-save hook: run tests when logic.js changes
│   └── agents/           # radar-ghost, treat-ghost, oracle-ghost (custom agents)
├── LICENSE               # Apache-2.0
├── README.md
├── KIRO_USAGE.md         # Honest record of what Kiro did / did not do
└── SUBMISSION_NOTES.md   # What remains before Devpost submission
```

## Naming
- `logic.js` exports `GhostfolioLogic` (browser global) and `module.exports` (Node).
- DOM ids are kebab-case (`radarBody`, `betStatus` use camelCase in JS).
- CSS classes: `.badge.FARM`, `.badge.FARM-SMALL`, `.badge.WATCH-ONLY`.

## Change rules
- Never put scoring/payout maths in `app.js` — add it to `logic.js` and
  add a property test first.
- Never commit `.kiro/` to `.gitignore`.
- Sample data is fallback only: the UI must say SAMPLE when it is in use.
