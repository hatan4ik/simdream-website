import type { Page } from '@playwright/test';

export interface TextRunContrast {
  text: string;
  /** WCAG 2.x contrast ratio of the run's colour against the colours actually painted behind it. */
  ratio: number;
}

export interface SurfaceContrast {
  /** The colour painted at the surface: the surface and its translucent ancestors composited. */
  backdrop: string;
  /** WCAG relative luminance of `backdrop` (0 black, 1 white). */
  luminance: number;
  runs: TextRunContrast[];
}

/**
 * Measures the surface that matches `selector` the way a person sees it, not the way axe can:
 * axe reports a translucent panel laid over page content as "incomplete" (background colour could
 * not be determined) and never flags it, so a near-black menu with dark daylight ink passed the
 * whole accessibility suite. This composites every translucent background up the ancestor chain
 * (any CSS colour syntax: rgb, lab, oklab ...) and checks each visible text run against it.
 */
export async function measureSurfaceContrast(page: Page, selector: string): Promise<SurfaceContrast> {
  return page.locator(selector).evaluate((surface) => {
    type Rgba = [number, number, number, number];
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('2D canvas is unavailable');

    /** Any CSS colour as sRGB: the canvas does the conversion that getComputedStyle leaves to the author. */
    const parse = (css: string): Rgba => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = css;
      context.fillRect(0, 0, 1, 1);
      const data = context.getImageData(0, 0, 1, 1).data;
      return [data[0]!, data[1]!, data[2]!, data[3]! / 255];
    };
    const over = (top: Rgba, bottom: Rgba): Rgba => {
      const alpha = top[3];
      return [
        top[0] * alpha + bottom[0] * (1 - alpha),
        top[1] * alpha + bottom[1] * (1 - alpha),
        top[2] * alpha + bottom[2] * (1 - alpha),
        1,
      ];
    };
    const luminanceOf = (rgb: Rgba): number => {
      const [r, g, b] = rgb.slice(0, 3).map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      }) as [number, number, number];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const backdropOf = (element: Element): Rgba => {
      const layers: Rgba[] = [];
      for (let node: Element | null = element; node; node = node.parentElement) {
        const color = parse(getComputedStyle(node).backgroundColor);
        if (color[3] > 0) layers.push(color);
        if (color[3] === 1) break;
      }
      // Nothing opaque up the chain: the browser canvas is white.
      return layers.reverse().reduce<Rgba>((below, layer) => over(layer, below), [255, 255, 255, 1]);
    };
    const ratioOf = (a: Rgba, b: Rgba): number => {
      const [la, lb] = [luminanceOf(a), luminanceOf(b)];
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };

    const backdrop = backdropOf(surface);
    const runs: TextRunContrast[] = [];
    const checked = new Set<Element>();
    const walker = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = (node.textContent ?? '').trim();
      const element = node.parentElement;
      if (!text || !element || checked.has(element) || element.getClientRects().length === 0) continue;
      checked.add(element);
      const background = backdropOf(element);
      const foreground = over(parse(getComputedStyle(element).color), background);
      runs.push({ text: text.slice(0, 40), ratio: Math.round(ratioOf(foreground, background) * 100) / 100 });
    }
    return {
      backdrop: `rgb(${backdrop.slice(0, 3).map(Math.round).join(', ')})`,
      luminance: Math.round(luminanceOf(backdrop) * 1000) / 1000,
      runs,
    };
  });
}
