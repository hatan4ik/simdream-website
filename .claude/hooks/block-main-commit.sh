#!/usr/bin/env bash
# PreToolUse hook for Bash. AGENTS.md section 0: never work on main.
# Blocks `git commit` while the current branch is main; pushes to main are denied in settings.json.
input=$(cat)
case "$input" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac
branch=$(git symbolic-ref --short -q HEAD 2>/dev/null)
if [ "$branch" = "main" ]; then
  echo "Blocked: committing on main. Cut a branch first: git fetch origin && git switch -c devel/<topic> origin/main (AGENTS.md section 0)." >&2
  exit 2
fi
exit 0
