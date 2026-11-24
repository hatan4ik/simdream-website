# Blog languages, routes and Wix blog queries

How a blog article reaches the visitor in the right language, which PRs built each part, how it fails, and what guards it. Read this before touching `lib/wix/blog.ts`, `components/blog/`, `lib/blog/`, `app/(public)/post/`, `app/(public)/blog/` or the blog entries of `proxy.ts` and `lib/i18n/locale-routing.ts`.

## Languages and routes

Seven languages: `he` (the master, default), `en`, `ru`, `fr`, `es`, `ar`, `de` (`BLOG_SEO_LANGS` in `lib/data/blog-short-slugs.ts`). 39 articles, each a group of seven posts that share one Wix `translationId`.

| URL | What it is |
| :--- | :--- |
| `/blog`, `/en/blog`, `/ru/blog`, ... | The index. The index list is client-rendered from `GET /api/blog?language=<code>`; the server HTML always carries the Hebrew title. The visible URL locale wins over the saved language (#187, #188). |
| `/post/<shortSlug>` | The Hebrew article. `<shortSlug>` is ASCII, from `SHORT_SLUG_BY_TID` (`lib/data/blog-short-slugs.ts`). |
| `/post/<lang>/<shortSlug>` | The translation. Legacy long slugs answer a 301 to the short URL (#183). |

Code: `lib/wix/blog.ts` (the Wix reads and the local fallback), `lib/wix/blog-schema.ts` (the zod shape of a Wix post and of a query response), `lib/wix/blog-fallback.ts` (the fallback log line and its reasons), `lib/blog/language-sync.ts` (the article language state machine). `lib/data/blog-slug-map.json` maps each `translationId` to the Wix slug of every language plus `localSlug` (the Hebrew article in `lib/data/blog-posts.json`), category, cover and CTA.

## Where each part came from

| PR | Established |
| :--- | :--- |
| #76, #79 | The 39 Hebrew articles, `/post/[slug]`, UTF-8 worker output so Hebrew survives the bundle |
| #84, #85 | Article JSON-LD (BlogPosting, breadcrumbs), `llms.txt` from the registries |
| #91, #93, #95 | The Wix translations (scripts only: `language: 'he'` on masters, 3-step publish) |
| #97 | The slug map, `GET /api/blog?lang=`, `BlogPostLanguageSync`, hreflang |
| #99 | The API parameter is `language`; `lang` stays an alias (`lang` is reserved by Wix) |
| #183 | Short canonical URLs, 301s from legacy slugs, six-language SEO, `x-default`, noindex plus a Hebrew canonical when `hasTranslatedBody` is false |
| #187, #188 | `/en`, `/ru`, ... locale URLs; the path locale beats localStorage; localized blog hero |
| #195 | German |
| #306 | Locale-constrained queries and the mismatched-language guard (also introduced the `$hasSome` regression, fixed in #324) |
| #322 | The language-sync navigation loop (`lib/blog/language-sync.ts`) |
| #324 | `slug $eq` in the post query |

## Wix queries (verified on the live API, 2026-11-24)

Endpoint used by the code: `https://www.wixapis.com/blog/v3/posts/query` (the reference shows `/v3/posts/query`; both answer alike). The body is `{ query: { filter, cursorPaging }, fieldsets }`.

| Query | Result |
| :--- | :--- |
| list: `language $eq` plus `cursorPaging` | accepted |
| post: `slug $eq` plus `language $eq` | accepted, one post in that language for all seven languages |
| `slug $hasSome` | **HTTP 400**, "Field 'blogSeo.slug' is using non allowed operator '$hasSome'" |
| `language $hasSome` | **HTTP 400** |
| `slug $in`, `language $in` | accepted |

The Wix reference lists `$hasSome` for `slug`, but the live API rejects it. Never change an operator from the reference alone: run the exact body first as an anonymous visitor (read-only). The OAuth client id is the public `appId` in `wix.config.json`: `POST https://www.wixapis.com/oauth2/token` with `{ "clientId": "<appId>", "grantType": "anonymous" }`, then `POST` the query with the returned `access_token` in the `Authorization` header. Keep requests few and slow.

## Fallbacks, and why they must be loud

`resolveBlogPost` and `listWixBlogPosts` fall back to the local Hebrew articles when Wix is unreachable, answers with an unexpected shape, or has no post in the language. The fallback labels the post with the requested language and `hasTranslatedBody: false`, which makes the article page noindex with a canonical pointing at the Hebrew page. Every fallback now logs one line with the language and the reason (`console.warn`, no request data). A rejected query once served every translation in Hebrew for hours with no signal.

## Language synchronisation on an article

`components/blog/BlogPostLanguageSync.tsx` is one effect over `lib/blog/language-sync.ts`:

1. The article wins on arrival: if the saved site language differs from the article's, the site language is switched to the article's. No navigation.
2. Only a language the visitor picks afterwards navigates, once, to the translation (`siblingPaths`, then `siblingSlugs`).

The state machine keeps a "correction requested, not landed yet" state. Without it the second effect saw the stale language in the commit that corrected it and bounced between the article and its translation (41 navigations in 3 s, #322).

## Guards

| Guard | File |
| :--- | :--- |
| Query shapes, per-language resolution, `$eq` only, logged fallbacks | `tests/unit/wix-blog.test.ts` |
| Language-sync decisions, simulated render by render | `tests/unit/blog-language-sync.test.ts` |
| The loop, in three browsers | `tests/e2e/blog-language-sync.spec.ts` |
| Path locale extraction, hero localization | `tests/unit/blog-language-routing.test.ts` |
| hreflang, `x-default`, noindex fallback, 301s | `tests/unit/blog-seo.test.ts` |
| Article JSON-LD and breadcrumbs | `tests/unit/blog-structured-data.test.ts`, `tests/e2e/seo-contract.spec.ts` |
| API route | `tests/integration/blog-api.test.ts` |
| A translated article after a Wix publish | the smoke check in `ci.yml`, `wix-release.yml`, `wix-rollback.yml`, kept honest by `tests/unit/wix-smoke-translated-article.test.ts` |

## Known gaps

- No live-API contract test in CI: mocks cannot see a rejected operator. The post-publish smoke check is the safety net.
- No end-to-end test that a translated article renders a translated body.
- `LanguageProvider` preferring the path locale over localStorage has no unit test; the proxy locale header (#187) is covered only by e2e.
- Nothing checks that the sitemap, `llms.txt` or hreflang list only languages whose live body exists.
- The server HTML of the index and of non-article pages always carries the Hebrew title; only the article route resolves the language on the server.
