# Self-Hosted CI/CD POC — Draft, No Deployment

> **Status:** Draft proof of concept (POC), prepared 2026-11-11.
>
> This document authorizes **no** provisioning, installation, deployment, secret creation, workflow disablement, tag, release, or Wix mutation. It describes a safe evaluation path only. GitHub Actions, the current Wix delivery workflow, the staging site, and the live site remain unchanged.

## 1. Decision in one sentence

Keep GitHub as the public source, pull-request, immutable-tag and release ledger, but move CI/CD *execution* to a self-hosted, reproducible pipeline: **Jenkins LTS as the orchestrator, Dagger/BuildKit as the portable pipeline runtime, and isolated ephemeral Linux agents for untrusted code**.

This means **self-hosted is not offline**. The build/test computation runs on infrastructure we control; GitHub still receives commit/check/release metadata and Wix still receives an explicitly approved deployment over the network.

## 2. Why this POC exists

The repository already has a serious quality framework and automated delivery design, but its workflows execute on GitHub-hosted runners. A local developer can run much of the application test suite, yet that is not equivalent to the complete cloud workflow: secret scanning, CodeQL/ZAP schedules, external status publication, protected approvals, artifacts, Wix preview/release controls, and rollback evidence all need a coordinated control plane.

The POC answers one question before any migration: **can we reproduce the required quality and delivery controls under our ownership without weakening the existing GitHub/Wix protections?**

## 3. Safety boundary and non-goals

### In scope for the POC

- A written target architecture, trust boundaries, pipeline lanes, and acceptance criteria.
- A future *shadow* CI execution design that can report results without becoming a required merge/deploy gate.
- A common local command interface that invokes the same pipeline definitions as a self-hosted agent would use.
- A plan for reproducible artifacts, SBOMs, provenance, release evidence, and rollback rehearsal.

### Explicitly out of scope

- Provisioning Jenkins, Docker, Dagger, a VM, Kubernetes, MinIO/Harbor, Vault, or any other infrastructure.
- Installing software or opening firewall/public webhook access.
- Editing `.github/workflows`, branch/tag protections, repository variables, environments, or required checks.
- Creating, storing, rotating, or reading any Wix, Stripe, Supabase, PayPlus, Google, GitHub, or other secret.
- Running `wix preview`, `wix release`, `wix provision`, production commands, or live smoke tests.
- Creating GitHub tags/releases, invoking a release workflow, committing, pushing, or changing the current Wix topology.
- Replacing GitHub Actions. The existing pipeline remains the protection while parity is proven.

## 4. Observed starting point

This is an architecture snapshot, not a production certification.

| Area | Current evidence | POC implication |
| --- | --- | --- |
| Application test harness | `npm run test:quick`, `test:all`, and `test:full` already orchestrate type hygiene, unit/integration/security/reliability tests, sandboxed build, Playwright, visual, load, and Lighthouse layers. | Reuse the commands; do not reinvent test policy in Jenkins. |
| GitHub automation | Verify, CodeQL, secret scanning, nightly ZAP, Google snapshot/rating, release, Wix release and rollback workflows are present. They presently use GitHub-hosted Linux execution. | Map every workflow to a self-hosted lane before removing any hosted gate. |
| Wix boundary | The repository's stated writable Wix target is the `SimDream-Staging` Headless site. Production publishing must not be inferred from a preview or a staging credential. | The first delivery POC can target staging only; production is a later, separately approved program. |
| Public release ledger | GitHub provides the PR history, release objects, and an active immutable semantic-tag protection rule. | Keep GitHub as the public audit record while self-hosted infrastructure supplies computation and internal artifacts. |
| Current runners | The repository currently has no registered GitHub Actions self-hosted runner. | Avoid treating a GitHub Actions self-hosted runner as the destination architecture; it is only an optional bridge. |

## 5. POC architecture

