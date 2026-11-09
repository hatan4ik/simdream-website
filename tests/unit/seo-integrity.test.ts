import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { LANGUAGES, type Language } from '@/lib/i18n/translations';
import { SUBSCRIPTION_PAGE_COPY } from '@/lib/data/subscription-page-copy';
import { BLOG_POSTS } from '@/lib/data/blog-posts';
import { PAGE_SEO_DEFINITIONS } from '@/lib/seo/seo-config';
import { buildFaqPageStructuredData, schemaClosingTime } from '@/lib/seo/structured-data';
import { StructuredDataJsonLd } from '@/components/seo/StructuredDataJsonLd';
import { FaqPageJsonLd } from '@/components/seo/FaqPageJsonLd';
import { REPO_ROOT, sourceFiles } from './_support/source';

/**
 * SEO integrity (AGENTS.md §8): every fact in the structured data is the registry's fact.
 * The graph is rendered through the real components, exactly as the layout and the pages
 * emit it, then parsed back from the <script type="application/ld+json"> payload.
 */

type JsonObject = Record<string, unknown>;

function renderJsonLd(element: React.ReactElement): JsonObject {
  const html = renderToStaticMarkup(element);
  const match = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!match) throw new Error('No JSON-LD script rendered');
  return JSON.parse(match[1]) as JsonObject;
}

/** Depth-first walk over every object in the JSON-LD tree. */
function* objects(value: unknown): Generator<JsonObject> {
  if (Array.isArray(value)) {
    for (const item of value) yield* objects(item);
  } else if (value !== null && typeof value === 'object') {
    yield value as JsonObject;
    for (const child of Object.values(value as JsonObject)) yield* objects(child);
  }
}

const typesOf = (node: JsonObject) => (Array.isArray(node['@type']) ? (node['@type'] as string[]) : [node['@type'] as string]);
const nodesOfType = (graph: unknown, type: string) => [...objects(graph)].filter((node) => typesOf(node).includes(type));
const toMinutes = (hhmm: string) => {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
};

const siteGraph = renderJsonLd(React.createElement(StructuredDataJsonLd, { nonce: 'test-nonce' }));
const graphNodes = siteGraph['@graph'] as JsonObject[];
const localBusiness = graphNodes.find((node) => typesOf(node).includes('LocalBusiness'))!;
const website = graphNodes.find((node) => typesOf(node).includes('WebSite'))!;
const packageBySlug = new Map(SIMULATOR_PACKAGES.map((pkg) => [pkg.slug, pkg]));

