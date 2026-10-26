import type { Metadata } from 'next';
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

export const metadata: Metadata = buildPageMetadata('home');

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-ui="cockpit" className="dark scroll-smooth" suppressHydrationWarning>
      <head>
        <StructuredDataJsonLd />
        {/* Blocking on purpose: sets data-ui before first paint. Same-origin file keeps the CSP strict. */}
        <script src="/theme-bootstrap.js" />
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
