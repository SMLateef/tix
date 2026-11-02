# Tix — free ticket booking MVP

Tix is a small, beginner-friendly ticket booking app. It includes event browsing, ticket reservations, and a protected event management screen. It does **not** take payments: the booking flow reserves a ticket and returns a confirmation code.

## Cost promise and limits

This project uses free software locally and is designed for Cloudflare Workers + D1 Free for hosting. No paid domain, payment provider, or paid account is required. Cloudflare's free tier currently includes up to 100,000 Worker requests/day and D1 includes 100,000 rows written/day, 5 million rows read/day, and 500 MB per database. If a free limit is reached, requests may fail until the quota resets; this project will not enable a paid plan for you. Check the linked pricing and limits before deploying because provider terms can change.

Cloudflare Workers/D1 is a sensible zero-cost learning and demo host, not a promise of uninterrupted commercial service. Real payment processing, refunds, tax handling, ticket transfers, and identity verification are intentionally outside this first version.

## Run it on your computer

Requirements: Node.js 20 or newer and npm. The local server uses Wrangler's local simulator and a local D1 database; no Cloudflare account or card is needed to try it.

1. Open this folder in a terminal.
2. Copy `.dev.vars.example` to `.dev.vars` and replace the sample with a unique password.
3. Run `npm install` once.
4. Run `npx wrangler d1 migrations apply tix-bookings --local` to make the local database tables and sample events.
5. Run `npm run dev`.
6. Open the local URL printed by Wrangler (usually `http://localhost:8787`).

The migration creates four sample events in the local database. Local data stays on your computer under Wrangler's ignored `.wrangler` folder.

## What we built, and why

1. **Check the tools:** Node/npm are already available. The app is plain HTML, CSS, and JavaScript so the first version is easy to read and does not need a frontend framework.
2. **Choose a free hosting shape:** a Worker runs the API and serves the page; D1 stores shared events, reservations, and admin settings. Browser-only storage would not share bookings among customers, so it is not used for reservations.
3. **Define the booking rule:** the server checks availability and decrements inventory in a database batch before confirming. The browser never decides whether a ticket is available.
4. **Keep checkout free:** reservations are recorded as unpaid demo bookings. No payment information is collected.
5. **Protect management:** `/admin` asks for the admin password. Set it locally as `ADMIN_PASSWORD`; for a hosted deployment, store it as a Worker secret.

## Local admin access

Set `ADMIN_PASSWORD` in `.dev.vars` before starting the server. Open `/admin` and sign in. Do not use a real account password. The shared-password admin is a teaching/demo setup; before a public launch, add account-based administrator identity, password recovery, and login rate limiting.

## Deploy later (no card, no paid plan)

Deployment is deliberately a separate choice. To publish after reviewing the app:

1. Create a Cloudflare account and choose **Workers Free**. Do not select an upgrade.
2. In the project folder, run `npx wrangler login` and approve the login in the browser.
3. Run `npx wrangler d1 create tix-bookings`. Copy the returned database ID into `wrangler.toml` at `database_id`.
4. Run `npx wrangler d1 migrations apply tix-bookings --remote` to create and seed the shared tables.
5. Run `npx wrangler secret put ADMIN_PASSWORD` and enter a unique admin password when prompted.
6. Run `npm run deploy`. Wrangler will show the public `workers.dev` address.

These steps create a public website and a cloud database. The free plan has explicit quotas, and the app has no billing integration. Cloudflare account setup and current limits should be reviewed before deployment. To remove the deployed Worker and its database, use Cloudflare dashboard > Workers & Pages / D1.

## Project map

- `public/` — user interface
- `src/worker.js` — API, reservations, and admin routes
- `migrations/` — database schema and sample events
- `wrangler.toml` — local and hosted Worker settings
- `DECISIONS.md` — decision log and trade-offs

## Free-tier references checked on 2 Nov 2026

- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
# tix
