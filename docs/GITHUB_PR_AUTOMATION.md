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
