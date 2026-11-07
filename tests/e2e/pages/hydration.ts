import type { Locator } from '@playwright/test';
import { expect } from '../../support/e2e';

/**
 * Resolves once React has hydrated `control`, i.e. its event handlers are
 * attached. Before that a click on a server-rendered button does nothing and a
 * submit falls back to a native page reload, which makes journeys flaky under
 * load. React stores the props of every hydrated node under `__reactProps$*`.
 */
export async function waitUntilInteractive(control: Locator): Promise<void> {
  await expect
    .poll(
      () => control.evaluate((element) => Object.keys(element).some((key) => key.startsWith('__reactProps$'))),
      // A synchronisation point, not a behaviour check: hydration time depends on machine load.
      { message: 'React should hydrate the control before the journey uses it', timeout: 30_000 }
    )
    .toBe(true);
}

/** Clicks (or taps) `control` once React owns it, so the action is never swallowed by hydration. */
export async function activate(control: Locator, how: 'click' | 'tap' = 'click'): Promise<void> {
  await waitUntilInteractive(control);
  await (how === 'tap' ? control.tap() : control.click());
}

/**
 * Next.js commits a client-side navigation (and only then updates the URL)
 * once the target route's payload has arrived, which takes seconds on a
 * loaded runner; the wait is a synchronisation point, not a speed check.
 */
const NAVIGATION_TIMEOUT_MS = 30_000;

/**
 * Follows a real link like a visitor and waits until the browser is on `url`.
 *
 * Next links are only followed after their client handler is attached. Under a loaded
 * browser runner, a click that lands during hydration can be intercepted before the
 * router has completed its handoff, leaving the visitor on the current page. Waiting
 * for the interactive contract turns this into the same one-click journey a customer
 * receives after the page is ready.
 */
export async function follow(link: Locator, url: string | RegExp, how: 'click' | 'tap' = 'click'): Promise<void> {
  const page = link.page();
  await waitUntilInteractive(link);
  const arrived = page.waitForURL(url, { timeout: NAVIGATION_TIMEOUT_MS });
  await (how === 'tap' ? link.tap() : link.click());
  await arrived;
}
