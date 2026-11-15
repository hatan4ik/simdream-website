# Security Policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability, exposed credential, or customer-data concern. Report it privately to `desk@simdream.co.il` with the subject `SimDream security report`. Include a reproducible description, affected URL or file path, and impact; never include a live customer record or credential in the report.

We acknowledge reports within two business days, triage severity promptly, and coordinate a fix before public disclosure. We welcome good-faith reports and ask researchers not to access customer data, alter bookings, place orders, or degrade availability.

## Credential response

If a credential reaches Git history, a public issue, an action log, or any other public surface:

1. Revoke or rotate it at the issuing provider immediately.
2. Confirm server and GitHub Environment replacement values without printing them.
3. Review secret-scanning alerts and dependent integrations.
4. Remove the value from the current branch and consider history rewriting only after rotation.

## Preventive controls

- `.env*`, certificate/key material, local npm credentials and common service-account files are ignored; `.env.example` remains the safe, value-free template.
- Vitest scans all committable files and the production client bundle for server-only names and credential-shaped values.
- Gitleaks scans full Git history on pull requests and `main` pushes, including the Wix Headless API-key shape.
- GitHub Secret Scanning and Push Protection are enabled for the public repository.
- Dependabot alerts/security updates and CodeQL continuously review dependencies and application code.
- Release credentials exist only as GitHub Environment secrets. They must never be placed in source, dotenv templates, Wix configuration, browser code, or workflow output.

## Client address for rate limiting

The limits that count attempts per client (`/api/contact`, `/api/ground-school/inquiries`, `/api/workshops`, voucher-code checks on `/api/vouchers`, failed admin Basic auth, checkout initialization on `/api/checkout`, `/api/refund-requests` and its lookup) key on the address `rateLimitClientAddress()` (`lib/security/rate-limit.ts`) resolves through `resolveClientAddress()` (`lib/security/client-address.ts`). The address is hashed together with the limit's scope before it is stored, and it is never logged.

**Trust model.** A forwarding header is a claim made by whoever sent the request. It names the client only when the edge in front of the application overwrites it, or appends to it, on every request, and the application cannot tell on its own which headers its edge controls. The deployer therefore names that header, and the server reads exactly one header, never "the first one that happens to be present":

1. `RATE_LIMIT_CLIENT_IP_HEADER`, when it is one of `cf-connecting-ip`, `x-vercel-forwarded-for`, `x-real-ip` or `x-forwarded-for` (letter case and surrounding spaces are ignored; any other value counts as unset).
2. Unset: `x-vercel-forwarded-for` when `VERCEL=1`, otherwise `x-forwarded-for`.

Every other forwarding header on the request is ignored, also when the chosen one is missing.

- `x-forwarded-for` is a list that each proxy appends to, so only its right end can be trusted: the address used is the entry `RATE_LIMIT_TRUSTED_PROXY_HOPS` places from the right (an integer from 1 to 5; default 1, the rightmost entry, which the nearest proxy appended). A list with fewer entries than that did not pass through the trusted proxies and resolves to `unknown-client`. The other three headers carry one address and are read whole, never split.
- A value that is not 3 to 64 hex digits, dots and colons (a host name, a bracketed address, a list in a single-value header) resolves to `unknown-client`. Those requests share one bucket per limit. The checkout throttle (`lib/booking/checkout-throttle.ts`) and the birthday-claim throttle (`lib/wix/birthday-claim-throttle.ts`) give that shared bucket a looser limit, 60 per 10 minutes instead of 10, so one visitor without a usable address does not shut out the others at the first refusal; the bucket can still be exhausted, and then every request without a usable address is refused until its window ends. The contact, Ground School and workshop limits, and every other per-client limit listed above, have no looser bucket: there `unknown-client` gets the same limit as one address.
- Both variables are read on every request, because the OpenNext Worker copies its bindings into `process.env` only when it serves its first request.

**Set `RATE_LIMIT_CLIENT_IP_HEADER` to the header your edge overwrites.** What each vendor documents (read 2026-11-15):

