#!/usr/bin/env bash
# PreToolUse hook for Bash. AGENTS.md section 0: never work on main.
# Blocks a real `git commit` whose TARGET repository is on main. The target is resolved from the command
# itself (`git -C <dir>`, a preceding `cd <dir>`, simple `VAR=dir` assignments), falling back to the
# directory the tool call runs in. Words like "git commit" inside quoted text, heredocs or messages do not
# count. Pushes to main are denied in settings.json, and .githooks/pre-commit refuses a commit on main
# whatever this hook does, so a command it cannot resolve is allowed here (the backstop catches it).
input=$(cat)
case "$input" in
  *commit*) ;;
  *) exit 0 ;;
esac

# Prints one target directory per `git commit` found in the command. No output means nothing to check.
targets=$(printf '%s' "$input" | python3 -I -c '
import json, os, re, sys

try:
    data = json.load(sys.stdin)
    command = (data.get("tool_input") or {}).get("command") or ""
except Exception:
    sys.exit(0)
if not command:
    sys.exit(0)

base = data.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
boundary = r"(?:^|[;&|(\n]|\$\()\s*"
word = r"(?:\"[^\"]*\"|\x27[^\x27]*\x27|[^\s;&|()]+)"
commit = re.compile(
    boundary + r"(?:\w+=" + word + r"\s+)*git((?:\s+(?:-C\s+" + word + r"|-c\s+" + word + r"|--[\w-]+(?:=\S+)?|-[A-Za-z]))*)\s+commit\b",
    re.M,
)
cd = re.compile(boundary + r"cd\s+(" + word + r")", re.M)
assign = re.compile(boundary + r"(?:export\s+)?(\w+)=(" + word + r")", re.M)

def unquote(token):
    if len(token) >= 2 and token[0] == token[-1] and token[0] in "\"\x27":
        return token[1:-1]
    return token

def resolve(path, variables):
    path = unquote(path)
    for name, value in variables.items():
        path = path.replace("${" + name + "}", value).replace("$" + name, value)
    return os.path.expanduser(path)

for match in commit.finditer(command):
    before = command[: match.start()]
    variables = {n: unquote(v) for n, v in assign.findall(before)}
    directory = base
    for token in cd.findall(before):
        step = resolve(token, variables)
        if "$" in step or "`" in step:
            directory = None
            break
        directory = step if os.path.isabs(step) else os.path.join(directory, step)
    if directory is not None:
        for option in re.finditer(r"-C\s+(" + word + r")", match.group(1)):
            step = resolve(option.group(1), variables)
            if "$" in step or "`" in step:
                directory = None
                break
            directory = step if os.path.isabs(step) else os.path.join(directory, step)
    if directory:
        print(directory)
' 2>/dev/null)

[ -n "$targets" ] || exit 0
while IFS= read -r dir; do
  [ -d "$dir" ] || continue
  branch=$(git -C "$dir" symbolic-ref --short -q HEAD 2>/dev/null)
  if [ "$branch" = "main" ]; then
    echo "Blocked: committing on main in $dir. Cut a branch first: git fetch origin && git switch -c devel/<topic> origin/main (AGENTS.md section 0)." >&2
    exit 2
  fi
done <<EOF
$targets
EOF
exit 0
