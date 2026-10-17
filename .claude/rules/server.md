---
paths:
  - "src/server/**"
---

## Server (Cloudflare Worker + KV)
- Validate every input (names `NAME_RE`, sizes, lists). Never put client text into a response as HTML. Duel questions allow only `<sub>`/`<sup>`.
- KV is eventually consistent and has no transactions: write each key from one writer only, never read-modify-write shared keys
  (see the layout comment in `20-duels.js`). Give every duel key an expiry. Keep reads per poll to one.
- Answers and scoring for stakes stay on the server. The client is never trusted with money-like results.
- Plain http is redirected to https (not for localhost) and every response carries HSTS; keep `insecureRequest()` working. The site must never load anything over http.
- Every response gets the security headers in `30-router.js`. Do not loosen the CSP to make something work; fix the code.


- Notifications (`ping`) carry a `kind`; decide what a new kind replaces, since a shared key overwrites. Add the kind to `tests/guards.test.mjs`.
