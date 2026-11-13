import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { UiThemeProvider } from '@/lib/theme/ui-theme-context';
import { AuthProvider } from '@/lib/auth/auth-context';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { DEFAULT_LANGUAGE, languageDirection } from '@/lib/i18n/language-preference';
import { isSecondaryWixLanguage } from '@/lib/i18n/locale-routing';
import { LiveMetarBar } from '@/components/layout/LiveMetarBar';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SkipLink } from '@/components/layout/SkipLink';
import { ConsentManager } from '@/components/consent';
import { buildPageMetadata } from '@/lib/seo/seo-config';
import { StructuredDataJsonLd } from '@/components/seo/StructuredDataJsonLd';

export const metadata: Metadata = {
  ...buildPageMetadata('home'),
  // iOS Home Screen: opens as a web app with the name below. The opaque 180px tile is
  // app/apple-icon.png; the status bar stays the system one (no top inset to manage).
  appleWebApp: { capable: true, title: 'Sim Dream', statusBarStyle: 'default' },
  // Next renders `capable` as the standard mobile-web-app-capable tag only; Safari also reads the
  // apple- prefixed one (and needs it before any startup image is ever added).
  other: { 'apple-mobile-web-app-capable': 'yes' },
  formatDetection: { telephone: false },
};

// viewport-fit=cover lets the page reach the notch edges; globals.css pads the safe areas.
// No maximum-scale or user-scalable=no: pinch zoom must keep working (WCAG 1.4.4).
// theme-color starts at SimDream Day; UiThemeProvider updates it on switch.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f8fafc',
};

function isWixHostedPreview(host: string | null): boolean {
  return Boolean(host && host.split(':', 1)[0].endsWith('.wix-site-host.com'));
}

// The server deliberately knows no anonymous locale cookie. For a returning
// visitor, keep the Hebrew SSR fallback off-screen for the one short interval
// before LanguageProvider restores its browser-local preference. The timeout
// is a fail-safe for a blocked or broken client bundle; no-JS visitors never
// execute this script and see the Hebrew page normally.
const LANGUAGE_PREFERENCE_BOOTSTRAP = `(()=>{try{const root=document.documentElement;root.setAttribute('data-language-pending','true');window.setTimeout(()=>root.removeAttribute('data-language-pending'),3000)}catch{}})()`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get('x-nonce') ?? undefined;
  // A secondary Wix Multilingual URL is authoritative (for example `/en/book`).
  // Root URLs retain the existing local browser preference as a progressive
  // enhancement; we deliberately do not create a tracking cookie.
  const routedLanguageHeader = requestHeaders.get('x-simdream-locale');
  const routedLanguage = isSecondaryWixLanguage(routedLanguageHeader) ? routedLanguageHeader : undefined;
  const initialLanguage = routedLanguage ?? DEFAULT_LANGUAGE;
  // The wix-site-host.com addresses are pre-production delivery URLs. Their
  // canonical domain remains simdream.co.il, but explicit noindex prevents a
  // preview from competing with the production domain before the cutover.
  const noIndexPreview = isWixHostedPreview(requestHeaders.get('host'));

  return (
    <html lang={initialLanguage} dir={languageDirection(initialLanguage)} data-ui="brand" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <StructuredDataJsonLd nonce={nonce} />
        {noIndexPreview && <meta name="robots" content="noindex, nofollow, noarchive" />}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: LANGUAGE_PREFERENCE_BOOTSTRAP }} />
        {/* Blocking on purpose: sets data-ui before first paint. Same-origin file keeps the CSP strict. */}
        <script nonce={nonce} src="/theme-bootstrap.js" />
      </head>
      <body className="min-h-screen flex flex-col bg-aviation-darkest text-slate-100 antialiased transition-colors duration-200">
        <UiThemeProvider>
          <LanguageProvider initialLanguage={initialLanguage} routedLanguage={routedLanguage}>
            <AuthProvider>
              <SkipLink />
              <ConsentManager />
              <header data-site-chrome className="sticky top-0 z-[60]">
                <LiveMetarBar />
                <Navbar />
              </header>
              {/* The single main landmark; pages render plain containers inside it. */}
              <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col focus:outline-none">
                {children}
              </main>
              <Footer />
            </AuthProvider>
          </LanguageProvider>
        </UiThemeProvider>
      </body>
    </html>
  );
}
