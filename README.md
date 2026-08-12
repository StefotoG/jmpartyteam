# jmpartyteam.com

Bilingual (BG/EN) promo site for the JM Party Team DJ duo.

- **Astro** static output, **Tailwind v4**, no framework runtime
- **BG at `/`**, **EN at `/en/`**, with localized URL slugs (`/uslugi/svatbi/` ↔ `/en/services/weddings/`)
- Content from **Sanity**, falling back to local placeholder data until Sanity is configured
- Deployed on **Netlify**; booking form via Netlify Forms; availability via a Netlify Function

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:4321 |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Preview the build locally |
| `npm run check` | Type-check `.astro` and `.ts` files |
| `npm run placeholders` | Regenerate placeholder imagery |

The availability function only runs under `netlify dev` (or when deployed), not under
`astro dev`. Without it the calendar shows its fallback message — that is the intended
behaviour, not a bug.

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

Copy `.env.example` to `.env` and fill in as needed. All variables are build-time or
function-only — none are exposed to the browser.

### Google Calendar availability

1. Create a Google Cloud project and enable the Calendar API.
2. Create a **service account** and download its JSON key.
3. Share the DJs' calendar with the service account's email address, **read-only**.
4. Set `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` and `GOOGLE_CALENDAR_ID`
   in the Netlify UI (never in the repo).

The function queries the **freeBusy** endpoint, which returns only busy time ranges. Event
titles, venues and attendees are never retrieved, so clients' private details cannot leak
onto the public site. If the lookup fails, the calendar hides itself rather than rendering
an empty grid that would imply every date is free.

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
