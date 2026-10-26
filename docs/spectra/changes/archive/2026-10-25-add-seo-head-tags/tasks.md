## 1. Head tags

- [x] 1.1 Give the page a canonical link, one shared description and a JSON-LD WebApplication.
  - **Constants.** nuxt.config.ts defines `SITE_URL` (`https://fripig.github.io/BikeSupplyMap/`) and `DESCRIPTION`, which names riverside cycling routes, shops and vending machines near YouBike stations, rain shelters, toilets, showers, recommended loop routes, and 臺北市 and 新北市.
  - **Where they are used.** `meta name="description"`, `og:description` and the JSON-LD `description` all use `DESCRIPTION`. `og:url`, `<link rel="canonical">` and the JSON-LD `url` all use `SITE_URL`.
  - **JSON-LD contents.** The fields are those listed in proposal.md.
  - **Verify.** Run `npm run generate`. Then grep .output/public/index.html for `rel="canonical"` and `application/ld+json`, which must each appear once, and for the new description text, which must appear 3 times (meta description, `og:description` and JSON-LD).

## 2. Test

- [x] 2.1 Add an e2e test in e2e/map.spec.ts that loads the page on the dev server and checks the head. [after: 1.1]
  - **Canonical.** The `link[rel=canonical]` href equals `https://fripig.github.io/BikeSupplyMap/`.
  - **Description.** `meta[name=description]` content equals `meta[property="og:description"]` content.
  - **JSON-LD.** The `script[type="application/ld+json"]` text parses to an object with `@type` `WebApplication`, the same `url` and `description`, and every other field listed in proposal.md.
  - **Verify.** `npm run test:e2e` passes on desktop and phone, and `npm test` still passes.
