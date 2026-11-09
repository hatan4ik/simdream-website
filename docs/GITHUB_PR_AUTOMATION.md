# GitHub Pull-Request Automation

## Outcome

Every normal source change follows one controlled path:

```text
feature branch → pull request → mergeability preflight + Verify + CodeQL
                                     │
                           label `automerge`
                                     │
                                     ▼
                    GitHub native squash auto-merge
                                     │
                                     ▼
                        protected `main` → Wix pipeline
```

The repository never lets an action invent a source-conflict resolution. A real conflict is a product/code decision; an automated merge is safe only after Git has a clean merge tree and GitHub accepts every protection rule.

## Controls now in source

| Control | File | Behaviour |
| --- | --- | --- |
| Mergeability preflight | [`.github/workflows/pr-mergeability.yml`](../.github/workflows/pr-mergeability.yml) | Runs `git merge-tree` against the current PR base, then waits up to 60 seconds for GitHub's mergeability API. It fails clearly for a real conflict or a GitHub/local discrepancy. |
| Trusted auto-merge | [`.github/workflows/enable-trusted-automerge.yml`](../.github/workflows/enable-trusted-automerge.yml) | A same-repository, non-draft PR carrying `automerge` gets GitHub-native **squash** auto-merge. No PR code is checked out or run by this privileged workflow. |
| Change-scope secret gate | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Gitleaks blocks a new secret introduced by a pull request or `main` push. The generated Release Please candidate deliberately skips this duplicate check because it is derived from an already verified `main` commit. |
| Historical audit | [`.github/workflows/security-history-audit.yml`](../.github/workflows/security-history-audit.yml) | Owner-triggered, full-history Gitleaks audit. It is not a merge gate: old findings need credential rotation and a separately reviewed history-rewrite plan, never a broad allowlist. |

## Scheduled Google rating refresh

