import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { getAllBlogPosts } from '@/lib/data/blog-posts';
import { FLIGHT_ADDONS, SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import lastKnownRating from '@/lib/reviews/last-known-rating.json';
import { buildLlmsTxt, LLMS_TXT_GENERATE_COMMAND, LLMS_TXT_PUBLIC_PATH } from '@/lib/seo/llms-txt';
import { PUBLIC_SITE_ROUTES, blogPostPath, siteUrl } from '@/lib/seo/site-routes';
import { REPO_ROOT } from './_support/source';

const committed = readFileSync(path.join(REPO_ROOT, LLMS_TXT_PUBLIC_PATH), 'utf8');
const generated = buildLlmsTxt();

describe('public/llms.txt is generated from the registries', () => {
  it(`matches an in-memory regeneration exactly (otherwise run \`${LLMS_TXT_GENERATE_COMMAND}\`)`, () => {
    expect(committed).toBe(generated);
  });

  it('is deterministic, so the diff test cannot flake', () => {
    expect(buildLlmsTxt()).toBe(generated);
    expect(generated).not.toMatch(/\b20\d\d-\d\d-\d\dT\d\d:/); // no generation timestamps
  });

  it('states the operating hours from FACILITY_INFO for every day of the week', () => {
    const { open, close } = FACILITY_INFO.hours.daily;
    expect(generated).toContain(`- **Sunday – Saturday (every day)**: ${open} – ${close}`);
    // The old hand-typed schedule must never come back.
    expect(generated).not.toMatch(/10:00 – 23:00|09:00 – 16:00|19:00 – 24:00/);
  });

  it('labels the Google rating as last known and takes both numbers from the JSON', () => {
    const line = generated.split('\n').find((l) => l.startsWith('- **Google Rating'));
    expect(line).toBeDefined();
    expect(line).toContain('(last known)');
    expect(line).toContain(`${lastKnownRating.overallRating.toFixed(1)} / 5.0`);
    expect(line).toContain(`from ${lastKnownRating.totalReviewsCount.toLocaleString('en-US')} Google reviews`);
    expect(line).toContain('lib/reviews/last-known-rating.json');
    expect(line).toContain(FACILITY_INFO.googleReviewsDirectUrl);
    expect(generated).not.toContain('4.9 / 5');
    expect(generated).not.toContain('390+');
  });

  it('prints the contact and address exactly as the facility config', () => {
    const { address, contact } = FACILITY_INFO;
    expect(generated).toContain(`${address.streetEn}, ${address.cityEn}`);
    expect(generated).toContain(contact.phoneDisplay);
    expect(generated).toContain(contact.phoneInternational);
    expect(generated).toContain(contact.whatsappHref);
    expect(generated).toContain(contact.email);
    expect(generated).toContain(FACILITY_INFO.placeId);
    expect(generated).toContain(FACILITY_INFO.companyRegistrationNumber);
    for (const url of Object.values(FACILITY_INFO.social)) expect(generated).toContain(url);
  });

  it('lists every package with its registry duration and price, and no other price', () => {
    for (const pkg of SIMULATOR_PACKAGES) {
      const line = generated.split('\n').find((l) => l.startsWith(`- **${pkg.title}**`));
      expect(line, pkg.id).toBeDefined();
      expect(line).toContain(`(${pkg.durationMinutes} min)`);
      expect(line).toContain(`₪${pkg.priceIls.toLocaleString('en-US')}`);
      if (pkg.primeTimePriceIls) expect(line).toContain(`₪${pkg.primeTimePriceIls.toLocaleString('en-US')} prime-time`);
    }
    for (const addon of FLIGHT_ADDONS) {
      const line = generated.split('\n').find((l) => l.startsWith(`- **${addon.name}**`));
      expect(line, addon.id).toBeDefined();
      expect(line).toContain(`₪${addon.priceIls.toLocaleString('en-US')}`);
      if (addon.durationMinutes > 0) expect(line).toContain(`(+${addon.durationMinutes} min)`);
    }
    const knownPrices = new Set([
      ...SIMULATOR_PACKAGES.flatMap((p) => [p.priceIls, p.primeTimePriceIls ?? p.priceIls]),
      ...FLIGHT_ADDONS.map((a) => a.priceIls),
    ]);
    const printedPrices = [...generated.matchAll(/₪([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, '')));
    expect(printedPrices.filter((price) => !knownPrices.has(price))).toEqual([]);
  });

  it('links every sitemap route and every blog article, and nothing non-indexable', () => {
    const base = FACILITY_INFO.primaryDomain;
    for (const route of PUBLIC_SITE_ROUTES) expect(generated).toContain(`](${siteUrl(base, route.path)})`);
    for (const post of getAllBlogPosts()) {
      expect(generated).toContain(`- [${post.title}](${siteUrl(base, blogPostPath(post.slug))}) — published ${post.datePublished}`);
    }
    for (const missing of ['/fear-of-flying', '/blog', '/subscriptions', '/vouchers', '/about']) {
      expect(generated).toContain(`${base}${missing})`);
    }
    for (const utility of ['/login', '/dashboard', '/admin', '/book/success', '/subscriptions/thank-you', '/simulator']) {
      expect(generated).not.toContain(`${base}${utility}`);
    }
  });

  it('keeps aviation and contact telemetry in plain Latin text without mixed scripts', () => {
    const hebrew = /[\u0590-\u05FF]/;
    const arabic = /[\u0600-\u06FF]/;
    expect(generated).not.toMatch(arabic);
    for (const line of generated.split('\n')) {
      if (line.startsWith('- **Phone') || line.startsWith('- **GPS') || line.startsWith('- **Google Maps')) {
        expect(line, line).not.toMatch(hebrew);
      }
    }
  });
});
