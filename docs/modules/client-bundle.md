# Client bundle: what every page ships, and the plan to shrink it

`docs/modules/wix-bundle-diet.md` covers the Worker (server) bundle. This note covers the JavaScript the browser downloads.

## How it is measured

Build with `npm run build`, serve with `npm run start:local`, save a page's HTML, and add up the files its `/_next/static/chunks/*.js` script tags name, gzipped. The numbers below are from a local production build of `main` at `595e33f` on 2026-11-26, with no Supabase or Wix variables set. They are not field data.

| Page | Scripts | Gzipped |
| :--- | :--- | :--- |
| `/` | 16 | 498 KiB |
| `/book` | 20 | 636 KiB |
| `/subscriptions` | 17 | 537 KiB |

Three chunks are on every page and are larger than what the page needs:

| Chunk | Gzipped | Why it is on every page |
| :--- | :--- | :--- |
| `lib/i18n/translations.ts`, all seven languages | 142 KiB | `LanguageProvider` imports the whole table, and a visitor reads one language. |
| Wix SDK (`@wix/sdk`, `redirects`, `members`, `pricing-plans`) | 61 KiB | The root auth provider imports `lib/wix/member-client.ts`. |
| Supabase SDK | 56 KiB | The root auth provider imported `lib/supabaseClient.ts`. |

## Step 1, done: the Supabase SDK loads on first use

`loadSupabase()` in `lib/supabaseClient.ts` is a dynamic import made on the first call, and never when Supabase is not configured. No browser-reachable module imports `@supabase/supabase-js` as a value (`tests/unit/supabase-client-lazy.test.ts`).

| Page | Before | After |
| :--- | :--- | :--- |
| `/` | 498 KiB | 442 KiB |
| `/book` | 636 KiB | 580 KiB |
| `/subscriptions` | 537 KiB | 481 KiB |

Where Supabase is the configured identity provider, the SDK still downloads on every page, after hydration, because the auth provider asks it for the session. Skipping that for guests would mean reading browser storage for a session first and attaching the auth listener at sign-in; it is left until such a deployment exists.

The Supabase path of `lib/auth/auth-context.tsx` has no automated test: the repository has no DOM test environment, and the browser suites sign in through the demo and Wix paths. The change was checked by typecheck, build and reading.

## Step 2, not started: one language per visitor (about 120 KiB)

The server renders Hebrew unless the URL carries a routed locale (`/en/...`). The goal is that the browser holds Hebrew plus the visitor's language, not all seven.

What has to change:

1. `lib/i18n/translations.ts` (5,432 lines) becomes one module per language. The tables are plain data with no functions, so a language can be loaded with `import()` or passed as a prop.
2. `LanguageProvider` keeps Hebrew as a static import and loads another language before switching to it. A saved non-Hebrew language already hides the page until the provider has resolved (`data-language-pending`), so the load fits inside that hand-over; it makes that hand-over one chunk longer.
3. `getLocalizedPackages(lang)` and `getLocalizedAddons(lang)` are synchronous and called from twelve components. They would read the loaded dictionary from the provider instead of the full table.
4. A routed locale is the hard case: the server renders English and the browser must hydrate with English at once. Two ways to hand it the dictionary:
   - **Server prop.** The root layout loads the one dictionary and passes it to the provider. This is simple, but it puts the language tables back in the Server Components layer of the Worker, which `tests/unit/worker-bundle-rules.test.ts` forbids today (step 1 of the Worker diet removed 315 KB that way). The Worker is at 10.23 MiB of 14, so the room exists; the rule would have to be relaxed on purpose.
   - **Inline JSON.** The provider prints the dictionary into the HTML as a non-executed JSON script on routed pages and reads it back during hydration. No Worker growth and no rule change, but it is hand-written hydration plumbing.

Risks: hydration mismatches in any of seven languages, the "no streamed segments" guarantee on the legal pages if a Suspense boundary is used (so neither option above uses one), and visual baselines. It needs `npm run test:all` and a clean-room `npm run wix:build`.

**Owner decision needed:** server prop (relax the Worker rule) or inline JSON.

## Step 3, not started: the Wix SDK only when it is needed (61 KiB)

A guest needs no Wix client until checkout. Member tokens live under the site's own `sessionStorage` key (`simdream_wix_member_tokens`), so the auth provider can tell a guest from a member without the SDK.

What has to change: split `lib/wix/member-client.ts` into a light session module (storage keys, events, "is a member session stored") and the SDK client behind `import()`, then convert the ten files that import it. The ones read so far (checkout cart, subscription checkout, voucher check, auth provider) call it from asynchronous code; the rest were not checked.

Risk: it touches member sign-in, the OAuth callback and Wix checkout, which the browser suites mock. It should be followed by a recorded sign-in and a checkout start on staging.

## Step 4, not started: the second booking interface on `/book`

`/book` ships both the guided wizard and the Express Shop (`AmazonFlightStorefront`, `KantorovichCalendarScheduler`); a visitor sees one at a time. Loading the other on demand would cut `/book` further (not measured). The browser suites switch between the two, so they would need to wait for the load: the first-paint work showed how such timing changes surface as flaky tests in CI.