| Edge in front of the application | Setting | Source |
| --- | --- | --- |
| Vercel | nothing: `VERCEL=1` selects `x-vercel-forwarded-for` | [Vercel request headers](https://vercel.com/docs/headers/request-headers): `x-forwarded-for` is "the public IP address of the client"; "we currently overwrite the `X-Forwarded-For` header and do not forward external IPs. This restriction is in place to prevent IP spoofing." `x-vercel-forwarded-for` "is identical to the `x-forwarded-for` header. However, `x-forwarded-for` could be overwritten if you're using a proxy on top of Vercel." [System environment variables](https://vercel.com/docs/environment-variables/system-environment-variables): `VERCEL=1` is available at build and runtime once system environment variables are exposed to deployments. |
| A Cloudflare-proxied origin, or a Worker on a Cloudflare zone | `cf-connecting-ip` | [Cloudflare HTTP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/): "`CF-Connecting-IP` provides the client IP address connecting to Cloudflare to the origin web server"; "When no Worker subrequest is triggered, `cf-connecting-ip` reflects the client's IP address and the `x-real-ip` header is stripped." Cloudflare appends to an existing `X-Forwarded-For` and recommends `CF-Connecting-IP` instead. |
| A reverse proxy or load balancer that appends to `X-Forwarded-For` | `x-forwarded-for`; with N appending proxies, `RATE_LIMIT_TRUSTED_PROXY_HOPS=N` | that proxy's documentation |
| A proxy that sets `X-Real-IP` to the connecting address, replacing any copy the client sent | `x-real-ip` | that proxy's configuration |
| No proxy (`next start` facing the internet) | not supported | Next's server fills in `x-forwarded-for` from the socket only when the request has none (`req.headers['x-forwarded-for'] ??= …` in `next/dist/server/base-server.js`), so a direct caller writes the whole header. Put a proxy in front. |

Getting it wrong has two failure modes. A header the edge does not overwrite, or a hop count that is too high, lets the client choose its own address and rotate past every limit. A hop count that is too low picks an inner proxy's address, so every visitor shares one bucket and legitimate traffic is throttled; a header the edge never sends turns every request into `unknown-client`, with the same effect.

## Edge controls on the Wix-hosted Worker

**What `wrangler.jsonc` configures, and what it does not.** It names the worker (`simdream-wix-hosted-frontend`), its entry point (`.open-next/worker.js`), the compatibility date, the `nodejs_compat` and `global_fetch_strictly_public` flags, and the `ASSETS` binding for the static files in `.open-next/assets`. It declares no `vars`, secrets, KV, R2, D1, Durable Object or service bindings, routes, custom domains, environments, WAF or rate-limit rules; `tests/unit/wrangler-config.test.ts` pins its top-level keys. It serves the OpenNext build, the local `npm run wix:preview`, and the `wrangler deploy --dry-run --outdir .wix-worker` step of `npm run wix:build`, which bundles without uploading; the Wix CLI then releases `.wix-worker` and `.open-next/assets` (`wix.config.json`). Nothing in this repository deploys to a Cloudflare account.

**Owned by Wix hosting, and not provable from this repository:** which routes and hostnames reach the worker, TLS, WAF, bot and DDoS protection, edge rate limiting, request size and time limits, request logging, and which client-address header reaches the worker and whether a copy the visitor sent is overwritten. Wix's [supported-frameworks page](https://dev.wix.com/docs/go-headless/wix-managed-headless/about-supported-frameworks) says only that a non-Astro project's server code must target "the Cloudflare Workers runtime" and runs on "Wix infrastructure" with a global CDN; it documents no request headers. This repository records two ways in which Wix's runner differs from Cloudflare's Workers runtime: it calls the worker without the third `ExecutionContext` argument (`scripts/prepare-wix-worker.mjs`), and it has no `cloudflare:workers` module (`scripts/prepare-opennext-for-wix.mjs`). Cloudflare's guarantee for `cf-connecting-ip` therefore cannot be assumed there, and the repository's build (`open-next.config.ts` and those two scripts) sets no marker the server could read to know it runs in that worker; a marker would not say which header Wix overwrites anyway. So there is no Worker default: with `RATE_LIMIT_CLIENT_IP_HEADER` unset the worker reads the rightmost `x-forwarded-for` entry, as on every host other than Vercel. Set the variable (with `wix env set`, as for `REVIEWS_REFRESH_TOKEN`) once the owner has confirmed the header below. Until then the address the worker resolves may be one the visitor chose (so it can be rotated past any per-address limit), or the same for every visitor (so all of them share one bucket). While the Wix site has no durable limiter store, no limiter on the Worker relies on that address: the durable rate-limited routes answer 503 there, and the birthday claim route's in-process fallback keeps its per-address rule loose and lets its per-email rule carry the bound. That stops being true once Supabase variables are added: every durable per-address rule (the birthday claim's 10 per 10 minutes among them) then keys on that address, so confirm the header first (owner checklist below).

**Every abuse control needed for correctness therefore lives in application code:**

