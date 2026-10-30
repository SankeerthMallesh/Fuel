# Fuel setup

Repo layout (files at the TOP LEVEL of the repo):
- public/index.html   the app
- worker.js           small server that calls Gemini for you (keeps your key secret)
- wrangler.jsonc      Cloudflare config (worker name: fuel)
- firebase.json, firestore.rules   Firebase config and rules

## Putting it on GitHub (important)
Unzip this, open the unzipped folder, select EVERYTHING inside it (worker.js, wrangler.jsonc, public, tests, ...) and drag it all into GitHub > Add file > Upload files. Do not drag the outer folder itself, or the files end up one level too deep and Cloudflare shows a 404.
After the commit, Cloudflare redeploys by itself. Open the workers.dev link in a private window.

## AI key (never put it in GitHub)
Cloudflare dashboard > Workers & Pages > fuel > Settings > Variables and Secrets > Add:
  Type: Secret   Name: GEMINI_KEY   Value: your Gemini key
Then Deploy. The key stays on Cloudflare and never appears in the page or repo.

## Firebase
Authentication > Settings > Authorized domains > add your Fuel domain.

## Tests
`node tests/fuzz.mjs 1000` runs about 200,000 checks on the calorie math, AI result cleanup and meal-plan validation (pass a bigger number for more rounds). It does not call Gemini, so it needs no key or internet.
