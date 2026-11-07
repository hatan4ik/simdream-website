# GitHub → Wix Headless Continuous Delivery

## Outcome

GitHub is the deployment control plane for the managed Wix Headless frontend. A developer never needs to run `wix preview` or `wix release` from a laptop after this is enabled.

The pipeline controls the existing Wix-managed Headless project in [`wix.config.json`](../wix.config.json): site `317b0c6d-6608-499a-bb3c-b1c37650e460`. This file contains only public identifiers. It must never contain an API key, client secret, PayPlus credential, Stripe key, Supabase service key, or customer data.

```text
feature branch → pull request → Verify workflow
                                      │
                                      └─ mergeability preflight + protected native auto-merge → main
                                              │
                                              ▼
                                   all quality gates pass
                                              │
                                              ▼
                             immutable Wix preview for that SHA

passing main Verify → Release Please PR → explicitly dispatch Verify on that candidate → merge approved Release PR
                                              │
                                              ▼
                       immutable vX.Y.Z → re-run full tag gate → production approval → Wix release → smoke check
```

`wix preview` creates a unique immutable build URL; it does not replace the published customer site. `wix release` publishes the compiled Headless frontend and clears the Wix site cache. The Wix Bookings, Members, CMS, payment-provider and other business configuration are not seeded, modified, or activated by either workflow.

## Automated workflows

| Workflow / job | Trigger | Result | Credential boundary |
| --- | --- | --- | --- |
| `Verify` | Pull request, push to `main`, `v*` tag, or the release workflow's explicit dispatch for its generated candidate | Type hygiene, unit/integration/security/reliability, production build, browser, accessibility, visual, load and Lighthouse gates | No Wix credential |
| `Wix immutable preview` in `ci.yml` | A passing push to `main` while `WIX_PREVIEW_CI_ENABLED=true` | Builds the Worker and executes `wix preview`; GitHub extracts the canonical Wix hostname, waits up to 150 seconds for Wix route propagation while smoke-checking it, and records the returned URL against the `wix-preview` environment | `wix-preview` environment secret only |
| `Prepare semantic release` | A completed, successful `Verify` run for the current `main` tip | Release Please first proves that `main` has not advanced since that exact Verify run. It then maintains a Conventional-Commit release PR and explicitly dispatches the same Verify workflow against that generated candidate; merging the fully verified candidate updates the changelog/version, creates the GitHub Release and an immutable SemVer tag | No Wix credential |
| `Publish released Wix frontend` | The release workflow's authenticated repository dispatch after a GitHub Release is created | Checks the tag is SemVer, on `main`, and matches `package.json`; reruns `npm run test:all`, then builds, releases and smoke-checks `/`, `/book`, and `/vouchers` | `wix-production` environment secret only, after approval |
| `Roll back Wix production` | Manual GitHub Actions dispatch | Rebuilds and republishes a previously verified SemVer tag after the same production approval | `wix-production` environment secret only |

The preview and release logs are workflow artifacts. Wix release comments include the Git tag and commit SHA, so the Wix version and Git history can be reconciled during an incident.

## One-time owner setup

These actions are intentionally performed by the Wix/GitHub owner, not through source code or chat.

1. **Rotate exposed credentials.** Do not reuse an old broad or shared Wix credential. Create dedicated automation credentials for this pipeline.
2. In Wix, create two scoped CI API keys with access restricted to only this Headless site. Give each only the minimum permissions that the Wix CLI needs to upload a build/preview/release. Keep one key for preview and a separately rotatable key for production.
3. In GitHub repository **Settings → Environments**, create:
   - `wix-preview`: allowed only from `main`; add secret `WIX_CI_API_KEY` with the preview key.
   - `wix-production`: allowed only from version tags; add secret `WIX_CI_API_KEY` with the production key; require an approver and disable administrator bypass where the plan supports it.
4. In GitHub repository **Settings → Secrets and variables → Actions → Variables**, create independent non-secret activation variables:
   - `WIX_PREVIEW_CI_ENABLED=true` after the preview secret is installed. Every passing `main` commit then creates an immutable preview.
   - `WIX_PRODUCTION_CI_ENABLED=false` until the production secret and approval policy are ready. Change it to `true` only when production release and rollback are deliberately enabled; leave the protected `wix-production` approval in place so enabling the variable never publishes by itself.
   This separation lets a staging-only credential automate previews without ever granting or attempting production publishing.
5. In GitHub **Settings → Rules**, protect `main`: require pull requests, up-to-date branches, the existing Verify checks (`quality`, `build`, `e2e`, `web-quality`, `load-smoke`, and `lighthouse`), the **PR mergeability preflight** check after its first successful run, and no force pushes. For a single-maintainer repository, use an approval count of zero but still require the PR and checks. Follow [`GITHUB_PR_AUTOMATION.md`](GITHUB_PR_AUTOMATION.md) to enable squash-only native auto-merge and the `automerge` label.
6. Create a tag rule for `v*` that forbids update and deletion. A production version must be an immutable SemVer tag, for example `v1.4.0`.
7. In GitHub **Settings → Actions → General**, retain the default `GITHUB_TOKEN` permission as **Read repository contents** and allow GitHub Actions to create and approve pull requests. The release workflow needs that narrowly scoped platform permission to create its version PR; it uses an explicit `workflow_dispatch` to validate it, so no personal access token is stored as a repository secret.

GitHub environment secrets are exposed only to the job after that environment's rules pass. The workflow never echoes the secret and no secret belongs in `.env.example`, `wix.config.json`, Git history, action logs, or browser code.

## Normal release operation

1. Add the `automerge` label to a reviewed same-repository pull request with a Conventional Commit title; GitHub waits for all required checks, then squash-merges it to `main`.
2. GitHub finishes Verify and creates a Wix preview automatically. Open the `Wix immutable preview` deployment from the commit or the Actions run.
3. Release Please opens or updates exactly one release PR with the calculated Semantic Version and generated changelog, then dispatches the complete Verify workflow against that candidate. Review and merge it only after both that candidate Verify run and the Wix preview are green.
4. The immutable tag is created automatically. The release pipeline independently reruns all required quality gates against that exact tag, then waits for the `wix-production` approval. After approval it publishes to Wix and smoke-checks public routes.

No one needs to use the local Wix CLI for the normal path.

## Rollback

1. Open **Actions → Roll back Wix production → Run workflow**.
2. Enter a previously released SemVer tag and an incident/change reason.
3. Approve the `wix-production` environment deployment.

The workflow checks out that exact tag, re-runs its fast safety gate, builds the historical Worker artifact, republishes it, and smoke-checks the restored site. It does not mutate Wix Bookings, customer records, price plans, coupons, or payment configuration.

## Environment isolation roadmap

Wix previews make the **frontend artifact** immutable, but the currently configured Wix Headless project remains one shared business backend. Before testing live payment, customer records, coupons, or irreversible Bookings actions, create a separate Wix Headless staging site with its own OAuth app, API key, business data, payment sandbox and `wix.config.json` target. Map `main` previews to that site and production tags to the production site. Branch names alone are not environment isolation.
