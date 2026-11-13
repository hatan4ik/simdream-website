import { writeFile } from 'node:fs/promises';
import { upsertWixPublicationEvidence, type WixPublicationEvidence } from './release-ledger';

const TAG_PATTERN = /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const SHA_PATTERN = /^[a-f0-9]{40}$/;
const REPOSITORY_PATTERN = /^[\w.-]+\/[\w.-]+$/;

function option(args: string[], name: string): string {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value || value.startsWith('--')) throw new Error(`Missing ${name}.`);
  return value;
}

function assertHttpsWixUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.wix-site-host.com') || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Wix site URL must be an HTTPS wix-site-host.com origin.');
  }
  return url.toString().replace(/\/$/, '');
}

function assertIsoTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.valueOf())) throw new Error('Published time must be ISO-8601.');
  return timestamp.toISOString();
}

export function releaseApiUrl(repository: string, tag: string): string {
  return `https://api.github.com/repos/${repository}/releases/tags/${encodeURIComponent(tag)}`;
}

export function releaseUpdateApiUrl(repository: string, releaseId: number): string {
  if (!Number.isSafeInteger(releaseId) || releaseId < 1) throw new Error('GitHub Release id is invalid.');
  return `https://api.github.com/repos/${repository}/releases/${releaseId}`;
}

export function updateReleaseRequest(body: string, evidence: WixPublicationEvidence): { body: string } {
  return { body: upsertWixPublicationEvidence(body, evidence) };
}

interface GitHubRelease {
  id: number;
  body: string | null;
}

async function githubRequest(url: string, token: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/vnd.github+json');
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('X-GitHub-Api-Version', '2022-11-28');

  return fetch(url, {
    ...init,
    headers,
  });
}

export async function recordWixRelease(args: string[]): Promise<void> {
  const tag = option(args, '--tag');
  const commit = option(args, '--commit');
  const publishedAt = assertIsoTimestamp(option(args, '--published-at'));
  const siteUrl = assertHttpsWixUrl(option(args, '--site-url'));
  const output = option(args, '--output');
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GH_TOKEN;
  const runId = process.env.GITHUB_RUN_ID;
  const serverUrl = process.env.GITHUB_SERVER_URL ?? 'https://github.com';

  if (!TAG_PATTERN.test(tag)) throw new Error('Release tag must be SemVer and start with v.');
  if (!SHA_PATTERN.test(commit)) throw new Error('Release commit must be a 40-character lowercase SHA.');
  if (!repository || !REPOSITORY_PATTERN.test(repository)) throw new Error('GITHUB_REPOSITORY is invalid.');
  if (!token) throw new Error('GH_TOKEN is required to update the GitHub Release.');
  if (!runId || !/^\d+$/.test(runId)) throw new Error('GITHUB_RUN_ID is invalid.');

  const evidence: WixPublicationEvidence = {
    tag,
    commit,
    publishedAt,
    siteUrl,
    workflowRunUrl: `${serverUrl}/${repository}/actions/runs/${runId}`,
  };
  const url = releaseApiUrl(repository, tag);
  const current = await githubRequest(url, token);
  if (!current.ok) throw new Error(`Unable to read GitHub Release for ${tag}: HTTP ${current.status}.`);
  const release = (await current.json()) as GitHubRelease;
  const update = await githubRequest(releaseUpdateApiUrl(repository, release.id), token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateReleaseRequest(release.body ?? '', evidence)),
  });
  if (!update.ok) throw new Error(`Unable to update GitHub Release for ${tag}: HTTP ${update.status}.`);

  await writeFile(output, `${upsertWixPublicationEvidence('', evidence)}\n`);
}

if (process.argv[1]?.endsWith('record-wix-release.ts')) {
  recordWixRelease(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
