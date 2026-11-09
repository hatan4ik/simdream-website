#!/usr/bin/env bash
# One-time owner setup for GOOGLE_PLACES_API_KEY (docs/GITHUB_PR_AUTOMATION.md, "One-time setup").
#
# Creates (or reuses) a Google Cloud API key restricted to Places API (New), stores it as the
# GitHub repository secret the weekly "Refresh Google rating" workflow reads, optionally stores it
# as a Wix secret server variable for live /api/reviews data on the Wix-managed deployment, and
# starts the first refresh run. The key string is piped between tools and never printed or logged.
#
#   gcloud auth login                                   # the one interactive step (your browser)
#   scripts/setup-google-places-key.sh --project <GCP_PROJECT_ID> [--wix-env] [--no-run]
#
# Requirements: gcloud (brew install --cask google-cloud-sdk), gh (logged in to the repository),
# a Google Cloud project with billing enabled (Places API (New) does not serve without billing).
# Idempotent: an existing key named "simdream-places" is reused and re-restricted, never duplicated.
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-hatan4ik/simdream-website}"
KEY_DISPLAY_NAME='simdream-places'
SECRET_NAME='GOOGLE_PLACES_API_KEY'
PLACES_SERVICE='places.googleapis.com'
WORKFLOW_FILE='google-rating-refresh.yml'

project=''
wix_env=false
run_workflow=true
while [ $# -gt 0 ]; do
  case "$1" in
    --project) project="${2:-}"; shift 2 ;;
    --wix-env) wix_env=true; shift ;;
    --no-run) run_workflow=false; shift ;;
    -h|--help) sed -n '2,14p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing $1. $2" >&2; exit 1; }; }
need gcloud 'Install with: brew install --cask google-cloud-sdk'
need gh 'Install with: brew install gh'

account="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null || true)"
test -n "$account" || { echo 'No active Google account. Run: gcloud auth login' >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo 'gh is not logged in. Run: gh auth login' >&2; exit 1; }

if [ -z "$project" ]; then
  project="$(gcloud config get-value project 2>/dev/null || true)"
fi
test -n "$project" || { echo 'No project. Pass --project <GCP_PROJECT_ID> (a project with billing enabled).' >&2; exit 1; }
gcloud config set project "$project" --quiet >/dev/null

billing="$(gcloud billing projects describe "$project" --format='value(billingEnabled)' 2>/dev/null || echo 'unknown')"
if [ "$billing" != 'True' ]; then
  echo "Project $project has no billing enabled (billingEnabled=$billing). Places API (New) requires billing;" >&2
  echo 'link a billing account in the Cloud console (Billing → Link a billing account) and re-run.' >&2
  exit 1
fi

echo "Enabling $PLACES_SERVICE and the API Keys service on $project…"
gcloud services enable "$PLACES_SERVICE" apikeys.googleapis.com --quiet

key_name="$(gcloud services api-keys list --filter="displayName=$KEY_DISPLAY_NAME" --format='value(name)' | head -1)"
if [ -z "$key_name" ]; then
  echo "Creating API key '$KEY_DISPLAY_NAME' restricted to $PLACES_SERVICE…"
  key_name="$(gcloud services api-keys create --display-name="$KEY_DISPLAY_NAME" \
    --api-target="service=$PLACES_SERVICE" --format='value(response.name)' --quiet)"
else
  echo "Reusing API key '$KEY_DISPLAY_NAME'; enforcing the $PLACES_SERVICE restriction…"
  gcloud services api-keys update "$key_name" --api-target="service=$PLACES_SERVICE" --quiet >/dev/null
fi
test -n "$key_name" || { echo 'Could not resolve the API key resource name.' >&2; exit 1; }

# No application restriction: GitHub runners and the Wix Worker have no fixed IP (docs/GITHUB_PR_AUTOMATION.md).
echo "Storing the key as the $REPO repository secret $SECRET_NAME…"
gcloud services api-keys get-key-string "$key_name" --format='value(keyString)' \
  | tr -d '\n' | gh secret set "$SECRET_NAME" --repo "$REPO"

if [ "$wix_env" = true ]; then
  # Secret server variable on Wix's servers for the Wix-managed deployment (wix env set; backend only).
  # The Wix CLI takes the value as an argument, so this step is opt-in and runs only on your machine.
  echo "Storing the key as a Wix secret server variable $SECRET_NAME…"
  npx --yes @wix/cli@1.2.9 env set --key "$SECRET_NAME" \
    --value "$(gcloud services api-keys get-key-string "$key_name" --format='value(keyString)' | tr -d '\n')"
fi

if [ "$run_workflow" = true ]; then
  echo "Starting the first 'Refresh Google rating' run…"
  gh workflow run "$WORKFLOW_FILE" --repo "$REPO"
  echo "Watch it: gh run list --repo $REPO --workflow $WORKFLOW_FILE --limit 1"
  echo "It opens one rolling pull request on branch automation/google-rating; you merge it yourself."
fi

echo "Done. The key string was never displayed; rotate it in Google Cloud → APIs & Services → Credentials if needed."
