import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { NotFoundView, notFoundCopyFor } from '@/components/not-found';
import { DEFAULT_LANGUAGE } from '@/lib/i18n/language-preference';
import { isSecondaryWixLanguage } from '@/lib/i18n/locale-routing';

// Renders inside the root layout for every URL that matches no route (and for notFound() calls),
// keeping the header, language selector and footer. Next answers 404 and adds `noindex` itself.
// Tab title: a Wix `/en/...` URL carries its language in a request header (proxy.ts); a root URL
// has no server-side language signal, so it gets the Hebrew default like the layout's first paint.
export async function generateMetadata(): Promise<Metadata> {
  const routed = (await headers()).get('x-simdream-locale');
  const language = isSecondaryWixLanguage(routed) ? routed : DEFAULT_LANGUAGE;
  return { title: `${notFoundCopyFor(language).title} | Sim Dream` };
}

export default function NotFound() {
  return <NotFoundView />;
}
