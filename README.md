# Fave and Tea Memories

A wedding gallery app for Mr Tea & Mrs Fave where guests can share and browse photos. Photos can be grouped by event, and guests can also view the church ceremony and reception programmes.

## Run locally

Install the project packages:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local address shown in the terminal.

## Build

Create a production build:

```bash
npm run build
```

## Image cache

Gallery thumbnails and the photo list are served through a Cloudflare Worker (in `worker/`) that caches them in Workers KV, so guests don't wait on Google Drive and Apps Script. A scheduled job refreshes the photo list from Apps Script every 5 minutes, and the site asks for an immediate refresh after each upload or delete. Without `VITE_IMAGE_CACHE_URL` set, the app loads straight from Drive as before.

The worker is deployed as `https://fave-tea-cache.fave-tea-cache.workers.dev`. To redeploy after changes:

```bash
cd worker
npm install
npx wrangler deploy
```

Allowed site origins are set in `ALLOWED_ORIGINS` in `worker/wrangler.toml`. The Apps Script URL is stored as a secret (`npx wrangler secret put APPS_SCRIPT_URL`); for local testing with `npx wrangler dev`, put it in `worker/.dev.vars`.

The site needs `VITE_IMAGE_CACHE_URL` set to the worker URL in Render's environment variables.
