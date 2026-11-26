# Wix worker bundle diet (workstream A9)

Hard rule: the Wix Headless worker (`npm run wix:build`, checked by `scripts/prepare-wix-worker.mjs`) stays under
**14 MiB**. Wix refused a 16.0 MiB worker with HTTP 413 and accepted 12.5 MiB; the budget is the safety margin and is
never raised or overridden (`WIX_WORKER_BUDGET_BYTES`) to ship.

| Step | Worker (UTF-8) | Change |
| --- | --- | --- |
| Integration branch before this workstream (`bf59afa`) | 14,744,270 B = **14.06 MiB** (over budget) | |
| 1. Root layout stops importing the translation tables | 14,429,251 B = 13.76 MiB | -315,019 B |
| 2. Non-Hebrew legal text is client-only | 14,340,278 B = **13.68 MiB** | -88,973 B |
| Total | | **-403,992 B (-0.385 MiB)**, 0.32 MiB under the budget |

(`main` was 13.77 MiB. The cookie-consent module that merges later measured close to zero in the server graph.)

## 1. What was measured

Method: Turbopack writes a source map next to every server chunk. `.open-next/server-functions/default/handler.mjs.meta.json`
(esbuild metafile) lists the chunks that end up in the worker; summing each source map's mapped segments per source file
gives bytes per module (UTF-8, minified, so a little under the source size). A chunk file is exact. Modules that Turbopack
bundles once per layer appear in several chunks ("copies" below). The script is in the appendix.

Ranked contributors from this branch's modules (before any change; bytes in the worker input):

| Rank | Module | Bytes | Copies | Server-needed? |
| --- | --- | --- | --- | --- |
| 1 | `lib/legal/content/*` non-Hebrew (rules-core.en 11.6 K, privacy ru/ar/fr/es/en 10.5/8.4/7.4/7.0/6.2 K, rules-extra ru/ar/fr/es/en 9.5/7.8/6.6/6.3/5.7 K) | **87 K** (chunk files, exact) | 1 | no |
| 2 | `lib/refund/copy/{en,fr,es,ar,ru}.ts` | about 57 K (en 10.2, fr 14.0, es 11.0, ar 9.3, ru about 12) | 1 | no |
| 3 | `lib/legal/page-copy.ts` (six languages, rules and privacy page chrome) | 25 K (12.6 K per chunk) | 2 | Hebrew only |
| 4 | `lib/discounts/birthday/copy.ts` | 25 K (8.3 to 8.6 K per chunk) | 3 | Hebrew only |
| 5 | `lib/offers/copy/{en,fr,es,ar,ru}.ts` | about 28 K (ru 7.4, ar 6.1, fr 5.0, es 4.7, en 4.3) | 1 | no |
| 6 | `lib/legal/consent-copy.ts` | 13 K | 1 | Hebrew only |
| 7 | `lib/legal/content/{rules-core,rules-extra,privacy}.he.ts` | 27 K | 1 | yes (Hebrew SSR) |
| 8 | refund logic (`refund-types`, `refund-fields`, notify, guard, ...), booking client modules, birthday engine | about 140 K | 1 to 6 | yes (logic, not copy) |

Total non-Hebrew copy of this branch in the worker: about 0.2 MiB. That is less than the 0.29 MiB the branch added, and it
was not the largest item. The largest single item was **not** this branch's copy:

| Rank | Module | Bytes | Copies | Cause |
| --- | --- | --- | --- | --- |
| A | `lib/i18n/translations.ts` | **305 K in the React Server Components layer + 337 K in the SSR layer** | 2 | `lib/seo/structured-data.ts` (rendered by the root layout) imported `LANGUAGES` from `translations.ts`; Turbopack kept the whole 380 KB table for that import in the RSC layer, on top of the SSR copy that the language provider needs |
| B | `lib/data/blog-posts.json` | 2 x 489 K | 2 | page chunk group (blog, post) and route chunk group (sitemap, llms.txt, `/api/blog`) |
| C | zod, `lib_*` and other byte-identical chunk files | **0.62 MiB** in 8 groups (zod 4 x 110 K, one 229 K chunk twice, ...) | 2 to 4 | Turbopack emits the same chunk once per route group under different names; esbuild then bundles each file |
| D | `lib/data/experience-routes.ts` | 117 K (page group) + 85 K (route group, via `lib/sendgrid.ts` and `lib/booking/checkout-service.ts`) | 2 | six-language route copy imported by the e-mail and checkout server code as well |

