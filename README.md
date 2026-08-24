# jmpartyteam.com

Bilingual (BG/EN) promo site for the JM Party Team DJ duo.

- **Astro** static output, **Tailwind v4**, no framework runtime
- **BG at `/`**, **EN at `/en/`**, with localized URL slugs (`/uslugi/svatbi/` ↔ `/en/services/weddings/`)
- Content from **Sanity** (project `2vhaiuqq`), falling back to local placeholder data when unset
- Deployed on **Netlify** from GitHub; booking form via Netlify Forms

Live: https://jmpartyteam.netlify.app · CMS: https://jmpartyteam.sanity.studio

## Deploying

Pushing to `main` deploys automatically. Publishing content in the Studio fires a Sanity
webhook at a Netlify build hook, which rebuilds the site — the DJs do not need a developer
to put content live.

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
| `npm run experiment:charts` | Render the result figures as SVG |
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

### Local database

```bash
brew install postgresql@17
pg_ctl -D /opt/homebrew/var/postgresql@17 -l /tmp/pg17.log start
createdb jm_booking
createdb jm_booking_test
npm run db:migrate
```

Connection URLs are string literals in [`src/server/db/client.ts`](src/server/db/client.ts)
and must move into configuration before this is deployed, together with the admin password
and session secret in [`src/server/auth/session.ts`](src/server/auth/session.ts).

Use `127.0.0.1` rather than `localhost`: over IPv6 libpq attempts GSSAPI and fails when
`krb5` is installed alongside PostgreSQL.

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
