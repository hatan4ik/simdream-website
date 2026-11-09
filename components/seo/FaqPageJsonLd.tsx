import React from 'react';
import type { Language } from '@/lib/i18n/translations';
import { buildFaqPageStructuredData, serializeJsonLd, type VisibleFaq } from '@/lib/seo/structured-data';

/**
 * FAQPage JSON-LD for a route that visibly renders the same questions and answers.
 * Render it inside the FAQ section and pass the exact array the section maps over, in
 * the visitor's language, so the markup and the visible copy can never drift apart
 * (AGENTS.md §8). JSON-LD data blocks are not executed, so no CSP nonce is required.
 */
export function FaqPageJsonLd({ url, language, faqs }: { url: string; language: Language; faqs: readonly VisibleFaq[] }) {
  return (
    <script
      type="application/ld+json"
      data-faq-jsonld
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildFaqPageStructuredData({ url, language, faqs })) }}
    />
  );
}
