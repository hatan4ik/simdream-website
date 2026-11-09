import React from 'react';
import { buildSiteStructuredData, serializeJsonLd } from '@/lib/seo/structured-data';

/**
 * Site-wide Schema.org JSON-LD knowledge graph (LocalBusiness, offer catalogues, WebSite)
 * for Google Local Pack, rich results and AI search engines. Rendered once in the root
 * layout. Every value comes from the registries through `lib/seo/structured-data.ts`
 * (AGENTS.md §8); route-specific markup such as FAQPage lives beside its visible content.
 */
export function StructuredDataJsonLd({ nonce }: { nonce?: string }) {
  return (
    <script
      nonce={nonce}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildSiteStructuredData()) }}
    />
  );
}
