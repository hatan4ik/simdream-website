import type { Page } from '@playwright/test';

export interface OverflowReport {
  documentWidth: number;
  viewportWidth: number;
  /** Outermost visible elements that stick out of the viewport and cannot be scrolled to. */
  offenders: string[];
}

/**
 * Measures horizontal overflow. The site sets `overflow-x: hidden` on <body>, which hides
 * the scrollbar but not the problem: content past the edge is simply cut off. Elements
 * inside their own horizontally scrolling/clipping container (the 14-day strip) are fine.
 */
export async function measureHorizontalOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const sticksOut = (box: DOMRect) => box.right > viewportWidth + 1 || box.left < -1;
    const offenders: Element[] = [];
    for (const element of document.body.querySelectorAll('*')) {
      if (!element.checkVisibility()) continue;
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0 || !sticksOut(box)) continue;
      let contained = false;
      for (let ancestor = element.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
        if (getComputedStyle(ancestor).overflowX !== 'visible' && !sticksOut(ancestor.getBoundingClientRect())) {
          contained = true;
          break;
        }
      }
      if (!contained && !offenders.some((offender) => offender.contains(element))) offenders.push(element);
    }
    const describe = (element: Element) => {
      const box = element.getBoundingClientRect();
      const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
      return `<${element.tagName.toLowerCase()}> x=${Math.round(box.left)}..${Math.round(box.right)} "${text}"`;
    };
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth,
      offenders: offenders.slice(0, 8).map(describe),
    };
  });
}

/**
 * Lists visible interactive targets smaller than `minimum` CSS px that also fail the
 * WCAG 2.5.8 spacing exception: a `minimum`-diameter circle centred on the target must not
 * intersect another target or another undersized target's circle. Inline links inside a
 * sentence are exempt (WCAG "inline" exception); off-screen targets are reported by the
 * overflow checks instead.
 */
export async function findUndersizedTargets(page: Page, minimum = 24): Promise<string[]> {
  return page.evaluate((min) => {
    const selector =
      'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="tab"], [tabindex]:not([tabindex="-1"])';
    const viewportWidth = document.documentElement.clientWidth;
    const targets = [...document.querySelectorAll<HTMLElement>(selector)].filter((element) => {
      if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
      if ((element as HTMLButtonElement).disabled || element.closest('[aria-hidden="true"], [inert]')) return false;
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.left < viewportWidth && box.right > 0;
    });
    const boxes = targets.map((element) => element.getBoundingClientRect());
    const undersized = boxes.map((box) => box.width < min - 0.5 || box.height < min - 0.5);
    const isInlineInSentence = (element: HTMLElement) =>
      getComputedStyle(element).display === 'inline' &&
      (element.parentElement?.textContent ?? '').trim().length > (element.textContent ?? '').trim().length;

    const failures: string[] = [];
    targets.forEach((element, index) => {
      if (!undersized[index] || isInlineInSentence(element)) return;
      const box = boxes[index];
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const conflicts = targets.some((other, otherIndex) => {
        if (otherIndex === index || element.contains(other)) return false;
        const otherBox = boxes[otherIndex];
        const dx = Math.max(otherBox.left - cx, 0, cx - otherBox.right);
        const dy = Math.max(otherBox.top - cy, 0, cy - otherBox.bottom);
        if (Math.hypot(dx, dy) < min / 2) return true;
        if (!undersized[otherIndex]) return false;
        const ox = otherBox.left + otherBox.width / 2;
        const oy = otherBox.top + otherBox.height / 2;
        return Math.hypot(ox - cx, oy - cy) < min;
      });
      if (conflicts) {
        const name = (element.getAttribute('aria-label') ?? element.textContent ?? '').replace(/\s+/g, ' ').trim();
        failures.push(`<${element.tagName.toLowerCase()}> ${Math.round(box.width)}x${Math.round(box.height)} "${name.slice(0, 40)}"`);
      }
    });
    return failures;
  }, minimum);
}
