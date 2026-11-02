# Tix decision and build log

## 2 November 2026 — project setup

- The project directory was empty; Node.js, npm, Git, and Python are available.
- Started with a small event-booking MVP instead of a framework-heavy build. This keeps the code approachable and avoids unnecessary dependencies.
- Selected Cloudflare Workers + D1 for the planned hosted version after checking current provider documentation. Workers Free allows 100,000 requests/day; D1 Free allows 100,000 row writes/day, 5 million row reads/day, and 500 MB per database. Free quota exhaustion stops operations rather than automatically moving this app to a paid plan.
- Supabase Free is another option, but its docs say low-activity projects can pause after a week. Cloudflare has a direct static and database path for this project.
- No credit card, paid plan, custom domain, email delivery, or payment provider is part of this project. Hosting requires the user to create their own account and explicitly run the deployment steps.
- Booking is a reservation only. Real ticket sales require a payment service, fees, operational policies, and more security work; those cannot be promised at ₹0.

## Implementation notes

- Cloudflare Worker serves both the static site and `/api/*` routes.
- D1 is the shared source of truth for events and bookings.
- Server-side booking validation and inventory changes prevent the browser from inventing available stock.
- Admin route requires a password stored in an environment secret, never in frontend files.
- The MVP asks for a name and email to create a confirmation. It does not send emails or process card details.
- Local development uses Wrangler's local D1 simulator, separate from the future remote database.
- The local schema is applied explicitly with `npx wrangler d1 migrations apply tix-bookings --local`; Wrangler does not create the tables just by starting its dev server.

## Next learning steps

1. Run and inspect the app locally.
2. Try a reservation and create or edit an event from `/admin`.
3. Read `src/worker.js` alongside the database migration.
4. Review the free quota and account settings, then deploy only if the user wants to publish it.
5. Add tested payment and email integrations only after defining how their fees will be funded.