## 2. Changes

### 2.1 The root layout no longer pulls `translations.ts` (-315,019 B)

`lib/seo/structured-data.ts` needed the six language codes for the schema.org `inLanguage` tags and imported `LANGUAGES`
from `lib/i18n/translations.ts`. Every page renders that graph through the root layout, so the 380 KB translation tables
were bundled a second time, in the RSC layer. The codes now come from `LANGUAGE_CODES` in `lib/i18n/language-preference.ts`
(same order as `LANGUAGES`, pinned by `tests/unit/worker-bundle-rules.test.ts`). The JSON-LD output is unchanged
(`tests/unit/seo-integrity.test.ts`). A guard test fails when `app/layout.tsx`, `lib/seo/*` or `components/seo/*` import a
value from `translations.ts`.

### 2.2 Non-Hebrew legal text is client-only (-88,973 B)

The server renders the Hebrew default and nothing else (`app/layout.tsx` passes `DEFAULT_LANGUAGE`; a returning visitor's
language is restored in the browser, and only a saved non-Hebrew language has the hand-over hidden by `data-language-pending`; first-time, Hebrew and routed-locale visitors see the server HTML at once, `lib/i18n/language-bootstrap.ts`). So the rules and privacy text in
en, ru, fr, ar and es is never needed in the worker.

- `lib/legal/loaders.ts` now holds the Hebrew loaders only (`loadRulesCoreHe`, `loadRulesExtraHe`, `loadPrivacyHe`,
  `loadMediaReleaseSectionHe`), plus the shared `memoLoad`, `rulesCoreLanguageFor` and `mediaReleaseSectionOf`.
- `lib/legal/loaders-intl.ts` (new) holds the other five languages (`loadRulesCoreIntl`, `loadRulesExtraIntl`,
  `loadPrivacyIntl`, `loadMediaReleaseSectionIntl`). Only client-only modules import it.
- `RulesBody` / `PrivacyBody` render the Hebrew body as before (`use()` inside the page's `<Suspense>`, server-rendered
  with the full text, anchors and table of contents) and, for any other language, `RulesBodyIntl` / `PrivacyBodyIntl`
  loaded with `dynamic(() => import(...), { ssr: false, loading })`. The `loading` placeholder is the same
  `LegalLoadingFallback` (`min-h-64`, localized label from the page copy), so the height does not jump.
  `LegalHashScroll` still mounts together with the text, so `/rules#media-release` scrolls after the lazy body arrives.
- `MediaReleaseDisclosure` (checkout) loads clause 14 through `loadMediaReleaseSectionHe()` for Hebrew and, for the other
  languages, mounts `MediaReleaseLoaderIntl` (`ssr: false`), a component that renders nothing and reports the same
  loading, ready and error states to the disclosure. The disclosure's state machine, markup and retry behaviour are unchanged.
- `lib/legal/index.ts` exports the Hebrew loaders; the intl loaders are deliberately not exported from the index.

Server output check: `.next/server/chunks/ssr` now holds `lib_legal_content_{privacy,rules-core,rules-extra}_he_ts_*` and no
other language; the five languages exist only as client chunks.

## 3. The rule for new modules

**The server renders Hebrew only, so non-Hebrew copy is client-only: `ssr: false`.**

1. A module that holds text in en, ru, fr, ar or es and is not needed for the server-rendered Hebrew page ends its file
   name in `Intl` (`RulesBodyIntl.tsx`), `-intl` or `.intl` (`loaders-intl.ts`).