```text
Developer laptop                         GitHub (public system of record)
───────────────                         ───────────────────────────────
same Dagger pipeline   ─── push/PR ───► source, PRs, protected tags, releases
  without deploy creds                         ▲                 │
                                               │ GitHub App       │ signed webhook
                                               │ Checks API        ▼
                                        ┌─────────────────────────────────┐
                                        │ Private CI boundary              │
                                        │ Jenkins LTS controller (0 exec.) │
                                        │  - validates event/deduplicates  │
                                        │  - selects trust lane            │
                                        └──────────────┬──────────────────┘
                                                       │ Dagger / BuildKit
                         ┌─────────────────────────────┼─────────────────────────────┐
                         ▼                             ▼                             ▼
               ephemeral PR agent            trusted main agent              release agent
               no secrets / no LAN           staging-only credential          two human approvals
               no host Docker socket          immutable artifacts               staged Wix deploy later
                         │                             │                             │
                         └──────────► private artifact store ◄──────────────────────┘
                                      reports, SBOM, provenance, SHA-256

                                                        │
                              POC: no call              │ later, approved only
                                                        ▼
                                             Wix staging target first
                                             production remains disabled
```

### Selected components

| Concern | POC choice | Reason |
| --- | --- | --- |
| Pipeline orchestrator | Jenkins LTS | Mature self-hosted control plane, durable queue/history, credentials delegation and manual approval stages. The controller runs **zero build executors**. |
| Portable pipeline definition | Dagger on BuildKit | The same typed/containerized steps can run on a laptop and on an agent; it reduces “works only in CI” drift. |
| Build agents | Ephemeral rootless Linux containers or short-lived VMs | Pull requests execute untrusted code; agents must disappear after each run and have no durable workspace, secret, Docker socket, or broad network trust. |
| Artifact/evidence store | MinIO or Harbor-compatible object/OCI storage | Retains test reports, build outputs, SBOMs, provenance and digests independently of a CI job log. |
| Secrets | Vault, 1Password Connect, or SOPS/age with a reviewed operator model | Centralizes short-lived, environment-scoped retrieval. Secrets are never in a pipeline file, image, browser, repository, or global Jenkins environment. |
| GitHub integration | GitHub App, not a personal access token | Supports short-lived installation tokens and narrow permissions such as repository metadata read and `checks:write`. External Check Runs are the supported way for an external CI system to report a required status. [GitHub Checks API](https://docs.github.com/en/rest/checks/runs?apiVersion=latest) |
| Developer interface | A future `Taskfile`/`justfile` wrapper over the Dagger pipeline | Enables `quick`, `standard`, `full`, security and build lanes locally without granting a laptop deploy credentials. This interface does **not** exist yet. |

## 6. Trust lanes

The lane is chosen from the event source, not from a branch name supplied by the pull request.

| Lane | Trigger | Credentials | Network and host access | Allowed outcome |
| --- | --- | --- | --- | --- |
| Untrusted PR | Fork or contributor PR, pinned merge result | None | No internal LAN, no host mounts, no Docker socket, no deployment access | Tests and a GitHub Check result only |
| Trusted PR | Same-repository PR, pinned merge result | None by default | Same isolation as untrusted PR | Tests, reports, external Check result only |
| Main | Protected `main` commit after merge | Read-only integration credentials; staging-only credential only after full checks | Restricted egress; isolated workspace | Immutable staging preview only in a later phase |
| Release candidate | Immutable SemVer tag reachable from verified `main` | Separate release/staging credential after approval | Restricted egress; provenance required | Build and verify an attested release artifact |
| Production deployment | Explicit, approved release artifact | Separate production credential, if and only if a separate production target exists | Dedicated deploy executor only | Not part of this POC |

No pull request ever receives deployment, payment, customer-data, production, or long-lived credentials. A GitHub webhook is either received through a tiny authenticated private ingress or replaced with short-interval outbound polling; no Jenkins controller should be exposed broadly to the internet just to accept webhooks.

## 7. Pipeline parity map

The new system must first prove it can *observe* all expected quality signals. GitHub Actions remains required until this map is complete and reviewed.

| Existing responsibility | Self-hosted POC representation | POC result |
| --- | --- | --- |
| Type hygiene, Vitest, docs verification | `quick` Dagger module | JUnit/coverage/Genesis proof stored and reported as one external check |
| Sandboxed production build and Wix worker budget | `build` Dagger module | Build output, size report and SHA-256 retained |
| Chromium, Firefox, WebKit and touch journeys | `browser` module on prebuilt Playwright image | Playwright reports/traces/videos retained per shard |
| Accessibility, usability, security-web, resilience, visual | `web-quality` module | Existing ratchets retained; Linux visual baseline image digest recorded |
| Load and Lighthouse | `performance` module | p99/Lighthouse reports with source SHA and container digest |
| Gitleaks and dependency scanning | `security` module | SARIF/text report and scan configuration retained |
| CodeQL | Dedicated analysis lane or a documented temporary exception | Must be equivalent before hosted CodeQL is removed; it is not silently dropped |
| Nightly ZAP | Scheduled, sandbox-only security lane | No customer system, payment gateway or production target is scanned in POC |
| Google rating/review refresh | Scheduled operational lane with separate least-privilege secret | Move only after snapshot correctness and failure alerts are proven |
| Release Please/version PR | Local release preparation lane using Conventional Commits | Opens/updates a GitHub release PR only after later approval; not part of this POC |
| Wix preview/release/rollback | Staging deploy and artifact-republish lanes | Designed now, disabled in the POC |

`act` alone is not sufficient for this parity. It does not recreate GitHub environment approvals, hosted artifacts, workflow-chain semantics, external status reporting, or Wix deployment behavior. GitHub Actions self-hosted runners may be useful as a temporary compatibility bridge, but they still leave GitHub Actions as the control plane and are not the target design.

## 8. Release, public version and provenance design

The public release flow remains transparent and reviewable in GitHub:

1. A Conventional-Commit pull request is merged through the existing protected branch path.
2. The self-hosted pipeline verifies the exact protected `main` SHA and publishes a non-required external Check Run plus signed internal evidence during the shadow phase.
3. A future release-preparation job creates or updates a release PR; it never versions arbitrary working-tree content.
4. The release PR is reviewed and merged, then a full verification run attests its exact commit.
5. A dedicated release process creates a **signed, annotated** `vX.Y.Z` tag only when the version matches `package.json`, the tag is reachable from `main`, and all required evidence refers to that exact SHA.
6. The same process creates the GitHub Release and attaches/references the tested artifact digest, SBOM, provenance and quality summary. GitHub’s Releases API is the supported public-release interface. [GitHub Releases API](https://docs.github.com/en/rest/releases/releases?apiVersion=latest)
7. A deployment, if enabled in a future phase, consumes the attested artifact rather than rebuilding a differently sourced working tree.

GitHub tag rules can restrict tag creation, updates and deletion; retain the existing immutable-release-tag control and make any future signing rule additive rather than weakening it. [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)

## 9. Artifact, SBOM and rollback rules

Every passing pipeline run should publish an evidence bundle keyed by commit SHA and immutable build digest:

- `quality-report.md`, JUnit XML, coverage, browser reports, traces and screenshots;
- build manifest, Wix worker size report and SHA-256 checksums;
- an SPDX or CycloneDX SBOM generated with Syft;
- provenance naming the source SHA, lockfile digest, container image digests and pipeline definition revision;
- a signature (for example Cosign with an internally managed key) over the artifact/provenance digest;
- retention rules appropriate for audit and incident response, including a documented recovery test.

Rollback means republishing a prior verified, attested artifact/tag after an approval. It must not change Wix Bookings, member records, services, prices, coupons, payment configuration or customer data. Rebuild-from-source is an emergency fallback, not the normal rollback mechanism.

## 10. POC phases and exit gates

### Phase 0 — Design only (this document)

**Deliverable:** this draft, a reviewed decision record, and no runtime change.

**Exit gate:** owner accepts the trust model, desired hosting boundary and the fact that GitHub Actions remains the fallback during evaluation.

### Phase 1 — Shadow quality runner

**Future work, not authorized by this document:** provision a private controller and one disposable agent; implement Dagger modules that call the existing quality commands; report a non-required GitHub Check Run.

**Exit gate:** at least ten representative PR/main executions match GitHub’s pass/fail conclusions; mismatches have a written root cause; no secrets were exposed to PR code.

### Phase 2 — Evidence and scheduled workload parity

**Future work:** add artifact retention/SBOM/provenance, scheduled sandbox security scans, and the review refresh jobs with alerting and idempotency.

**Exit gate:** restore an evidence bundle by SHA, replay a failed job, demonstrate webhook deduplication, and rehearse a controller/agent loss without losing release evidence.

### Phase 3 — Staging delivery rehearsal

**Future work:** use a separately approved staging-only credential to deploy one immutable artifact to the repository’s permitted staging Wix target, then smoke-test only non-destructive public paths.

**Exit gate:** compare artifact digest through build/preview, prove the one-time credential scope, verify rollback to a prior staging artifact, and obtain human approval to make the external check required.

### Phase 4 — Production delivery decision

**Not planned by this POC.** It may begin only after a separate production Wix target/credential, release approval policy, incident ownership, monitoring, recovery exercise and security review are explicitly approved.

## 11. Acceptance criteria for the eventual POC implementation

The POC is successful only when all statements below can be shown with evidence:

- The exact pipeline code runs locally and on an ephemeral agent with the same container/tool versions.
- PR code cannot read deployment or production secrets, reach protected internal services, retain a workspace, or control the host Docker daemon.
- The external GitHub check names and conclusions are traceable to immutable reports and source SHA.
- The existing `npm run test:quick`, `npm run test:all`, `npm run test:full`, `npm run wix:build`, and documentation verification rules retain their current pass/fail policy.
- Artifacts are checksum-addressed and include SBOM/provenance; release deploys use those artifacts rather than an unpinned rebuild.
- Webhook delivery IDs are authenticated, logged and deduplicated; replay/forgery attempts fail safely.
- A laptop can run quality commands but cannot deploy or retrieve staging/production secrets.
- GitHub Actions stays required until a formally approved parity record says otherwise.
- The first writable deployment path reaches the permitted staging Headless target only. No POC run can publish customer-facing production content.

## 12. Decisions required before implementation

1. **Where will the always-on controller run?** A small dedicated Linux host/VM is the preferred baseline; a developer laptop is not a reliable CI service. Starting sizing to validate is 8 vCPU, 32 GB RAM and 200 GB NVMe, plus a second agent as parallel browser workload grows.
2. **How will private ingress work?** Choose either signed webhook through a minimal reverse proxy/VPN boundary or 1–2 minute GitHub API polling. Do not expose Jenkins directly.
3. **Which secret service will be operated?** Vault, 1Password Connect, or SOPS/age need an owner, backup/rotation model and break-glass process.
4. **Where will artifacts live?** Select MinIO/Harbor-compatible storage, encryption, retention period and disaster-recovery responsibility.
5. **What is the real-device policy?** Playwright WebKit/mobile emulation provides broad coverage; a Mac mini plus controlled real iPhone lane is needed if physical Safari/iOS validation becomes a release requirement.
6. **When will production be a separate Wix target?** Until there is a distinct production site/key and reviewed approval boundary, all writable automation remains staging-only.

## 13. Commands deliberately not run

The following examples are listed to make the boundary unambiguous; this POC did **not** run them and does not authorize them:

```bash
# No local/remote provisioning, release, preview, tag, or publish operation was run.
npm run wix:provision
npm run wix:preview
npm run wix:release
git tag -s vX.Y.Z
gh release create vX.Y.Z
```

## 14. Related project documents and external references

- [Testing framework](../TESTING.md)
- [Current GitHub-to-Wix delivery design](GITHUB_WIX_CICD.md)
- [Wix Headless architecture and boundary](WIX_HEADLESS_ARCHITECTURE.md)
- [Wix cutover runbook](WIX_HEADLESS_CUTOVER_RUNBOOK.md)
- [GitHub Checks API](https://docs.github.com/en/rest/checks/runs?apiVersion=latest)
- [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
- [GitHub Releases API](https://docs.github.com/en/rest/releases/releases?apiVersion=latest)
