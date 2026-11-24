import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// .claude/hooks/block-main-commit.sh must block a real `git commit` whose TARGET repository is on main,
// and nothing else. It used to match the words "git commit" anywhere in the command text and then read
// the branch of the shell's starting directory, so it blocked work in a clone on a devel/ branch while
// the main checkout was on main (2026-11-24).
const HOOK = resolve(process.cwd(), '.claude/hooks/block-main-commit.sh');

let root: string;
let onMain: string;
let onDevel: string;

function initRepo(directory: string, branch: string) {
  execFileSync('git', ['init', '-q', '-b', branch, directory]);
}

function runHook(command: string, cwd: string, extra: Record<string, unknown> = {}) {
  const input = JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd, tool_input: { command }, ...extra });
  return spawnSync('bash', [HOOK], { input, encoding: 'utf8' });
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'main-commit-hook-'));
  onMain = join(root, 'on-main');
  onDevel = join(root, 'on-devel');
  initRepo(onMain, 'main');
  initRepo(onDevel, 'devel/topic');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('block-main-commit hook', () => {
  it('blocks a commit when the shell runs in a repository on main', () => {
    const result = runHook('git commit -m "x"', onMain);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Blocked: committing on main');
  });

  it('allows a commit on a devel branch', () => {
    expect(runHook('git commit -m "x"', onDevel).status).toBe(0);
  });

  it('judges the repository the commit targets (-C), not the directory the shell starts in', () => {
    expect(runHook(`git -C ${onDevel} commit -m "x"`, onMain).status).toBe(0);
    expect(runHook(`git -C ${onMain} commit -m "x"`, onDevel).status).toBe(2);
    expect(runHook(`git -C "${onMain}" -c user.name=a commit -m "x"`, onDevel).status).toBe(2);
  });

  it('follows a preceding cd and simple variable assignments', () => {
    expect(runHook(`cd ${onMain} && git commit -m "x"`, onDevel).status).toBe(2);
    expect(runHook(`cd ${onDevel} && git commit -m "x"`, onMain).status).toBe(0);
    expect(runHook(`D=${onMain}; git -C $D commit -m "x"`, onDevel).status).toBe(2);
    expect(runHook(`D=${onDevel}; git -C "$D" add a && git -C $D commit -m "x"`, onMain).status).toBe(0);
  });

  it('catches a commit later in a chained command', () => {
    expect(runHook('git add -A && git commit -m "x"', onMain).status).toBe(2);
    expect(runHook('npm test; git commit -m "x"', onMain).status).toBe(2);
  });

  it('does not react to the words "git commit" in text, messages or heredocs', () => {
    expect(runHook('echo "remember to run git commit later"', onMain).status).toBe(0);
    expect(runHook('python3 - <<EOF\nprint("the hook matches `git commit` text")\nEOF', onMain).status).toBe(0);
    expect(runHook('gh pr create --title "stop blocking git commit" --body "git commit"', onMain).status).toBe(0);
    expect(runHook('grep -rn "git commit" docs', onMain).status).toBe(0);
  });

  it('ignores other git commands and unrelated commands', () => {
    expect(runHook('git status', onMain).status).toBe(0);
    expect(runHook('git log --oneline -3', onMain).status).toBe(0);
    expect(runHook('npm run build', onMain).status).toBe(0);
  });

  it('allows what it cannot resolve; .githooks/pre-commit is the backstop', () => {
    expect(runHook('git -C $UNKNOWN commit -m "x"', onMain).status).toBe(0);
    expect(runHook('git commit -m "x"', join(root, 'does-not-exist')).status).toBe(0);
    expect(runHook(`git -C ${join(root, 'nope')} commit -m "x"`, onMain).status).toBe(0);
  });

  it('survives malformed input', () => {
    const result = spawnSync('bash', [HOOK], { input: 'not json commit', encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(spawnSync('bash', [HOOK], { input: '', encoding: 'utf8' }).status).toBe(0);
  });
});
