# Contributing to SimDream

## Delivery contract

Work on a short-lived branch, open a pull request, and merge only after the **Verify** workflow is green. `main` is the source of release candidates; never develop directly on it.

Use conventional commits so the release system can determine the correct Semantic Version:

| Commit | Release effect |
| --- | --- |
| `fix: correct voucher validation` | Patch (`1.0.1`) |
| `feat: add a flight-deck booking flow` | Minor (`1.1.0`) |
| `feat!:` or a `BREAKING CHANGE:` footer | Major (`2.0.0`) |
| `docs:`, `test:`, `chore:`, `ci:` | No product release unless paired with a releasable change |

After the complete Verify workflow succeeds on `main`, Release Please keeps one release pull request up to date. Its generated `CHANGELOG.md`, package version, GitHub Release and `vX.Y.Z` tag are the version record. Merging that release PR is the only normal way to create a release.

The released tag is rebuilt and tested independently before it can enter the protected `wix-production` environment. Deployment requires the Wix production toggle, its environment secret, and an environment approval; it is never implied by a regular commit.

## Required checks before requesting review

```bash
npm run test:quick   # typecheck and type hygiene, GENESIS.md coverage (docs:verify) and Vitest
```

`test:quick` already runs `docs:verify`, so a separate call is only needed to re-check [`GENESIS.md`](GENESIS.md) after re-stamping it (`npm run docs:genesis:stamp`). Run `npm run test:all` for an end-to-end feature. Follow the scheduling, localization, security and payment invariants in [AGENTS.md](AGENTS.md).

## Fast CLI approvals

Use the guarded helper to approve a reviewed, non-draft pull request without leaving the terminal:

```bash
./scripts/approve-pr.sh 42 --wait -m "Verified locally; approved."
```

It refuses self-approval, drafts, closed PRs, failed checks and PRs with no configured required checks. It never merges or deploys; those remain separately protected steps.
