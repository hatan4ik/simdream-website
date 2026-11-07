#!/usr/bin/env bash
# Submit a safe GitHub pull-request approval from the command line.
#
# Usage:
#   ./scripts/approve-pr.sh 42
#   ./scripts/approve-pr.sh https://github.com/owner/repo/pull/42 --wait
#   ./scripts/approve-pr.sh 42 --repo owner/repo --message "Reviewed locally; approved."

set -Eeuo pipefail

SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_NAME
readonly DEFAULT_MESSAGE="Reviewed and approved via GitHub CLI."

usage() {
  cat <<USAGE
Approve one open GitHub pull request after its required checks pass.

Usage:
  ${SCRIPT_NAME} <pr-number-or-url> [options]

Options:
  -R, --repo OWNER/REPO   Repository when the PR number is not in this checkout.
  -m, --message TEXT      Review body (default: "${DEFAULT_MESSAGE}").
      --wait              Poll required checks every 20 seconds until they pass.
      --dry-run           Validate the PR and checks, but do not submit a review.
  -h, --help              Show this help.

Examples:
  ${SCRIPT_NAME} 42
  ${SCRIPT_NAME} 42 --wait -m "Verified on the Wix preview; approved."
  ${SCRIPT_NAME} https://github.com/owner/repo/pull/42 --dry-run

Safety rules:
  * The PR must be open and not a draft.
  * At least one required check must be reported, and all required checks must pass.
  * You cannot approve your own PR; GitHub requires another reviewer.
  * This script never merges a PR, changes branch protection, or deploys anything.
USAGE
}

die() {
  printf '%s: %s\n' "$SCRIPT_NAME" "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "requires '$1' on PATH"
}

target=""
repo=""
message="$DEFAULT_MESSAGE"
wait_for_checks=false
dry_run=false

while (($#)); do
  case "$1" in
    -R|--repo)
      (($# >= 2)) || die "missing value for $1"
      repo="$2"
      shift 2
      ;;
    -m|--message)
      (($# >= 2)) || die "missing value for $1"
      message="$2"
      shift 2
      ;;
    --wait)
      wait_for_checks=true
      shift
      ;;
    --dry-run)
      dry_run=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --*)
      die "unknown option: $1"
      ;;
    *)
      [[ -z "$target" ]] || die "only one PR number or URL may be supplied"
      target="$1"
      shift
      ;;
  esac
done

[[ -n "$target" ]] || {
  usage >&2
  exit 2
}

require_command gh
require_command jq
gh auth status >/dev/null 2>&1 || die "GitHub CLI is not authenticated; run 'gh auth login' first"

repo_args=()
if [[ -n "$repo" ]]; then
  repo_args=(--repo "$repo")
fi

pr_json="$(gh pr view "$target" "${repo_args[@]}" --json number,url,title,state,isDraft,author)"
pr_number="$(jq -er '.number' <<<"$pr_json")"
pr_url="$(jq -er '.url' <<<"$pr_json")"
pr_title="$(jq -er '.title' <<<"$pr_json")"
pr_state="$(jq -er '.state' <<<"$pr_json")"
pr_draft="$(jq -r '.isDraft' <<<"$pr_json")"
pr_author="$(jq -er '.author.login // empty' <<<"$pr_json")"
viewer_login="$(gh api user --jq '.login')"

[[ "$pr_state" == "OPEN" ]] || die "PR #${pr_number} has state ${pr_state}, not OPEN"
[[ "$pr_draft" == "false" ]] || die "PR #${pr_number} is still a draft"
[[ "$pr_author" != "$viewer_login" ]] || die "you (@${viewer_login}) authored PR #${pr_number}; GitHub does not allow self-approval"

printf 'PR #%s: %s\n%s\n' "$pr_number" "$pr_title" "$pr_url"

while true; do
  checks_exit=0
  checks_json="$(gh pr checks "$target" "${repo_args[@]}" --required --json name,bucket)" || checks_exit=$?

  jq -e 'type == "array"' >/dev/null <<<"$checks_json" \
    || die "could not read required-check status"

  check_count="$(jq 'length' <<<"$checks_json")"
  ((check_count > 0)) || die "GitHub reported no required checks; configure branch protection before approving"

  printf 'Required checks:\n'
  jq -r '.[] | "  [\(.bucket)] \(.name)"' <<<"$checks_json"

  failed_count="$(jq '[.[] | select(.bucket == "fail" or .bucket == "cancel")] | length' <<<"$checks_json")"
  pending_count="$(jq '[.[] | select(.bucket == "pending")] | length' <<<"$checks_json")"
  nonpassing_count="$(jq '[.[] | select(.bucket != "pass" and .bucket != "pending")] | length' <<<"$checks_json")"

  ((failed_count == 0)) || die "one or more required checks failed; approval was not submitted"
  ((nonpassing_count == 0)) || die "one or more required checks did not pass; approval was not submitted"

  if ((pending_count > 0)); then
    if [[ "$wait_for_checks" == true ]]; then
      printf 'Checks are pending; waiting 20 seconds…\n' >&2
      sleep 20
      continue
    fi
    die "required checks are still pending; rerun with --wait or try again after they pass"
  fi

  # Do not rely on gh's process status alone: some GitHub check combinations
  # can return zero even when the JSON payload contains a failed check.
  ((checks_exit == 0)) || die "GitHub CLI could not confirm a passing required-check result"
  break
done

if [[ "$dry_run" == true ]]; then
  printf 'Dry run complete: PR #%s is eligible for approval.\n' "$pr_number"
  exit 0
fi

gh pr review "$target" "${repo_args[@]}" --approve --body "$message"
printf 'Approved PR #%s as @%s.\n' "$pr_number" "$viewer_login"
