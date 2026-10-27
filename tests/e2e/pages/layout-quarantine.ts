import type { Page } from '@playwright/test';

/**
 * Two known phone-layout defects make pages wider than the screen:
 *   E2E-15  the compact header row needs ~456px (Navbar.tsx:171);
 *   E2E-16  /book's root shrink-wraps the wizard's calendar, so the
 *           wizard is ~1056px wide (book/page.tsx:399 with
 *           KantorovichCalendarScheduler.tsx:628).
 * On Android Chrome the page then renders zoomed out (~37%), which also breaks
 * pointer hit-testing, so every mobile journey would fail for a layout reason
 * unrelated to what it checks. Journeys therefore run with this minimal
 * override; mobile.spec.ts asserts both defects on the real layout. Delete this
 * file once E2E-15 and E2E-16 are fixed (the override is then a no-op).
 */
const QUARANTINE_CSS = `
  nav .h-20 { flex-wrap: wrap; height: auto; row-gap: 0.5rem; padding-block: 0.5rem; }
  .flex-1.flex.flex-col > .max-w-7xl.mx-auto { width: 100%; }
`;

export async function quarantineKnownMobileLayoutDefects(page: Page): Promise<void> {
  await page.addInitScript((css: string) => {
    const inject = (): boolean => {
      if (!document.head) return false;
      if (!document.head.querySelector('style[data-e2e-quarantine]')) {
        const style = document.createElement('style');
        style.dataset.e2eQuarantine = 'E2E-15,E2E-16';
        style.textContent = css;
        document.head.append(style);
      }
      return true;
    };
    if (!inject()) {
      const observer = new MutationObserver(() => {
        if (inject()) observer.disconnect();
      });
      observer.observe(document, { childList: true, subtree: true });
    }
  }, QUARANTINE_CSS);
}