- Durable per-scope attempt counters that answer 503 when their storage is unavailable: `lib/security/rate-limit.ts` (`consumeRateLimit()`, migration `005`), keyed by `lib/security/client-address.ts`.
- Dispatch inquiries, five per hour per client, JSON only, 8 KiB at most: `app/api/contact/route.ts`.
- Ground School enrollment requests, five per hour per client: `app/api/ground-school/inquiries/route.ts`.
- Corporate workshop inquiries, five per hour per client, an 8 KiB body cap on the bytes that arrive, cross-origin refusal and a honeypot field that a script fills and a person never meets (named so that autofill and password managers leave it alone; a filled trap gets the same 201, stores nothing and logs one fixed line without request data): `app/api/workshops/route.ts`, `lib/http/read-json-body.ts`, `lib/security/same-origin.ts`, `lib/security/honeypot.ts`, `components/ui/HoneypotField.tsx`.
- Voucher-code checks, per client and per code: `app/api/vouchers/route.ts`.
- Admin Basic auth, failed attempts per client and per user name, credentials compared in constant time: `lib/auth/admin-guard.ts`, `lib/security/constant-time.ts`.
- Checkout initialization per client, email and departure, and the unpaid-hold rules: `lib/booking/checkout-throttle.ts`, `lib/booking/checkout-hold-policy.ts`.
- Refund requests and lookups, cross-origin refusal and per-client, per-email and per-reference limits: `lib/refund/refund-request-guard.ts`, `app/api/refund-requests/route.ts`, `app/api/refund-requests/lookup/route.ts`.
- The reviews refresh, a Bearer token of 32 or more characters compared in constant time: `app/api/reviews/refresh/route.ts`.
- Payment state, which only a signature-verified Stripe webhook can mark paid: `app/api/webhooks/stripe/route.ts`, `lib/stripe.ts`.
- The Wix Bookings Pricing provider, which prices only a request whose RS256-signed envelope from Wix verifies: `lib/wix/birthday-pricing-provider-auth.ts`.
- Birthday pricing claims, bound to the pilot's email and phone and issued at most 10 per 10 minutes per client and 5 per hour per email, JSON only, 8 KiB at most; with no limiter store the route counts in a bounded in-process map (60 per 10 minutes per client, 5 per hour per email, per Worker instance) instead of answering 503, on purpose, so the discount keeps working on the Wix deployment: `app/api/wix/birthday/claim/route.ts`, `lib/wix/birthday-claim-throttle.ts`, `lib/wix/birthday-claim-fallback-limiter.ts`, `lib/wix/birthday-claim-identity.ts` ([docs/WIX_BIRTHDAY_PRICING_PROVIDER.md](docs/WIX_BIRTHDAY_PRICING_PROVIDER.md#identity-binding-and-issuance-limits)).

The repository's notes (AGENTS.md section 1.7, GENESIS.md) state that the Wix site has no Supabase variables today, so every rate-limited route there answers 503 (except the birthday claim route, which falls back to its in-process limit); that is documentation, which this repository cannot check.

**Owner checklist. None of this is verified from this repository;** confirm each item in the Wix hosting settings or with Wix support:

- [ ] Which header carries the visitor's address to the worker, and whether Wix overwrites (rather than appends to or passes on) a copy the visitor sent. Then set `RATE_LIMIT_CLIENT_IP_HEADER`, and for `x-forwarded-for` also `RATE_LIMIT_TRUSTED_PROXY_HOPS`.
- [ ] Do the item above **before** adding Supabase variables to the Wix site. With a durable store every per-address rule starts counting on the resolved address, and if every visitor resolves to one address, the birthday claim's 10 per 10 minutes (and every other per-address limit) becomes one bucket for the whole site.
- [ ] That the worker is reachable only through Wix's edge, on the custom domain and on the `*.wix-site-host.com` hosts alike.
- [ ] Which WAF, bot, DDoS and edge rate-limit protections apply to the site and to `/api/*`, and whether they can be configured.
- [ ] The request body size and duration limits at the edge.
- [ ] Whether Wix logs request headers or visitor addresses, and for how long.
- [ ] That the site's environment variables (Supabase, Stripe, tokens) are stored as secrets and never served to the browser.

## Known limits of the unpaid-hold rule

The unpaid-hold rule (`lib/booking/checkout-hold-policy.ts`, AGENTS.md section 6 item 10) keys on the checkout email, and that email is not verified. Someone who knows a customer's email and the departure they hold can therefore:

1. learn from the response texts that the customer holds that departure (the 409 "You already have an unpaid reservation for this departure…", or "This departure is already paid…" after its stored expiry), or holds two unpaid reservations (the 429 of the two-hold cap);
2. receive that hold's Stripe payment-page URL, by sending a request that matches it (same package, date, start, add-ons and payable total while the session is open);
3. use up that email's checkout allowance (`checkout-init-email`, 6 per 30 minutes), which keeps the customer out of checkout for that time.

Probing is bounded by the same limits (per email, per departure and per client, `lib/booking/checkout-throttle.ts`). A hold token bound to the browser that started the checkout would remove all three; it is not built.

A pending card booking is released by Stripe's `checkout.session.expired` webhook. A hold whose webhook never arrives keeps its slot, and it now also counts toward the email's two-hold cap. A retry of the same departure can still release it once its stored expiry has passed and Stripe reports the session `expired`, but a hold without a stored session (one made before migration 013, or one whose session could not be stored) waits for the webhook alone. The Stripe endpoint must therefore receive `checkout.session.expired` ([README, "Stripe Webhook Setup"](README.md#stripe-webhook-setup-production)).
