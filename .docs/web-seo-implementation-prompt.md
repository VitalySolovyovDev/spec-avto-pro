# Web SEO Implementation Prompt

## Mission
Implement repo-native SEO updates for `spec-avto.pro` so `frontend/src/index.html` becomes the fully optimized indexable commercial landing page for demand in Tver and Tver Oblast, while `frontend/src/privacy.html` becomes a consistent `noindex,follow` legal page with correct canonical routing and shipped crawl artifacts.

## Repo Facts To Preserve
- `spec-avto.pro` is a Russian-language local commercial website for legal removal and transportation of waste in `Тверь` and `Тверская область`.
- The confirmed offer covers `строительный мусор`, `отходы производства`, `КГО`, `растительные отходы`, and waste classes `4-5`; do not expand the scope beyond those confirmed facts.
- Confirmed trust/commercial facts already present in the repo include legal work, a waste-transport license, contracts, closing documents, own equipment, official landfills, phone `+7 (952) 068-31-30`, email `spec-avt-pro@yandex.ru`, and published working hours.
- The landing page is the primary demand-capture page; the privacy page is a utility/legal page.
- The frontend is a static `Rspack` MPA generated from `frontend/src/index.html` and `frontend/src/privacy.html`; production serves the built output from `frontend/dist`.
- `frontend/rspack.config.js` currently copies `frontend/src/assets/` to `frontend/dist/assets/`; `assets/images/hero-waste-truck.jpg` is a confirmed reusable preview image.
- In production `backend/app.js` serves static files from the built frontend output and falls back unknown routes to `index.html`, so only confirmed routes should be canonicalized.
- Use only confirmed repo facts. If a metadata or schema field would require an unverified address, coordinates, ratings, social profiles, legal identifiers, extra services, extra pages, or extra regions, omit that field.
- The only confirmed privacy-policy route is `privacy.html`; do not assume `/privacy` exists.

## Files To Edit
- Update `frontend/src/index.html`: complete homepage metadata, canonical, social tags, and homepage-only JSON-LD.
- Update `frontend/src/privacy.html`: fix brand consistency, add explicit privacy-page metadata/indexation handling, and correct any internal/self URL that still points to unconfirmed `/privacy`.
- Update `frontend/rspack.config.js`: copy root-level crawl files from source into the root of `frontend/dist`.
- Create `frontend/src/robots.txt`: minimal crawl policy plus sitemap reference.
- Create `frontend/src/sitemap.xml`: canonical sitemap for the indexable page set.

No backend file edits are required; `backend/app.js` already serves root-level files from `frontend/dist` once they exist there. Do not edit `frontend/dist` directly.

## Priority SEO Changes
- `P0` `frontend/src/index.html`: Replace the current partial homepage head metadata with one complete, non-duplicated set. Use the exact homepage `title` `Вывоз отходов 4-5 класса в Твери и области | СПЕЦ-АВТО.ПРО` and the exact homepage `meta name="description"` `Легальный вывоз строительных, промышленных, растительных отходов и КГО в Твери и Тверской области. Договор, закрывающие документы, собственная техника, официальные полигоны.` Keep `meta name="robots" content="index,follow"`. Add `link rel="canonical" href="https://spec-avto.pro/"`. Add or update `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image`, `twitter:card`, `twitter:title`, `twitter:description`, and `twitter:image`. Use absolute HTTPS URLs everywhere and reuse `https://spec-avto.pro/assets/images/hero-waste-truck.jpg` for the social preview image.
- `P0` `frontend/src/privacy.html`: Turn the policy page into an explicit utility/legal page. Replace the current `СПЕЦТЕХ-ПРО` branding in the page `<title>` and `<meta name="description">` with `СПЕЦ-АВТО.ПРО`. Use the exact title `Политика конфиденциальности | СПЕЦ-АВТО.ПРО` and the exact description `Политика обработки персональных данных сайта СПЕЦ-АВТО.ПРО для заявок на вывоз отходов в Твери и Тверской области.` Add `meta name="robots" content="noindex,follow"`. Add `link rel="canonical" href="https://spec-avto.pro/privacy.html"`. Add a matching minimal OG/Twitter set with `og:url` pointing to `https://spec-avto.pro/privacy.html` and the same absolute preview image as the homepage. Replace the in-document `https://spec-avto.pro/privacy` reference with `https://spec-avto.pro/privacy.html`. Do not rewrite the legal substance of the policy beyond this brand/routing cleanup.
- `P0` `frontend/src/robots.txt`, `frontend/src/sitemap.xml`, `frontend/rspack.config.js`: Create and ship crawl artifacts from source. `robots.txt` should allow crawling and declare `Sitemap: https://spec-avto.pro/sitemap.xml`; do not disallow `privacy.html`, because the chosen control is `noindex,follow`, not crawl blocking. `sitemap.xml` should list only canonical indexable URLs from this repo; with the chosen policy that means `https://spec-avto.pro/` only. Update the existing `CopyRspackPlugin` config so `robots.txt` and `sitemap.xml` are copied to the root of `frontend/dist`, not into `assets/`.
- `P1` `frontend/src/index.html`: Add one homepage-only `application/ld+json` block with an `@graph` containing `WebSite`, a provider node typed as `LocalBusiness`, and a `Service` node. The graph may use only confirmed facts: site URL `https://spec-avto.pro/`, brand `СПЕЦ-АВТО.ПРО`, phone `+7 (952) 068-31-30`, email `spec-avt-pro@yandex.ru`, service area `Тверь` and `Тверская область`, working hours already shown in the footer, the confirmed service scope around legal waste removal and transportation of classes `4-5`, and the existing hero image as the schema `image` if you include an image field. Omit `address`, `geo`, `sameAs`, `priceRange`, `aggregateRating`, `review`, `foundingDate`, and any unsupported legal identifiers or claims. Do not add structured data to `privacy.html`.
- `P2` `frontend/src/index.html` and `frontend/src/privacy.html`: Do a light semantic/internal-link cleanup while touching the files. Preserve one `h1` per page. Keep the landing-page anchor navigation intact. Ensure homepage links to the privacy page continue to use `privacy.html`, and make sure no source or built HTML uses the unconfirmed `/privacy` route. Keep informative image `alt` text natural and useful, but do not keyword-stuff it; keep the hero image decorative with an empty `alt`, because its wrapper is already `aria-hidden`.

