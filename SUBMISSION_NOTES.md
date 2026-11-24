# SUBMISSION_NOTES.md — what remains before Devpost submission

V1 status: **complete and verified locally** (see Verification below).
Deadline: **Sat 5 Dec 2026 05:00 WIB** (Fri 4 Dec 14:00 PT).
Category: **Frankenstein**. Prizes: $100,000+ total, 1st $30,000,
Best Frankenstein $5,000. Winners announced ~3 Feb 2027.

## Still to do (needs Roby)

1. **GitHub access — BLOCKER.** The lembang78 GitHub password is repeatedly
   rejected. Until Roby resets the GitHub password (recovery email) or uses
   another GitHub account, this repo cannot be pushed public — and Kiroween
   requires a public GitHub repo. Do NOT enter any password into a chat.
   Steps once access works:
   ```bash
   cd ~/workspace/kiroween-ghostfolio
   git remote add origin https://github.com/<user>/ghostfolio-token-radar.git
   git push -u origin main
   ```
   Then confirm on github.com that `/.kiro` is visible at the repo root and
   the Apache-2.0 license shows in the About section.
2. **Devpost registration.** Join Kiroween on kiroween.devpost.com
   (free Devpost account, or log in).
3. **Kiro credits (optional but recommended).** Request the one-time 4,000
   Kiro credits by **Tue 1 Dec 12:00 PT** via the form in the rules; needs a
   Kiro user ID / AWS account ID. If Roby signs in to Kiro, update
   KIRO_USAGE.md with what Kiro actually ran.
4. **Demo video <3 min.** Public on YouTube. Script is in README.md
   ("Demo in 3 minutes"). Record the live app, not slides.
5. **Submit on Devpost.** Category Frankenstein; link the GitHub repo, the
   live app URL (deploy the static files anywhere, e.g. GitHub Pages /
   Netlify — or state that it runs from index.html), the video, and the
   Kiro write-up (point at KIRO_USAGE.md + .kiro/).
6. **Bonus prizes (cheap, optional).** Blog post about Kiro + this project
   (100 winners get 2,000 Kiro credits); social post starting with
   `#KiroweenHackathon26` (Social Blitz, 5 winners get 3 months Kiro Pro+).

## Verification (done 24 Nov 2026, WIB)

- `node --test tests/ghost-score.test.js` — **11/11 pass** (see test file
  for the property list). Note: run the file path explicitly; plain
  `node --test tests/` fails on Node 24.22.1 (treats the directory as a module).
- Local server: `python3 -m http.server` — **HTTP 200** for `/` and
  `index.html` (see report).
- Live data: DefiLlama `api.llama.fi/protocols` → HTTP 200; CoinGecko
  simple price → HTTP 200 (checked before build).
- Fallback: sample data path exercised by the test suite
  (`sample protocols are valid`) and by the catch branch in `app.js`.
- Game maths tested end-to-end in the test suite: wallet flow
  (1,000 → treat → trick → bet → payout), Ghost Hour payout table,
  daily pick resolution.

## Known V1 limits (honest)

- Kiro agent features were NOT used (sign-in blocker — see KIRO_USAGE.md).
- No live deployment yet; the app is static and deploys anywhere.
- Daily market resolution needs the user to return the next day and press
  "Check yesterday's pick" — it does not resolve itself.
- CoinGecko free tier can be slow; on resolution failure the bet resolves
  as a draw (stake refunded), never as a fake win.
