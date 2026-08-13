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

`npm run deploy` remains available for an out-of-band deploy from your machine.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:4321 |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Preview the build locally |
| `npm run check` | Type-check `.astro` and `.ts` files |
| `npm run placeholders` | Regenerate placeholder imagery |
| `npm run seed` | Seed a Sanity dataset from the placeholder content |
| `npm run deploy` | Build and deploy to Netlify production |

Booking enquiries are captured by Netlify Forms and emailed to jmpartyteam@gmail.com.
The DJs' calendar is deliberately **not** published: showing which dates are taken would
expose their booking schedule to anyone, including competitors, so there is no
availability endpoint.

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
