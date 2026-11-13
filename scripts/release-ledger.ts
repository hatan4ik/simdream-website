import { readFile, writeFile } from 'node:fs/promises';

const DEFAULT_REPOSITORY = 'hatan4ik/simdream-website';

export interface ReleaseChangeSection {
  heading: string;
  entries: string[];
}

export interface ReleaseChange {
  version: string;
  date: string;
  sections: ReleaseChangeSection[];
}

export interface WixPublicationEvidence {
  tag: string;
  commit: string;
  publishedAt: string;
  siteUrl: string;
  workflowRunUrl: string;
}

export const WIX_PUBLICATION_BEGIN = '<!-- simdream-wix-publication:begin -->';
export const WIX_PUBLICATION_END = '<!-- simdream-wix-publication:end -->';

function plainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function compareVersionsDescending(left: string, right: string): number {
  const parse = (value: string) => value.split('.').map((part) => Number.parseInt(part, 10));
  const leftParts = parse(left);
  const rightParts = parse(right);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const difference = (rightParts[index] ?? 0) - (leftParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function parseChangelog(changelog: string): ReleaseChange[] {
  const header = /^## \[([^\]]+)\]\([^\n]+\) \((\d{4}-\d{2}-\d{2})\)\s*$/gm;
  const matches = [...changelog.matchAll(header)];

  return matches.map((match, index) => {
    const version = match[1];
    const date = match[2];
    if (!version || !date || match.index === undefined) {
      throw new Error('CHANGELOG.md contains an invalid release heading.');
    }

    const bodyStart = match.index + match[0].length;
    const bodyEnd = matches[index + 1]?.index ?? changelog.length;
    const body = changelog.slice(bodyStart, bodyEnd);
    const sections: ReleaseChangeSection[] = [];
    let current: ReleaseChangeSection | undefined;

    for (const line of body.split('\n')) {
      const section = /^###\s+(.+?)\s*$/.exec(line);
      if (section) {
        current = { heading: section[1], entries: [] };
        sections.push(current);
        continue;
      }

      const entry = /^\*\s+(.+?)\s*$/.exec(line);
      if (entry && current) current.entries.push(plainText(entry[1]));
    }

    return { version, date, sections: sections.filter((section) => section.entries.length > 0) };
  });
}

function releaseUrl(repository: string, version: string): string {
  return `https://github.com/${repository}/releases/tag/v${version}`;
}

export function renderReleaseLedger(releases: ReleaseChange[], repository = DEFAULT_REPOSITORY): string {
  const ordered = [...releases].sort((left, right) => compareVersionsDescending(left.version, right.version));
  const releaseSections = ordered
    .map((release) => {
      const changes = release.sections
        .map((section) => `#### ${section.heading}\n\n${section.entries.map((entry) => `- ${entry}`).join('\n')}`)
        .join('\n\n');

      return [
        `### [v${release.version}](${releaseUrl(repository, release.version)}) — ${release.date}`,
        '',
        changes || '_No customer-facing changes were recorded for this version._',
        '',
        `Deployment evidence: [GitHub Release](${releaseUrl(repository, release.version)}).`,
      ].join('\n');
    })
    .join('\n\n');

  return `# SimDream Release Ledger

> Generated from [CHANGELOG.md](CHANGELOG.md) by \`npm run releases:generate\`. Do not edit by hand.

## What this proves

- Each entry is an immutable SemVer release tag and its customer-facing feature or bug-fix summary.
- Releases created after this ledger is introduced receive a Wix publication record only after the protected release job succeeds. That record includes the deployed tag commit, UTC publish time, Wix URL, workflow evidence, and the public-route smoke-test result. Earlier versions retain their GitHub Release and workflow history; this document never infers a deployment merely from a tag.
- A Wix frontend publication does **not** claim that Wix Bookings, payments, coupons, members, or other business settings were activated. Their operational state is deliberately recorded as **not asserted** unless a separately controlled process verifies it.

## Product changes by version

${releaseSections}
`;
}

function requiredOption(args: string[], name: string): string {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value || value.startsWith('--')) throw new Error(`Missing ${name}.`);
  return value;
}

function assertValidOutput(value: string): void {
  if (value !== 'RELEASES.md') throw new Error('The generated ledger must be written to RELEASES.md.');
}

export async function runReleaseLedger(args: string[]): Promise<void> {
  const check = args.includes('--check');
  const output = args.includes('--output') ? requiredOption(args, '--output') : 'RELEASES.md';
  assertValidOutput(output);

  const generated = renderReleaseLedger(parseChangelog(await readFile('CHANGELOG.md', 'utf8')));
  if (check) {
    const current = await readFile(output, 'utf8');
    if (current !== generated) throw new Error(`${output} is stale. Run npm run releases:generate.`);
    return;
  }

  await writeFile(output, generated);
}

export function renderWixPublicationEvidence(evidence: WixPublicationEvidence): string {
  const publishedAt = new Date(evidence.publishedAt);
  if (Number.isNaN(publishedAt.valueOf())) throw new Error('Publication time must be a valid ISO-8601 timestamp.');

  return [
    WIX_PUBLICATION_BEGIN,
    '## Wix publication record',
    '',
    '| Field | Evidence |',
    '| --- | --- |',
    `| Release tag | \`${evidence.tag}\` |`,
    `| Tag commit | \`${evidence.commit}\` |`,
    `| Published (UTC) | ${publishedAt.toISOString()} |`,
    '| Result | Published and smoke-tested (`/`, `/book`, `/vouchers`) |',
    `| Wix site | ${evidence.siteUrl} |`,
    `| Workflow evidence | ${evidence.workflowRunUrl} |`,
    '| Business configuration | Not asserted: this workflow does not activate or inspect Bookings, payments, coupons, members, or other Wix business settings. |',
    WIX_PUBLICATION_END,
  ].join('\n');
}

export function upsertWixPublicationEvidence(releaseBody: string, evidence: WixPublicationEvidence): string {
  const record = renderWixPublicationEvidence(evidence);
  const pattern = new RegExp(`${WIX_PUBLICATION_BEGIN}[\\s\\S]*?${WIX_PUBLICATION_END}\\n*`, 'g');
  const withoutExisting = releaseBody.replace(pattern, '').trimEnd();
  return `${withoutExisting}${withoutExisting ? '\n\n' : ''}${record}\n`;
}

if (process.argv[1]?.endsWith('release-ledger.ts')) {
  runReleaseLedger(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
