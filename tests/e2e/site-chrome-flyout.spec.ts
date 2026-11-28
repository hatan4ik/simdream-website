import { expect, test } from './fixtures';

// The desktop header flyouts open on pointer entry, and `SiteChrome.primaryLink` finds a destination
// by hovering each trigger in turn. On a loaded CI runner WebKit needs 1 to 3.4 seconds for every
// hover and now and then never delivers one. The lookup then has to come round again, and it must
// not run out of budget doing so: on 2026-11-28 it did, twice on `main` and twice on pull requests
// ('"Location & Contact" did not appear in any header flyout'), each time passing on the retry.
//
// This reproduces those conditions without depending on the machine: every pointer move costs three
// seconds of main-thread time, and the first entry into the third trigger (the one that holds
// "Location & Contact") never reaches the page. Reaching that trigger a second time takes seven
// hovers, 21 seconds of pointer time alone, so a lookup bounded by a 20-second clock cannot pass;
// one bounded by passes over the triggers can.
test.describe('header flyout lookup with a slow pointer and one lost hover', () => {
  test('still finds the destination in the third flyout', async ({ page, chrome, isMobile }) => {
    test.skip(isMobile, 'Phone projects use the touch drawer, not the desktop flyouts.');
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.addInitScript(() => {
      const HOVER_COST_MS = 3_000;
      const state = { armed: true, swallowing: false, lost: 0 };
      (window as unknown as { __flyoutHoverTest: typeof state }).__flyoutHoverTest = state;
      const isThirdTrigger = (target: EventTarget | null) => {
        const third = document.querySelectorAll('button[data-navbar-menu-trigger]')[2];
        return Boolean(third) && target instanceof Node && third.contains(target);
      };
      // React derives onMouseEnter from the pointer leaving the previous element (mouseout with a
      // relatedTarget) and, when it arrives from outside the page, from mouseover. Losing an entry
      // therefore means losing both, in their pointer and mouse forms.
      const entersThirdTrigger = (event: MouseEvent) =>
        event.type.endsWith('over') ? isThirdTrigger(event.target) : isThirdTrigger(event.relatedTarget) && !isThirdTrigger(event.target);
      for (const type of ['pointerout', 'mouseout', 'pointerover', 'mouseover'] as const) {
        window.addEventListener(
          type,
          (event) => {
            if (!state.armed || !entersThirdTrigger(event)) return;
            if (!state.swallowing) {
              state.swallowing = true;
              state.lost += 1;
            }
            event.stopImmediatePropagation();
          },
          true
        );
      }
      window.addEventListener(
        'mousemove',
        () => {
          // The lost entry ends with its pointer move; every later entry is delivered.
          if (state.swallowing) {
            state.swallowing = false;
            state.armed = false;
          }
          const until = performance.now() + HOVER_COST_MS;
          while (performance.now() < until) {
            /* burn main-thread time, as a loaded runner does */
          }
        },
        true
      );
    });
    await page.goto('/');

    const link = await chrome.primaryLink('Location & Contact');

    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/contact');
    const lost = await page.evaluate(() => (window as unknown as { __flyoutHoverTest: { lost: number } }).__flyoutHoverTest.lost);
    expect(lost, 'exactly one hover into the third trigger was lost').toBe(1);
  });
});