describe('site-wide JSON-LD graph', () => {
  it('is one schema.org graph with the local business and the website', () => {
    expect(siteGraph['@context']).toBe('https://schema.org');
    expect(localBusiness).toBeDefined();
    expect(website).toBeDefined();
    expect(website.publisher).toEqual({ '@id': localBusiness['@id'] });
  });

  it('prices every Offer from the package registry and never invents one', () => {
    const offers = nodesOfType(siteGraph, 'Offer');
    expect(offers.length).toBeGreaterThan(0);
    for (const offer of offers) {
      const slug = new URL(offer.url as string).searchParams.get('package');
      const pkg = packageBySlug.get(slug ?? '');
      expect(pkg, `Offer ${offer.name} points at an unknown package ${slug}`).toBeDefined();
      expect(offer.price, `price of ${pkg!.id}`).toBe(String(pkg!.priceIls));
      expect(offer.priceCurrency).toBe('ILS');
      expect(offer.name).toBe(pkg!.title);
    }
  });

  it('offers the three PRO tiers at their registry prices', () => {
    const proPackages = SIMULATOR_PACKAGES.filter((pkg) => pkg.category === 'training');
    expect(proPackages).toHaveLength(3);
    const offers = nodesOfType(siteGraph, 'Offer');
    for (const pkg of proPackages) {
      const offer = offers.find((candidate) => (candidate.url as string).endsWith(`package=${pkg.slug}`));
      expect(offer, `no Offer for ${pkg.id}`).toBeDefined();
      expect(offer!.price).toBe(String(pkg.priceIls));
    }
  });

  it('derives the price range from the cheapest and most expensive package', () => {
    const prices = SIMULATOR_PACKAGES.map((pkg) => pkg.priceIls);
    const min = Math.min(...prices).toLocaleString('en-US');
    const max = Math.max(...prices).toLocaleString('en-US');
    expect(localBusiness.priceRange).toBe(`₪${min} - ₪${max}`);
  });

  it('opens and closes with the operating window (Sun–Sat 09:00–24:00)', () => {
    const specs = localBusiness.openingHoursSpecification as JsonObject[];
    expect(specs).toHaveLength(1);
    const [spec] = specs;
    expect(spec.dayOfWeek).toEqual(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
    expect(toMinutes(spec.opens as string)).toBe(FACILITY_INFO.hours.daily.openMin);
    // schema.org Time has no 24:00: an end-of-day close is written 23:59 (Google's LocalBusiness guidance).
    const closeMin = toMinutes(spec.closes as string);
    expect(FACILITY_INFO.hours.daily.closeMin === 1440 ? closeMin + 1 : closeMin).toBe(FACILITY_INFO.hours.daily.closeMin);
    expect(schemaClosingTime('24:00')).toBe('23:59');
    expect(schemaClosingTime('22:30')).toBe('22:30');
  });

  it('links the Google profile, the alternate domain, WhatsApp and the three social profiles (sameAs)', () => {
    expect(localBusiness.sameAs).toEqual(
      expect.arrayContaining([
        FACILITY_INFO.googleMapsUrl,
        FACILITY_INFO.alternateDomain,
        FACILITY_INFO.contact.whatsappHref,
        FACILITY_INFO.social.instagramUrl,
        FACILITY_INFO.social.facebookUrl,
        FACILITY_INFO.social.youtubeUrl,
      ])
    );
    expect(new Set(localBusiness.sameAs as string[]).size).toBe((localBusiness.sameAs as string[]).length);
  });

  it('takes contact and address facts from the facility config', () => {
    expect(localBusiness.telephone).toBe(FACILITY_INFO.contact.phoneInternational);
    expect(localBusiness.email).toBe(FACILITY_INFO.contact.email);
    expect(localBusiness.taxID).toBe(FACILITY_INFO.companyRegistrationNumber);
    const address = localBusiness.address as JsonObject;
    expect(address.streetAddress).toBe(FACILITY_INFO.address.streetEn);
    expect(address.postalCode).toBe(FACILITY_INFO.address.postalCode);
  });

  it('declares all six interface languages, Spanish included', () => {
    const tags = website.inLanguage as string[];
    expect(tags).toHaveLength(LANGUAGES.length);
    for (const language of LANGUAGES) expect(tags).toContain(`${language.code}-IL`);
    expect(tags).toContain('es-IL');
  });

  it('never carries a FAQPage (no route-wide FAQ is visible) nor a self-serving aggregateRating', () => {
    expect(nodesOfType(siteGraph, 'FAQPage')).toEqual([]);
    for (const node of objects(siteGraph)) {
      expect(node).not.toHaveProperty('aggregateRating');
      expect(node).not.toHaveProperty('review');
    }
  });
});

describe('FAQPage markup', () => {
  const languagesWithCopy = Object.keys(SUBSCRIPTION_PAGE_COPY) as Language[];

  it.each(languagesWithCopy)('on /subscriptions repeats the visible %s questions and answers verbatim', (language) => {
    const copy = SUBSCRIPTION_PAGE_COPY[language]!;
    const url = `${FACILITY_INFO.primaryDomain}${PAGE_SEO_DEFINITIONS.subscriptions.path}`;
    const faqPage = renderJsonLd(React.createElement(FaqPageJsonLd, { url, language, faqs: copy.faqs }));
    expect(faqPage['@type']).toBe('FAQPage');
    expect(faqPage.url).toBe(url);
    expect(faqPage.inLanguage).toBe(language);
    const questions = faqPage.mainEntity as JsonObject[];
    expect(questions.map((question) => question.name)).toEqual(copy.faqs.map((faq) => faq.question));
    expect(questions.map((question) => (question.acceptedAnswer as JsonObject).text)).toEqual(copy.faqs.map((faq) => faq.answer));
    expect(buildFaqPageStructuredData({ url, language, faqs: copy.faqs })).toEqual(faqPage);
  });

  it('is emitted only by routes that render the same FAQ array they pass to it', () => {
    const consumers = sourceFiles('app', 'components')
      .filter((file) => !file.endsWith('FaqPageJsonLd.tsx'))
      .map((file) => [path.relative(REPO_ROOT, file), readFileSync(file, 'utf8')] as const)
      .filter(([, source]) => /FaqPageJsonLd|'FAQPage'/.test(source));
    expect(consumers.map(([file]) => file)).toEqual(['app/(public)/subscriptions/page.tsx']);
    for (const [file, source] of consumers) {
      // The same `faqs` array feeds the markup (`faqs={pageCopy.faqs}`) and the accordion (`pageCopy.faqs.map`).
      const faqsProp = /faqs=\{(\w+\.faqs)\}/.exec(source)?.[1];
      expect(faqsProp, `${file} must pass a rendered FAQ array to FaqPageJsonLd`).toBeDefined();
      expect(source, `${file} must render ${faqsProp} visibly`).toMatch(new RegExp(`${faqsProp!.replace('.', '\\.')}\\.map\\(`));
      expect(source).toMatch(/\{faq\.question\}/);
      expect(source).toMatch(/\{faq\.answer\}/);
    }
  });
});

describe('SEO metadata copy', () => {
  it('quotes package prices that match the registry', () => {
    const quoted = [...PAGE_SEO_DEFINITIONS.experiences.description.matchAll(/₪([\d,]+)/g)].map(([, amount]) => Number(amount.replace(/,/g, '')));
    expect(quoted.length).toBeGreaterThan(0);
    const registryPrices = new Set(SIMULATOR_PACKAGES.flatMap((pkg) => [pkg.priceIls, pkg.primeTimePriceIls ?? pkg.priceIls]));
    for (const amount of quoted) expect(registryPrices, `₪${amount} is not a registry price`).toContain(amount);
  });

  it('quotes the operating window and the facility contact details, never a stale copy', () => {
    const { description } = PAGE_SEO_DEFINITIONS.contact;
    expect(description).toContain(`${FACILITY_INFO.hours.daily.open}-${FACILITY_INFO.hours.daily.close}`);
    expect(description).toContain(FACILITY_INFO.contact.phoneDisplay);
    expect(description).toContain(FACILITY_INFO.contact.email);
  });
});

describe('blog cover images and the CSP', () => {
  it('allows every blog cover host in img-src so the covers actually render', () => {
    const proxy = readFileSync(path.join(REPO_ROOT, 'proxy.ts'), 'utf8');
    const imgSrc = /"img-src ([^"]+)"/.exec(proxy)?.[1];
    expect(imgSrc).toBeDefined();
    const allowed = imgSrc!.split(/\s+/);
    const coverHosts = new Set(BLOG_POSTS.map((post) => new URL(post.coverImage).origin));
    expect(coverHosts.size).toBeGreaterThan(0);
    for (const host of coverHosts) expect(allowed, `${host} is blocked by the CSP`).toContain(host);
    // Only the hosts the site really uses: no wildcard, no unexplained extra origins.
    expect(allowed.filter((source) => source.startsWith('https://')).sort()).toEqual(
      [...coverHosts, 'https://lh3.googleusercontent.com'].sort()
    );
  });
});