The utility bar shows `LAST_KNOWN_GOOGLE_RATING` whenever `/api/reviews` has no Google data. Its two numbers live in [`lib/reviews/last-known-rating.json`](../lib/reviews/last-known-rating.json) and are refreshed by [`.github/workflows/google-rating-refresh.yml`](../.github/workflows/google-rating-refresh.yml), which runs [`scripts/refresh-google-rating.mjs`](../scripts/refresh-google-rating.mjs). The script only fetches and validates: it prints the new file text on stdout and touches no file (no place ID read from disk, no network data written to disk, which also keeps CodeQL's data-flow queries quiet without suppressions). The workflow step writes the file with plain shell, lets `git diff` decide whether anything changed, and builds the title with `jq` and `printf`:

```text
Mondays 05:17 UTC (or Actions → Refresh Google rating → Run workflow)
   │  Places API (New), field mask rating,userRatingCount  (the only source; no scraping)
   ├─ key missing → notice, stop            numbers unchanged → stop (no commit, no PR, no CI)
   └─ changed → force-update branch automation/google-rating (one commit, a 1–2 line JSON diff)
                → one rolling PR "fix(reviews): refresh Google rating to 5.0 (423 reviews)"
                → the workflow approves that PR's own pull_request runs
   you: merge the PR → Verify on main → Release Please patch PR → merge it → approve `wix-production`
```

Properties: a re-run with the same numbers on the same `main` tip rebuilds the identical commit (author, dates and parent are fixed), so the push is a no-op and starts no checks. A re-run after `main` moved rebases the open PR onto the new tip. A bad key, an HTTP error or an implausible payload (grade outside 0–5, a non-integer or zero count) fails the run and changes nothing. The JSON is excluded from the Genesis fingerprint (`VOLATILE_DATA` in `scripts/check-genesis-coverage.ts`) and the specs read it instead of pinning it, so a refresh PR touches one file and fails no check because of its numbers.

**Why you merge it yourself.** Two GitHub rules shape this and cannot be removed without a PAT or GitHub App: events caused by `GITHUB_TOKEN` start no workflows, so the PR's own runs wait as `action_required` (the workflow approves them, as `release-please.yml` does), and a PR merged under the `github-actions` identity (the `automerge` label, or auto-merge enabled by a workflow) never starts Verify on `main`, so Release Please never sees the commit (PRs #42 and #45 were merged that way: commit `e6e3e14` has no workflow run at all, and the manual Verify dispatch `42432102687` for `35b2b33` was skipped by Release Please, which accepts only `push`-triggered Verify runs). A merge click by you is a normal push and starts the usual Verify, Release Please and Wix chain. The PR therefore deliberately carries no `automerge` label. Choosing `chore(reviews)` instead of `fix(reviews)` in the workflow's `title=` line would stop the weekly patch release and let the number ride along with the next release.

**One-time setup (owner).** Steps 1–3 are scripted in [`scripts/setup-google-places-key.sh`](../scripts/setup-google-places-key.sh): after `gcloud auth login` (the only interactive step) run `scripts/setup-google-places-key.sh --project <GCP_PROJECT_ID>`; it reuses or creates an API key named `simdream-places` restricted to Places API (New), pipes the key string straight into the repository secret without printing it, and starts the first refresh run. Add `--wix-env` to also store it as a Wix secret server variable (`wix env set`) for live `/api/reviews` data on the Wix-managed deployment. The project needs billing enabled; the script stops with a clear message if it is not.

1. In Google Cloud, enable **Places API (New)** and create an API key restricted to that one API (API restriction: Places API (New)). An application restriction is impractical because GitHub runners use changing IPs.
2. In GitHub **Settings → Secrets and variables → Actions → New repository secret**, add `GOOGLE_PLACES_API_KEY`. Until then the workflow only logs a notice. This is a repository secret read by one step; the Wix Worker's own `GOOGLE_PLACES_API_KEY` (for live data in `/api/reviews`) is separate.
3. Run **Actions → Refresh Google rating → Run workflow** once to check the key. It needs the settings below (allow Actions to create pull requests; auto-delete head branches). If a check on the PR still shows **Approve and run workflows** after the run, click it once or re-run the workflow (the approval step is idempotent). If `main` moves before you merge, re-run the workflow to rebase the PR instead of clicking Update branch.

## One-time owner settings

Configure these once in GitHub repository settings. They are deliberately enforced both by GitHub and by the workflow design.

1. In **Settings → General → Pull Requests**, enable **Allow squash merging** and **Allow auto-merge**. Disable merge commits and rebase merges; enable automatic deletion of head branches.
2. Keep `main` protected: require a pull request, require branches to be up to date, require conversation resolution, require linear history, disallow force pushes and deletions, and require all existing `Verify` and CodeQL checks.
3. After the first successful run of this workflow, add **`PR mergeability preflight / Clean merge with base`** to `main`'s required checks. That makes a GitHub/local mergeability discrepancy a merge blocker as well as an obvious diagnostic.
4. Create the `automerge` label: description `Eligible for native squash auto-merge after required checks`; color `0E8A16`.
5. In **Settings → Actions → General**, keep the default `GITHUB_TOKEN` at read-only and allow workflows to create pull requests. The narrowly scoped workflow permissions in the files above grant just enough write access to enable native auto-merge; no personal token is stored.

Native auto-merge is intentionally unavailable for a fork PR. A maintainer must first review it and create a trusted, same-repository branch.

## Normal developer operation

```bash
git switch -c feat/short-description
# make and test the change
git push -u origin HEAD
gh pr create --fill
gh pr edit --add-label automerge
```

The last command opts the pull request into native auto-merge. It remains pending until the required checks and branch protection are green; it does not bypass a failure, a conflict, or a missing review policy.

To stop a queued merge:

```bash
gh pr merge <number-or-url> --disable-auto
gh pr edit <number-or-url> --remove-label automerge
```

## Conflict procedure

1. Read the **PR mergeability preflight** summary before changing a branch.
2. If local Git and GitHub both report a conflict, rebase the feature branch on current `main`, make the minimal, reviewed source decision, run the quality gate, then force-push with `--force-with-lease`.
3. If local Git is clean but GitHub reports `CONFLICTING`, wait for the preflight retry. If it persists, do not recreate the PR: attach the preflight run URL, PR URL, base SHA and head SHA to GitHub Support.
4. If the only conflict is the generated Genesis fingerprint, rebase, retain the reviewed document content, run `npm run docs:genesis:stamp`, run `npm run docs:verify`, and commit the new fingerprint. Never choose a fingerprint without restamping the final tree.

## Security boundary

The historical audit is currently expected to expose old findings until their associated credentials have been rotated and an owner-approved history cleanup is completed. That is a security-remediation project, not an auto-merge workaround. The routine pull-request gate remains strict for new code, while preserving a reliable release path for a Release Please candidate that GitHub itself generated from a previously verified `main` revision.

## Merge queue

GitHub's merge queue is a useful next step after the repository moves to an eligible organization plan. It is not used here because the current repository is owned by a personal account. If enabled later, add the `merge_group` trigger to every required workflow before turning the queue on.
