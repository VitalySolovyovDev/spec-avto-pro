# Hosted Debug

Use this folder for bugs that reproduce only on the hosted site (`https://spec-avto.pro`).

## Default flow

1. Reproduce the issue in a real browser with `npm run smoke:prod`.
2. Probe the live API directly (`POST /api/contact`) to separate frontend failures from backend/runtime failures.
3. If the live API returns `500`, inspect the deployed runtime over SSH:
   - deployed `backend/.env`
   - deployed `backend/dist/server.js`
   - Node version at `~/.local/bin/node`
   - direct outbound requests from the host to Telegram API
4. If Telegram delivery is involved, run `npm run telegram:webhook` and, if needed, send a synthetic `POST /api/telegram/webhook` with the correct secret header.
5. After the fix, redeploy with `npm run deploy` and rerun `npm run smoke:prod`.

## Smoke test

`prod-smoke.spec.js` checks:

- load-time console warnings and errors
- failed or non-OK network requests on initial page load
- successful form submission to `/api/contact`

If Playwright browsers are missing locally, run:

```bash
npx playwright install chromium
```

## Notes from 2026-03-19

- Never let literal `undefined` or `null` values reach the deployed `backend/.env`.
- A page can look correct while still logging broken asset warnings in the browser console.
- Keep reusable checks in `scripts/debug/`; delete one-off debug code after the issue is fixed.