2. Such a module is imported only (a) through `dynamic(() => import('./XIntl'), { ssr: false })` in a Client Component, or
   (b) by another `*Intl` module. A plain `import()` or `import` in a Client Component is not enough: the SSR layer bundles
   it and the chunk lands in the worker. `ssr: false` is only allowed inside Client Components (Next 16, lazy-loading guide).
3. Keep the Hebrew path synchronous and identical to what the server renders (no hydration mismatch), keep a placeholder
   with a stable height for the other languages, and keep scroll and focus behaviour working once the lazy part arrives.
4. Do not import a value from `lib/i18n/translations.ts` in a Server Component, `lib/seo/*` or `components/seo/*` (it is
   380 KB and is bundled once per layer); take codes from `lib/i18n/language-preference.ts`.
5. `tests/unit/worker-bundle-rules.test.ts` enforces 2 and 4 by reading the import graph.

Not applicable (and not done): stateful pages whose copy is read synchronously in the first render of the visitor's
language (refund form, offers, booking checkout, the page chrome in `page-copy.ts`). Moving their copy behind `ssr: false`
means either remounting the page on a language switch (the typed form state would be lost) or showing the Hebrew copy for
a moment in the wrong direction. See 5.

## 4. What was verified

Commands and results (all on this branch, 2026-11-11, machine under heavy shared load):

| Check | Result |
| --- | --- |
| `npm run wix:build` (three runs: baseline artifacts, after step 1, after step 2) | `Wix worker: 13.68 MiB as UTF-8 ... budget 14.00 MiB` (14,340,278 B); no override variable used |
| `npm run typecheck`, `npm run lint` (typecheck + type hygiene) | pass |
| `npx vitest run` (all four projects) | 113 files, 2,479 tests pass (incl. kantorovich, seo-integrity, legal-render/content/consent/versions, module-size, the new `worker-bundle-rules` and `legal-loaders`) |
| `npm run test:build` (one isolated `.next-test` build) then Playwright, chromium + usability + a11y projects: `refund-form`, `offers`, `booking-consent-birthday`, `language-theme`, `legal-pages`, `hydration`, `i18n`, `page-structure`, `layout-stability`, a11y `public-routes`, `secondary-routes`, `refund-states`, `booking-consent-states`, `baseline-integrity` | **404 passed**, 0 failed; the a11y baseline is still empty |
| Hebrew server HTML before and after (a build of `bf59afa` against this branch, scripts, build hashes and nonces stripped) | **identical** for `/rules`, `/privacy-policy`, `/refund`, `/offers`, `/book`, `/contact` |
| Hebrew server HTML carries the full text | `/rules`: 114 of 114 clause strings, 16 of 16 section ids; `/privacy-policy`: 38 of 38 strings, 10 of 10 ids |
| `/rules`, `/privacy-policy`, `/refund`, `/offers` in ru, fr, ar and es in a real browser (saved language) | 16 loads: full text appears, no console warning or error (no hydration message), no Hebrew letters outside Hebrew, no Arabic outside Arabic |
| Deep links `/rules#media-release`, `/rules#consent`, `/privacy-policy#cookies` in ru, fr, ar, es | the target ends in the viewport (one sample of `/privacy-policy#cookies` in Arabic was still smooth-scrolling when read under load; 12 of 12 repeat runs on both builds settle at the same position) |
| Switching language inside the page (ru, ar, he, es, fr, en, he) on `/rules` and `/privacy-policy` | text, `dir` and script follow each switch; 0 console messages |
| Checkout "read the full text" (clause 14) in all six languages (temporary spec, not committed) | loads in each language; Hebrew letters only in `he`; no hydration message |

Not run: firefox, webkit and the mobile projects, `npm run test:all`, Lighthouse, a real Wix deploy.

## 5. Next levers (measured, not done)