## Acceptance Criteria
- `frontend/dist/index.html` contains exactly one homepage `title`, one homepage `meta description`, `meta name="robots" content="index,follow"`, an absolute canonical `https://spec-avto.pro/`, and a complete non-duplicated `Open Graph`/Twitter set with absolute `og:url`, `og:image`, and `twitter:image`.
- `frontend/dist/privacy.html` contains the corrected `СПЕЦ-АВТО.ПРО` branding, `meta name="robots" content="noindex,follow"`, an absolute canonical `https://spec-avto.pro/privacy.html`, a minimal non-duplicated OG/Twitter set using the `.html` URL, and no remaining canonical/share/internal reference to the unconfirmed `/privacy` URL.
- The homepage JSON-LD is valid JSON, present in the built file, and limited to confirmed facts; it does not introduce an address, coordinates, ratings, review counts, prices, extra regions, or unsupported legal/business claims.
- `frontend/dist/robots.txt` and `frontend/dist/sitemap.xml` exist after build as root-level files.
- `frontend/dist/sitemap.xml` lists only indexable canonical URLs; with the chosen policy it includes `https://spec-avto.pro/` and excludes `https://spec-avto.pro/privacy.html`.
- Internal links are coherent: the landing page still links to `privacy.html`, the privacy page still links back to the homepage, and no broken or contradictory route references were introduced.
- Semantic SEO signals remain clean: one `h1` per page, decorative media stays decorative, informative images keep sensible `alt` text, and no page contains contradictory `robots`, canonical, OG, Twitter, or sitemap signals.

## Verification
1. Run `npm run build`.
2. Confirm that `frontend/dist/index.html`, `frontend/dist/privacy.html`, `frontend/dist/robots.txt`, and `frontend/dist/sitemap.xml` are all present.
3. Inspect `frontend/dist/index.html` and verify the exact canonical URL, title/description, homepage social tags, and the JSON-LD block survived the build.
4. Inspect `frontend/dist/privacy.html` and verify `noindex,follow`, the `.html` canonical, the corrected brand name, the minimal OG/Twitter fields, and the absence of `https://spec-avto.pro/privacy` or bare `/privacy` references.
5. Search both source and built output for stale route references and duplicate critical tags; there should be no remaining unconfirmed `/privacy` SEO URL and no duplicate canonical/title/description tags.
6. Open `frontend/dist/robots.txt` and `frontend/dist/sitemap.xml` and confirm they reference `https://spec-avto.pro` correctly and do not contradict the privacy-page `noindex` policy.
7. Confirm that `assets/images/hero-waste-truck.jpg` exists in the built output so the absolute social/schema image URL resolves to a shipped asset.

## Guardrails
- Do not invent facts, addresses, coordinates, ratings, review counts, prices, landfill names, extra services, extra waste classes, extra locations, extra pages, or social-profile handles.
- Do not change the business positioning away from legal waste removal for `Тверь` and `Тверская область`.
- Do not assume extensionless policy routes; use `privacy.html`-based URLs unless the code is explicitly changed to support something else.
- Do not edit `frontend/dist` by hand; make source changes in `frontend/src/` and `frontend/rspack.config.js` so the build remains the source of truth.
- Do not add CMS plugins, SSR migrations, React head libraries, analytics integrations, or backend SEO middleware.
- Do not block `privacy.html` in `robots.txt` while also using `noindex`; let crawlers reach the page and read the meta directive.
- Do not add bloated SEO copy, keyword stuffing, doorway-style text blocks, or new landing pages in this task.
- Do not add speculative structured data such as `AggregateRating`, `Review`, `FAQPage`, fake `sameAs` links, or any schema field that cannot be verified from the repo.
- Do not rewrite the substantive legal body of the privacy policy beyond the explicit brand and route correction required for SEO consistency.
