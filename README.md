# jmpartyteam.com

Bilingual (BG/EN) promo site for the JM Party Team DJ duo, extended with a booking
subsystem as an MSc diploma project.

- **Astro** with prerendered pages, **Tailwind v4**, no framework runtime
- **BG at `/`**, **EN at `/en/`**, with localized URL slugs (`/uslugi/svatbi/` ↔ `/en/services/weddings/`)
- Editorial content from **Sanity** (project `2vhaiuqq`), falling back to local placeholder data when unset
- Transactional booking data in **PostgreSQL**, kept deliberately separate from the CMS
- Deployed on **Netlify** from GitHub: static pages on the CDN, `/api/*` and `/admin` as one serverless function

Live: https://jmpartyteam.netlify.app · CMS: https://jmpartyteam.sanity.studio

## Diploma project

**Design and Implementation of a Web-Based Booking System with Guaranteed Consistency
under Concurrent Access** — MSc Software Engineering, Technical University of Sofia.

> How can a serverless, statically-generated web application guarantee correctness of
> resource allocation — that one DJ is never promised to two clients for the same night —
> under concurrent load, while keeping editorial content and transactional state in
> separate, purpose-appropriate stores?

Four allocation strategies were implemented and measured against one another at 1, 10, 50
and 200 concurrent attempts on a single contested date, ten runs per cell:

| Strategy | Double bookings at n=200 | Worst p95 | Loser is told |
| --- | --- | --- | --- |
| Check availability, then insert | **1873** | 127 ms | nothing — it succeeds |
| Exclusion constraint, no retry | 0 | 8.0 s | an error |
| Exclusion constraint with retry | 0 | **501 s** | an error |
| Advisory lock + constraint | 0 | **102 ms** | “that date is taken” |

The strategies are indistinguishable at the median and differ only in the tail. Three
findings came out of it: the check-then-act pattern fails in proportion to load; an
exclusion constraint gives correctness but resolves conflicts through the deadlock
detector, so the loser receives an error rather than an answer; and retrying a deadlock
amplifies it rather than resolving it.

A second experiment measures how long a date should be held for a client who has not yet
replied, and finds that the shortest deadline accepts nearly three times as many enquiries
as the best one while converting half as many — acceptance counts are an anti-metric.

- Full plan, architecture, results and figures: [`docs/thesis-booking-system.md`](docs/thesis-booking-system.md)
- Printable version: `npm run thesis:pdf` → `docs/thesis-proposal.pdf`
- Raw measurements and charts: [`docs/experiments/`](docs/experiments)

This work lives on the `booking-system` branch. `main` is the site the DJs use.

## Deploying

Pushing to `main` deploys automatically. Publishing content in the Studio fires a Sanity
webhook at a Netlify build hook, which rebuilds the site — the DJs do not need a developer
to put content live.

### What runs where

Astro 5 removed the separate `hybrid` mode: with an adapter configured, `output: 'static'`
remains the default and individual routes opt out. Only `/api/**` and `/admin/**` carry
`export const prerender = false`.

| | Marketing pages | `/api/*`, `/admin` |
| --- | --- | --- |
| Produced | At build time, 35 HTML files | Never — executed per request |
| Served by | Netlify's CDN | One **Netlify Function** (v2), on AWS Lambda, Node 22 |
| Talks to PostgreSQL | No | Yes |
| Cost per visit | None | Per invocation |

The build emits `.netlify/v1/functions/ssr`. A visitor reading about weddings never wakes
it; only submitting an enquiry or opening the admin does.

Two design decisions follow directly from there being no long-lived server process. Rate
limiting counts in PostgreSQL rather than in memory, because each function instance has its
own memory and instances come and go — an in-process counter would reset constantly and be
bypassed by requests landing on different instances. For the same reason the outbox
dispatcher claims work with a single atomic statement, since two instances can run at once.

`npm run deploy` remains available for an out-of-band deploy from your machine; it uploads
directly and bypasses git entirely.

Commits must be authored by a recognised Git contributor, otherwise Netlify refuses to build
this private repo ("Unrecognized Git contributor"). The GitHub account is linked under
Netlify → Team → Members → Git Contributors. Note that once `main` points at an unrecognised
commit, build-hook builds fail too, so content publishing breaks as well.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:4321 |
| `npm run build` | Build into `dist/`; pages static, `/api/*` as one SSR function |
| `npm run preview` | Preview the build locally |
| `npm run check` | Type-check `.astro` and `.ts` files |
| `npm run test` | Unit and integration tests (needs local PostgreSQL) |
| `npm run test:e2e` | Browser tests of the booking flow (starts the dev server) |
| `npm run db:migrate` | Apply the SQL migrations |
| `npm run maintenance` | Deliver queued notifications, release lapsed holds, purge rate-limit windows |
| `npm run experiment` | Concurrency measurements into `docs/experiments/` |
| `npm run experiment:holds` | Hold-deadline measurements into `docs/experiments/` |
| `npm run experiment:charts` | Render the result figures as SVG |
| `npm run sus` | Score the usability study responses |
| `npm run thesis:pdf` | Render the diploma project plan to PDF |
| `npm run placeholders` | Regenerate placeholder imagery |
| `npm run seed` | Seed a Sanity dataset from the placeholder content |
| `npm run deploy` | Build and deploy to Netlify production |