1. **`lib/i18n/translations.ts` in the SSR layer: 337 K (about 280 K is non-Hebrew).** The language provider needs `t` for the
   visitor's language synchronously after the saved language resolves. Moving en/ru/fr/ar/es to a client-only table would be the
   largest remaining cut (about 0.27 MiB), but the file is a merge-conflict hotspot and the provider must then keep
   `data-language-pending` until the table has arrived. Owner decision needed.
2. **`lib/data/blog-posts.json` is bundled twice (2 x 489 K = 0.93 MiB)**: once for the pages (`blog`, `post/[slug]`) and once for the
   route handlers (`sitemap`, `llms.txt`, `/api/blog` through `lib/wix/blog.ts`). 469 K of each copy is article bodies, which the
   sitemap and `llms.txt` do not need. A bodies-free index for those three importers would remove one copy (about 0.45 MiB).
3. **Byte-identical chunks (0.62 MiB in 8 groups)**: at this workstream's measurement (`bf59afa`) the same zod chunk four
   times (4 x 110 K), a 229 K chunk twice, and smaller ones. They are emitted by Turbopack under different names for different
   route groups and bundled by esbuild as is. The zod count moves with the route graph: section 7 counts five copies on `main`
   `1285490` and on the security branch's head, and four after its fix (section 7 reads each chunk's `bytesInOutput`, section 1
   sums source-map segments per module, so compare the counts, not the sizes). A general fix would live in the OpenNext or
   Turbopack layer (or a post-pass on `handler.mjs`), not tried. One such duplicate, however, **was** removed from application
   source: section 7 merged the birthday routes' second chunk, and the zod copy that came with it, by moving one import. The other
   groups have not been tried that way.
4. **`lib/data/experience-routes.ts` in the route group (85 K)**: `lib/sendgrid.ts` and `lib/booking/checkout-service.ts` import
   `findOnRequestWorldRoute`, which drags the six-language route copy into every route handler. A server registry of ids,
   minutes and titles would cut most of it.
5. **Refund (about 57 K non-Hebrew), offers (about 28 K), `page-copy.ts` (about 21 K), `consent-copy.ts` (about 11 K),
   birthday copy (about 21 K over three chunks).** All are per-language copy that is read synchronously in the first render of
   the visitor's language, inside components that hold state (the refund form, the birthday calculator, the checkout). The
   `ssr: false` recipe from section 3 applies, but a Hebrew component that is swapped for a dynamic one on a language switch
   unmounts and loses the typed values, and keeping it mounted with the Hebrew copy shows the wrong language for the length of one
   chunk fetch. A safe version needs a loader child that renders nothing (as `MediaReleaseLoaderIntl` does) plus a hidden-while-pending root on
   every state of the component. Worth about 0.14 MiB together; not done to keep this change free of behaviour changes.

## 6. Lines to add to GENESIS.md and AGENTS.md

Not edited here (owner-owned files). `npm run docs:verify` currently reports these four names as missing and the fingerprint
as stale; adding them and stamping after review clears both.

**GENESIS.md**, in the "Legal content" bullet of "Booking, legal, refund and offers modules", add `lib/legal/loaders-intl.ts` to the
library list, `RulesBodyIntl` and `PrivacyBodyIntl` to the legal components, `MediaReleaseLoaderIntl` to the booking components,
and this sentence at its end:

> `lib/legal/loaders.ts` reaches only the Hebrew bodies (the server renders Hebrew only); the other five languages are in
> `lib/legal/loaders-intl.ts`, reached solely through `next/dynamic(..., { ssr: false })` by `RulesBodyIntl`, `PrivacyBodyIntl` and
> `MediaReleaseLoaderIntl`, so they are not in the Wix worker (`docs/modules/wix-bundle-diet.md`).

and in the quality-gates or bundle paragraph:

> Wix worker budget: `npm run wix:build` must report at most 14 MiB (`scripts/prepare-wix-worker.mjs`; never raise or override it).
> `tests/unit/worker-bundle-rules.test.ts` keeps `lib/i18n/translations.ts` out of the root layout graph and `*Intl` modules out of
> the server graph.

**AGENTS.md**, section 9 (Modularity), append:

