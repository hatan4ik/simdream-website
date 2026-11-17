import { describe, expect, it } from 'vitest';
import { evaluateAudit } from '../../scripts/audit-gate.mjs';

const advisory = (id: string, severity: string, name = 'picomatch') => ({
  source: 1,
  name,
  title: `${name} problem`,
  url: `https://github.com/advisories/${id}`,
  severity,
});
const report = (...via: object[]) => ({ vulnerabilities: { picomatch: { via }, fdir: { via: ['picomatch'] } } });
const EXCEPTIONS = [{ advisory: 'GHSA-aaaa-aaaa-aaaa', reason: 'dev only', expires: '2026-12-17' }];

describe('audit gate', () => {
  it('lets the one excepted advisory through before it expires', () => {
    const result = evaluateAudit(report(advisory('GHSA-aaaa-aaaa-aaaa', 'high')), '2026-11-17', EXCEPTIONS);
    expect(result.ok).toBe(true);
    expect(result.excused).toHaveLength(1);
  });

  it('still blocks any other high advisory', () => {
    const result = evaluateAudit(
      report(advisory('GHSA-aaaa-aaaa-aaaa', 'high'), advisory('GHSA-bbbb-bbbb-bbbb', 'critical', 'other')),
      '2026-11-17',
      EXCEPTIONS
    );
    expect(result.ok).toBe(false);
    expect(result.blocking[0]).toContain('GHSA-bbbb-bbbb-bbbb');
  });

  it('ignores moderate advisories like npm audit --audit-level=high does', () => {
    expect(evaluateAudit(report(advisory('GHSA-cccc-cccc-cccc', 'moderate')), '2026-11-17', []).ok).toBe(true);
  });

  it('fails once the exception has expired', () => {
    const result = evaluateAudit(report(advisory('GHSA-aaaa-aaaa-aaaa', 'high')), '2026-12-18', EXCEPTIONS);
    expect(result.ok).toBe(false);
    expect(result.problems[0]).toContain('expired');
  });

  it('fails when the excepted advisory is gone, so the exception gets deleted', () => {
    const result = evaluateAudit(report(), '2026-11-17', EXCEPTIONS);
    expect(result.ok).toBe(false);
    expect(result.problems[0]).toContain('no longer matches');
  });
});