## Booking subsystem

Enquiries are persisted in PostgreSQL and allocated against the DJs as individually
bookable resources, so the same night can be sold twice when both are free and is refused
once neither is. Correctness is enforced by an exclusion constraint in the database rather
than by application code.

The DJs' calendar is deliberately **not** published: `/api/availability` answers only about
the one date it was asked about. Returning a list of free dates would let anyone, including
competitors, reconstruct the whole schedule.

| Route | Purpose |
| --- | --- |
| `POST /api/availability` | `{ date, serviceKey }` &rarr; `{ available }` |
| `POST /api/bookings` | Create an enquiry; `409` when the date is taken |
| `GET /admin` | Enquiry pipeline, behind a session cookie |
| `POST /api/admin/login` | Issues the session |

### Running it locally

PostgreSQL 17 is the only prerequisite beyond Node.

```bash
brew install postgresql@17
pg_ctl -D /opt/homebrew/var/postgresql@17 -l /tmp/pg17.log start
createdb jm_booking
createdb jm_booking_test

npm install
npm run db:migrate     # applies src/server/db/migrations/*.sql in order
npm run dev            # http://localhost:4321
```

Then submit an enquiry at `/kontakti/`, and open `/admin` (password `jm-dev-password`) to
see it arrive. `npm run maintenance` flushes the notifications it queued.

`brew services` cannot register the launch agent on a managed machine, so PostgreSQL is
started by hand and does not survive a reboot. Use `127.0.0.1` rather than `localhost`:
over IPv6 libpq attempts GSSAPI and fails when `krb5` is installed alongside PostgreSQL.

### Reproducing the measurements

```bash
npm test                     # 47 unit and integration tests
npm run test:e2e             # 5 browser tests, drives the installed Chrome
npm run experiment           # concurrency comparison, ~5 min
npm run experiment:holds     # hold deadline trade-off, ~7 min
npm run experiment:charts    # redraw the three figures from the raw data
```

The concurrency experiment raises `max_connections` expectations: it opens up to 210
connections, so the local cluster needs `ALTER SYSTEM SET max_connections = 400` and a
restart before 200-way runs are genuinely concurrent rather than queued in the client pool.

### Not production-ready

Deliberate shortcuts, all confined to this branch:

- The admin password and session secret are literals in
  [`src/server/auth/session.ts`](src/server/auth/session.ts). They must become configuration,
  with an argon2id hash, before any deployment.
- Database URLs are literals in [`src/server/db/client.ts`](src/server/db/client.ts).
- The business notification address is a literal in
  [`src/server/domain/bookings.ts`](src/server/domain/bookings.ts).
- Notifications are written to an outbox and printed to the console; no email provider is
  wired up. Deposits via Stripe are designed but not implemented.

`main` remains the site the DJs use, and this branch is not merged into it.

## Content

Until `SANITY_PROJECT_ID` is set, all content is read from
[`src/content/placeholder.ts`](src/content/placeholder.ts). That file is also the input for
the seed script, so the two stay in sync.

Every seeded document carries `isPlaceholder: true`. Setting `REQUIRE_REAL_CONTENT=true`
makes the build **fail** while any flagged document remains. Set it on the production
Netlify context so seeded copy can never reach real customers.

### Setting up Sanity

The Studio lives in [`studio/`](studio) as its own package and deploys as a **separate**
Netlify site, so its React bundle never enters the marketing site's build.

```bash
cd studio
npm install
npx sanity login
npx sanity init --project-plan free   # creates the project, prints the project ID
```

Then set `SANITY_STUDIO_PROJECT_ID` (studio) and `SANITY_PROJECT_ID` (site), and seed the
dataset with the placeholder content so the DJs open a populated Studio rather than a blank one:

```bash
SANITY_PROJECT_ID=xxx SANITY_WRITE_TOKEN=yyy npm run seed
```

Create the write token under **Sanity → API → Tokens → Editor**. It is only needed locally
for seeding; never add it to Netlify.

Finally, add a Sanity webhook pointing at a Netlify build hook so publishing content
triggers a redeploy, and add `https://studio.jmpartyteam.com` to the project's CORS origins
with credentials allowed.

## Environment

Copy `.env.example` to `.env` and fill in as needed. All variables are build-time only —
none are exposed to the browser.

## Before launch

- [ ] Replace every file in `public/placeholders/` with the DJs' own photos
- [ ] Replace the text wordmark in `Header.astro` / `Footer.astro` with the real logo
- [ ] Real prices, testimonials, bios, phone numbers and social links
- [ ] Set `REQUIRE_REAL_CONTENT=true` on the production context and confirm the build passes
- [ ] Have the privacy policy and terms reviewed against the DJs' actual legal entity
- [ ] Confirm the BGN dual-display obligation has lapsed (prices are EUR-only)
- [ ] Choose www or apex as canonical and redirect the other
- [ ] Test in the Instagram and Facebook in-app browsers on a real phone
# jmpartyteam