> **Bundle budget.** The Wix worker stays under 14 MiB (`scripts/prepare-wix-worker.mjs`; never raise it or set
> `WIX_WORKER_BUDGET_BYTES` to ship). The server renders Hebrew only (`app/layout.tsx`; a saved language is restored in the browser), so
> per-language copy for en, ru, fr, ar and es that the Hebrew page does not need is client-only: put it in a module whose file name ends in
> `Intl`, `-intl` or `.intl` and import it only through `dynamic(() => import(...), { ssr: false })` in a Client Component (a plain
> `import()` still lands in the worker). Never import a value from `lib/i18n/translations.ts` in a Server Component, `lib/seo/*` or
> `components/seo/*` (take codes from `lib/i18n/language-preference.ts`). `tests/unit/worker-bundle-rules.test.ts` enforces both;
> measure with `npm run wix:build` and report the MiB figure when a module adds more than about 20 KB of copy.

**docs/MODULARITY.md** rule 6 ("Bundle") is updated in this branch to say the same.

## 7. Branch `fix/security-hardening-20261115` (2026-11-15)

The security branch pushed the worker over the budget. UTF-8 `worker.js` after `npm run wix:build`:

| Build | Worker | Against the 14,680,064 B budget |
| --- | --- | --- |
| Branch base `c145c11` | 14,659,402 B | 20,662 B under |
| `main` `1285490` | 14,659,552 B | 20,512 B under |
| Branch at `2dc4e44` | 14,707,703 B | 27,639 B over |
| Branch head `01e7ca5` | 14,716,912 to 14,717,062 B (two builds) | 36,848 to 36,998 B over (+57,360 to +57,510 B on `main`) |
| After the fix below | **14,524,736 B = 13.85 MiB** (two builds, with and without the route comment) | **155,328 B under; 134,816 B below `main`** |

Rebuilding the same commit varies by about 150 B. In the server handler (`handler.mjs`, esbuild input bytes) the head
was 40,262 B above `main`; the worker grows by about 1.4 times the handler delta because wrangler re-prints the minified
code.

**What the branch added** (per module: bytes in the worker input and number of chunks holding a copy, `main` -> head,
from the source maps):

| Module | `main` | Head | Note |
| --- | --- | --- | --- |
| `lib/wix/birthday-pricing-server.ts`, `-pricing-claim`, `-pricing-config`, `-claim-identity`, `-claim-request` | 8,952 B, 1 chunk | 2 x 9,215 B | one chunk emitted twice, see below |
| `lib/security/same-origin.ts` | - | 4,235 B / 5 | new; copied into per-route leftover chunks |
| `lib/http/read-json-body.ts` | - | 4,181 B / 4 | new; same |
| `lib/auth/member-ownership.ts` | 183 B / 1 | 1,641 B / 9 | the birthday modules import `normalizeMemberEmail`, so it left the `lib/db/store` chunk and split the leftover chunks of the store routes (one more copy of `gift-card-designs` + `utils`, 3,930 B) |
| `lib/security/client-address.ts`, `honeypot.ts`, `components/ui/HoneypotField.tsx` | - | 1,457 / 2, 622 / 5, 946 / 2 | new |
| checkout hold and throttle (`checkout-hold-policy`, `checkout-throttle`, `checkout-hold-store`, `checkout-service`, `stripe`) | | +3,996 B in one chunk | new code, one copy |
| `birthday-claim-throttle` + `-fallback-limiter`, `booking-grid-policy`, `cart-v2-shared` | | +1,928, +959, 1,203 / 3 B | new code |
| scheduler view-model refactor (`PackageInclusionsDialog`, `use-scheduler-view-model`, both booking interfaces) | | -2,176 B | the `/book` SSR chunk got smaller |

