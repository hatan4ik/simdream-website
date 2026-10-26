import { expect, test } from '@playwright/test';
import { readBaseline } from './support/baseline-store';
import { allScanKeys, BASELINED_RULE_DEFECTS } from './support/scan-keys';

// Pure data checks on tests/a11y/a11y-baseline.json; no browser page is needed.

test('lists exactly the scan keys the a11y specs produce', () => {
  const baselined = Object.keys(readBaseline().scans).sort();

  expect(baselined).toEqual(allScanKeys().sort());
});

test('tolerates only axe rules that map to a tracked known defect', () => {
  const untracked = Object.entries(readBaseline().scans).flatMap(([scanKey, rules]) =>
    rules.filter((rule) => !(rule in BASELINED_RULE_DEFECTS)).map((rule) => `${scanKey}: ${rule}`)
  );

  expect(untracked).toEqual([]);
});
