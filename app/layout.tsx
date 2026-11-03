import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { UiThemeProvider } from '@/lib/theme/ui-theme-context';
import { AuthProvider } from '@/lib/auth/auth-context';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { LiveMetarBar } from '@/components/layout/LiveMetarBar';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SkipLink } from '@/components/layout/SkipLink';
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
// theme-color is the Cockpit Night page background; UiThemeProvider updates it on switch.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#070b14',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="en" data-ui="cockpit" className="dark scroll-smooth" suppressHydrationWarning>
      <head>
        <StructuredDataJsonLd nonce={nonce} />
        {/* Blocking on purpose: sets data-ui before first paint. Same-origin file keeps the CSP strict. */}
        <script nonce={nonce} src="/theme-bootstrap.js" />
      </head>
      <body className="min-h-screen flex flex-col bg-aviation-darkest text-slate-100 antialiased transition-colors duration-200">
        <UiThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <SkipLink />
              <LiveMetarBar />
              <Navbar />
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