**Cause of the largest item.** `/api/wix/birthday/claim`, `/api/wix/birthday-pricing/v1/calculate-price` and
`/api/offers/capabilities` load the same `lib/wix/birthday-*` modules. Turbopack emitted them twice, as
`lib_wix_20m83yf1k3uaa._.js` (pricing provider, capabilities) and `lib_wix_0jn2p008diyfi._.js` (claim), byte-identical
except for the source-map comment, and gave the claim route its own zod copy as well. The claim route had started
importing `birthday-claim-request` (a module `birthday-pricing-server` imports) before `birthday-pricing-server`; the other
two routes reach the group through `birthday-pricing-server` first. In these builds (Next.js 16.4.5 with Turbopack), a
chunk's name followed the way a route reaches its modules, so a different traversal gave identical content a second name,
and esbuild bundles every name. That is **observed Turbopack behaviour, inferred from these builds, not a documented
contract**: re-measure this chunk and the zod copy count after every Next.js or Turbopack upgrade, because the import-order
fix below and the guard test that keeps it rely on it.

**Change (one import moved, -192,176 B).** The claim route imports `birthday-pricing-server` before its other birthday
modules. The three routes now load one birthday chunk (`lib_wix_birthday-pricing-server_ts_0e-i6xz4w0r-r._.js`, 12,716 B in
the worker, was 2 x 12,926 B) and the zod copy the pricing provider and capabilities already shared with `/api/blog`, so
the zod copies in the worker go from 5 (on `main` and on the head) to 4 (one copy is 178,747 B plus 334 B of chunk-switch
cases). Handler: -128,713 B against the head. The security checks are untouched; only the module evaluation order of that
route changed, and no module in its graph does more at load time than build zod schemas, seed data, `Map`s and its limiter.
A probe of the built routes (`.next/standalone`, throwaway provider key: wrong content type, bad JSON, oversized body,
missing email, no birthday, a claim, an unsigned and a signed pricing call with and without the claim, another contact, an
off-grid start, the per-email limit) gave the same 18 answers before and after; only the 429's `Retry-After` differs,
which counts down the clock window. `tests/unit/worker-bundle-rules.test.ts` now fails when a route that imports
`birthday-pricing-server` reaches a `lib/wix/birthday-*` module through an earlier import.

**Left as measured.** Against `main` the branch still adds about 30.6 KB of handler input: new code that exists once,
plus copies of the small shared helpers above (`same-origin`, `read-json-body`, `honeypot`, `client-address`, and
`member-ownership` with the extra `gift-card-designs` + `utils` copy, about 13 KB together, so at most about 18 KB of
worker). Removing those copies means moving security helpers between modules, and a helper that several routes use
keeps some copies anyway; not done. The remaining zod copies are separate
groups (`/api/wix/bookings/checkout`, `/api/subscriptions/checkout`, the eleven routes that use `lib/validation.ts`) and
may respond to the same treatment; not tried.

Method note: per-file source-map sums misattribute bytes inside scope-hoisted chunks (a data table's bytes can land on a
neighbouring module), so compare builds chunk by chunk too: each chunk's exact size is its `bytesInOutput` in
`handler.mjs.meta.json`, its modules are the `sources` of its map, and the entries that load it are the
`server/chunks/...` strings in each `route.js` and `page.js`.

## Appendix: attribution script

Run after `npm run wix:build` (it needs `.next/server/**/*.map` and `.open-next/.../handler.mjs.meta.json`): `node attrib.mjs <worktree> [topN]`.

<details><summary>attrib.mjs</summary>

