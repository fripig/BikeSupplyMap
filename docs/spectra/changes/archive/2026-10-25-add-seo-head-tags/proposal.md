## Why

The home page has Open Graph tags but little for search engines. Checked on the live site on 2026-10-25: there is no canonical link and no structured data. The meta description still says only 「點選 YouBike 站點，查看附近的便利商店、超市、量販店與雜貨店。」, which leaves out the riverside routes, vending machines, rain shelters, toilets, showers and loop routes that the page now shows.

## What Changes

- **Shared description.** One description constant in nuxt.config.ts is used for `meta name="description"`, `og:description` and the JSON-LD `description`. It names the riverside cycling routes, the shops and vending machines near YouBike stations, rain shelters, toilets, showers and recommended loop routes, and that it covers 臺北市 and 新北市.
- **Canonical link.** `app.head.link` gains `<link rel="canonical" href="https://fripig.github.io/BikeSupplyMap/">`. That is the same URL as `og:url`, and both come from one constant.
- **JSON-LD.** `app.head.script` gains one `<script type="application/ld+json">` holding a schema.org `WebApplication`. It has `name`, `url`, `description`, `inLanguage` `zh-Hant-TW`, `applicationCategory` `TravelApplication`, `operatingSystem` `Any`, `isAccessibleForFree` `true` and `areaServed` 臺北市 and 新北市.
- **e2e test.** One test in e2e/map.spec.ts checks the head on the dev server. It checks that the canonical href equals the site URL, that the meta description equals `og:description`, and that the JSON-LD script parses to a `WebApplication` with that URL and description.

## Non-Goals

- **robots.txt and sitemap.xml.** GitHub Pages serves a project site under /BikeSupplyMap/, so crawlers only read `https://fripig.github.io/robots.txt`, which belongs to the fripig.github.io repository. A sitemap for a one-page site adds nothing a canonical link does not.
- **Google Search Console verification.** That needs the owner's account, and the token is not known here.
- **Rich-result fields.** `offers` and `aggregateRating` are left out. The site has no price or ratings, and inventing them would misdescribe it.
- **Per-station pages.** Separate indexable pages are a separate idea, not part of this change.

## Impact

- Affected specs: none
- Affected code:
  - New: (none)
  - Modified: nuxt.config.ts, e2e/map.spec.ts
  - Removed: (none)
- Compatibility: no capability-level observable behavior changes; only head tags differ. Link previews show the new shared description.
