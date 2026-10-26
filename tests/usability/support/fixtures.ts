import { test as harnessTest } from '../../support/e2e';

export { expect } from '../../support/e2e';

/** React production hydration-mismatch errors (#418 text, #423 root recovery, #425 text content). */
export const HYDRATION_MISMATCH_ERROR = /Minified React error #(418|423|425)\b/;

/**
 * The shared quality-suite test. It used to tolerate hydration mismatches while UX-16
 * (time-dependent text prerendered at build time) was open; that is fixed, so the strict
 * uncaught-exception guard from tests/support/e2e.ts applies here like everywhere else.
 */
export const test = harnessTest;
