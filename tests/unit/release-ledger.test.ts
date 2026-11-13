import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  parseChangelog,
  renderReleaseLedger,
  upsertWixPublicationEvidence,
  WIX_PUBLICATION_BEGIN,
  WIX_PUBLICATION_END,
} from '../../scripts/release-ledger';
import { releaseApiUrl, releaseUpdateApiUrl, updateReleaseRequest } from '../../scripts/record-wix-release';

const changelogFixture = `# Changelog

## [2.1.0](https://example.test/compare/v2.0.0...v2.1.0) (2026-11-13)

### Features

* **booking:** add a clear checkout summary ([#12](https://example.test/issues/12))

### Bug Fixes

* **i18n:** keep Arabic strings Arabic ([#13](https://example.test/issues/13))
`;
const wixReleaseWorkflow = readFileSync('.github/workflows/wix-release.yml', 'utf8');
const releasePleaseWorkflow = readFileSync('.github/workflows/release-please.yml', 'utf8');

const evidence = {
  tag: 'v2.1.0',
  commit: 'a'.repeat(40),
  publishedAt: '2026-11-13T13:00:00Z',
  siteUrl: 'https://headless-example.wix-site-host.com',
  workflowRunUrl: 'https://github.com/example/repo/actions/runs/123',
};

describe('release ledger', () => {
  it('renders the release notes as a customer-facing version ledger', () => {
    const parsed = parseChangelog(changelogFixture);
    expect(parsed).toEqual([
      {
        version: '2.1.0',
        date: '2026-11-13',
        sections: [
          { heading: 'Features', entries: ['**booking:** add a clear checkout summary (#12)'] },
          { heading: 'Bug Fixes', entries: ["**i18n:** keep Arabic strings Arabic (#13)"] },
        ],
      },
    ]);

    const ledger = renderReleaseLedger(parsed, 'example/repo');
    expect(ledger).toContain('### [v2.1.0](https://github.com/example/repo/releases/tag/v2.1.0)');
    expect(ledger).toContain('#### Features');
    expect(ledger).toContain('#### Bug Fixes');
    expect(ledger).toContain('Bookings, payments, coupons, members');
  });

  it('keeps the committed ledger synchronized with CHANGELOG.md', () => {
    const changelog = readFileSync('CHANGELOG.md', 'utf8');
    const ledger = readFileSync('RELEASES.md', 'utf8');
    expect(ledger).toBe(renderReleaseLedger(parseChangelog(changelog)));
  });

  it('writes one replaceable Wix publication record to a GitHub Release body', () => {
    const first = upsertWixPublicationEvidence('## Existing notes', evidence);
    const second = upsertWixPublicationEvidence(first, { ...evidence, publishedAt: '2026-11-13T14:00:00Z' });

    expect(second.match(new RegExp(WIX_PUBLICATION_BEGIN, 'g'))).toHaveLength(1);
    expect(second.match(new RegExp(WIX_PUBLICATION_END, 'g'))).toHaveLength(1);
    expect(second).toContain('2026-11-13T14:00:00.000Z');
    expect(second).toContain('Published and smoke-tested (`/`, `/book`, `/vouchers`)');
    expect(second).toContain('Business configuration | Not asserted');
  });

  it('targets only the release identified by its immutable SemVer tag', () => {
    expect(releaseApiUrl('hatan4ik/simdream-website', 'v2.1.0')).toBe(
      'https://api.github.com/repos/hatan4ik/simdream-website/releases/tags/v2.1.0'
    );
    expect(releaseUpdateApiUrl('hatan4ik/simdream-website', 42)).toBe(
      'https://api.github.com/repos/hatan4ik/simdream-website/releases/42'
    );
    expect(() => releaseUpdateApiUrl('hatan4ik/simdream-website', 0)).toThrow('GitHub Release id is invalid.');
    expect(updateReleaseRequest('Notes', evidence).body).toContain(WIX_PUBLICATION_BEGIN);
  });

  it('records evidence only after the public smoke test and regenerates the ledger in release candidates', () => {
    expect(wixReleaseWorkflow).toContain('contents: write');
    expect(wixReleaseWorkflow.indexOf('Smoke-check the published site')).toBeLessThan(
      wixReleaseWorkflow.indexOf('Record immutable publication evidence')
    );
    expect(wixReleaseWorkflow).toContain('npx tsx scripts/record-wix-release.ts');
    expect(wixReleaseWorkflow).toContain('release-publication.md');
    expect(releasePleaseWorkflow).toContain('Generate the release ledger in the release candidate');
    expect(releasePleaseWorkflow).toContain('npm run releases:generate');
  });
});