```js
// Attribute bytes in the server chunks that go into the Wix worker to source files, via Turbopack source maps.
// usage: node attrib.mjs <worktree> [topN]
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2];
const topN = Number(process.argv[3] || 80);
const serverDir = path.join(root, '.next/server');
const metaPath = path.join(root, '.open-next/server-functions/default/handler.mjs.meta.json');
const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
const inputs = Object.keys(Object.values(meta.outputs)[0].inputs);
const included = new Set(
  inputs
    .filter((p) => p.includes('/.next/server/'))
    .map((p) => p.split('/.next/server/')[1])
);

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64MAP = Object.fromEntries([...B64].map((c, i) => [c, i]));
function decodeLine(line) {
  const segs = [];
  let gen = 0, src = 0, sl = 0, sc = 0, nm = 0;
  for (const seg of line.split(',')) {
    if (!seg) continue;
    const vals = [];
    let shift = 0, value = 0;
    for (const ch of seg) {
      const d = B64MAP[ch];
      const cont = d & 32;
      value += (d & 31) << shift;
      if (cont) shift += 5;
      else {
        vals.push(value & 1 ? -(value >> 1) : value >> 1);
        value = 0;
        shift = 0;
      }
    }
    gen += vals[0];
    if (vals.length > 1) {
      src += vals[1];
      sl += vals[2];
      sc += vals[3];
      if (vals.length > 4) nm += vals[4];
      segs.push([gen, src]);
    } else segs.push([gen, -1]);
  }
  return segs;
}

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

const bySource = new Map(); // normalised source -> {bytes, chunks:Set, copies}
let totalMapped = 0, totalUnmapped = 0, totalFiles = 0;
const perChunk = [];
for (const file of walk(serverDir)) {
  const rel = path.relative(serverDir, file);
  if (!included.has(rel)) continue;
  const mapFile = file + '.map';
  const text = fs.readFileSync(file, 'utf8');
  const fileBytes = Buffer.byteLength(text);
  totalFiles += fileBytes;
  if (!fs.existsSync(mapFile)) {
    totalUnmapped += fileBytes;
    perChunk.push([rel, fileBytes, 'NOMAP']);
    continue;
  }
  const rawMap = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
  const lines = text.split('\n');
  // Normalise to a list of line -> [[genCol, srcName]] (handles index maps with sections).
  const lineSegs = lines.map(() => []);
  const sections = rawMap.sections
    ? rawMap.sections.map((s) => ({ off: s.offset, map: s.map }))
    : [{ off: { line: 0, column: 0 }, map: rawMap }];
  for (const sec of sections) {
    const mls = (sec.map.mappings || '').split(';');
    for (let li = 0; li < mls.length; li++) {
      if (!mls[li]) continue;
      const segs = decodeLine(mls[li]);
      const tl = li + sec.off.line;
      if (!lineSegs[tl]) continue;
      for (const [col, si] of segs) {
        const name = si < 0 ? null : decodeURIComponent(sec.map.sources[si] || 'unknown').replace(/^(\.\.\/)+/, '');
        lineSegs[tl].push([col + (li === 0 ? sec.off.column : 0), name]);
      }
    }
  }
  let mapped = 0;
  for (let li = 0; li < lines.length; li++) {
    const segs = lineSegs[li];
    const lineText = lines[li];
    for (let i = 0; i < segs.length; i++) {
      const start = segs[i][0];
      const end = i + 1 < segs.length ? segs[i + 1][0] : lineText.length;
      const bytes = Buffer.byteLength(lineText.slice(start, end));
      const name = segs[i][1];
      if (!name) continue;
      const e = bySource.get(name) || { bytes: 0, chunks: new Map() };
      e.bytes += bytes;
      e.chunks.set(rel, (e.chunks.get(rel) || 0) + bytes);
      bySource.set(name, e);
      mapped += bytes;
    }
  }
  totalMapped += mapped;
  perChunk.push([rel, fileBytes, mapped]);
}
console.log('chunk files in bundle (utf8 bytes):', totalFiles, 'mapped:', totalMapped, 'nomap files:', totalUnmapped);
const rows = [...bySource.entries()].sort((a, b) => b[1].bytes - a[1].bytes);
for (const [name, e] of rows.slice(0, topN)) {
  console.log(String(e.bytes).padStart(8), String(e.chunks.size).padStart(2) + 'x', name);
}
fs.writeFileSync(
  path.join(path.dirname(process.argv[1]), 'attrib.json'),
  JSON.stringify(rows.map(([n, e]) => ({ name: n, bytes: e.bytes, chunks: [...e.chunks.entries()] })), null, 1)
);
```

</details>
