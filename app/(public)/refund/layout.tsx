import React from 'react';
import type { Metadata } from 'next';

// A deliberately unlisted page: it is reached from the rules refund clause and from confirmation
// emails, never from the navigation. It stays out of search results and out of the sitemap, llms.txt
// and the structured data (those are built from lib/seo/site-routes.ts, which does not list it).
// robots.txt does NOT disallow it either: a Disallow line would publish the URL to anyone who
// reads robots.txt, and would stop crawlers from ever seeing this noindex.
export const metadata: Metadata = {
  title: 'Refund request | Sim Dream',
  description: 'Request a refund from Sim Dream.',
  robots: { index: false, follow: false },
};

export default function RefundLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
