# GitHub → Wix Headless Continuous Delivery

## Outcome

GitHub is the deployment control plane for the managed Wix Headless frontend. A developer never needs to run `wix preview` or `wix release` from a laptop after this is enabled.

The pipeline controls the existing Wix-managed Headless project in [`wix.config.json`](../wix.config.json): site `317b0c6d-6608-499a-bb3c-b1c37650e460`. This file contains only public identifiers. It must never contain an API key, client secret, PayPlus credential, Stripe key, Supabase service key, or customer data.

```text
feature branch → pull request → Verify workflow
                                      │
                                      └─ merge to main
                                              │
                                              ▼
                                   all quality gates pass
                                              │
                                              ▼
                             immutable Wix preview for that SHA

git tag vX.Y.Z on a main commit
              │
              ▼
     all quality gates pass → production approval → Wix release → smoke check
```

`wix preview` creates a unique immutable build URL; it does not replace the published customer site. `wix release` publishes the compiled Headless frontend and clears the Wix site cache. The Wix Bookings, Members, CMS, payment-provider and other business configuration are not seeded, modified, or activated by either workflow.

## Automated workflows

| Workflow / job | Trigger | Result | Credential boundary |
| --- | --- | --- | --- |
| `Verify` | Pull request, push to `main`, or `v*` tag | Type hygiene, unit/integration/security/reliability, production build, browser, accessibility, visual, load and Lighthouse gates | No Wix credential |
| `Wix immutable preview` in `ci.yml` | A passing push to `main` | Builds the Worker and executes `wix preview`; GitHub records the returned URL against the `wix-preview` environment | `wix-preview` environment secret only |
| `Publish approved Wix release` in `ci.yml` | A passing immutable SemVer tag `vX.Y.Z` whose commit is on `main` | Builds, releases, smoke-checks `/`, `/book`, and `/vouchers`, then records the URL and logs | `wix-production` environment secret only, after approval |
| `Roll back Wix production` | Manual GitHub Actions dispatch | Rebuilds and republishes a previously verified SemVer tag after the same production approval | `wix-production` environment secret only |

The preview and release logs are workflow artifacts. Wix release comments include the Git tag and commit SHA, so the Wix version and Git history can be reconciled during an incident.

## One-time owner setup

These actions are intentionally performed by the Wix/GitHub owner, not through source code or chat.

1. **Rotate exposed credentials.** Do not reuse an old broad or shared Wix credential. Create dedicated automation credentials for this pipeline.
2. In Wix, create two scoped CI API keys with access restricted to only this Headless site. Give each only the minimum permissions that the Wix CLI needs to upload a build/preview/release. Keep one key for preview and a separately rotatable key for production.
3. In GitHub repository **Settings → Environments**, create:
   - `wix-preview`: allowed only from `main`; add secret `WIX_CI_API_KEY` with the preview key.
   - `wix-production`: allowed only from version tags; add secret `WIX_CI_API_KEY` with the production key; require an approver and disable administrator bypass where the plan supports it.
4. In GitHub repository **Settings → Secrets and variables → Actions → Variables**, create the non-secret repository variable `WIX_CI_ENABLED` with value `true`. This is the final activation switch; before it is present, the deployment jobs are deliberately skipped instead of failing or publishing unexpectedly.
5. In GitHub **Settings → Branches**, protect `main`: require pull requests, up-to-date branches, and the existing Verify checks (`quality`, `build`, `e2e`, `web-quality`, `load-smoke`, and `lighthouse`). Do not allow force pushes.
6. Create protected version tags matching `v*`. A production version must be an immutable SemVer tag, for example `v1.4.0`.

GitHub environment secrets are exposed only to the job after that environment's rules pass. The workflow never echoes the secret and no secret belongs in `.env.example`, `wix.config.json`, Git history, action logs, or browser code.

## Normal release operation

1. Merge a reviewed pull request to `main`.
2. GitHub finishes Verify and creates a Wix preview automatically. Open the `Wix immutable preview` deployment from the commit or the Actions run.
3. When the preview is accepted, create an annotated release tag on that exact commit and push it:

   ```bash
   git tag -a v1.4.0 -m "SimDream frontend v1.4.0"
   git push origin v1.4.0
   ```

4. GitHub reruns all required quality gates for the tagged source. It then waits for the `wix-production` approval. After approval it publishes to Wix and smoke-checks public routes.

No one needs to use the local Wix CLI for the normal path.

## Rollback

1. Open **Actions → Roll back Wix production → Run workflow**.
2. Enter a previously released SemVer tag and an incident/change reason.
3. Approve the `wix-production` environment deployment.

The workflow checks out that exact tag, re-runs its fast safety gate, builds the historical Worker artifact, republishes it, and smoke-checks the restored site. It does not mutate Wix Bookings, customer records, price plans, coupons, or payment configuration.

## Environment isolation roadmap

Wix previews make the **frontend artifact** immutable, but the currently configured Wix Headless project remains one shared business backend. Before testing live payment, customer records, coupons, or irreversible Bookings actions, create a separate Wix Headless staging site with its own OAuth app, API key, business data, payment sandbox and `wix.config.json` target. Map `main` previews to that site and production tags to the production site. Branch names alone are not environment isolation.
