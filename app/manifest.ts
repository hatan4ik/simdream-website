import type { MetadataRoute } from 'next';

// Web app manifest (served at /manifest.webmanifest; Next links it from every page).
// iOS reads name, short_name, start_url, display and the PNG icons; Android also uses
// background_color, theme_color and the maskable icon. Icons come from
// scripts/generate-app-icons.mjs, so every size is the same brand mark.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Sim Dream — Boeing 737 Flight Simulator, Tel Aviv',
    short_name: 'Sim Dream',
    description:
      'Book a Boeing 737 MAX full flight simulator session with an airline captain in Tel Aviv: discovery flights, airline interview prep and fear-of-flying courses.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f8fafc',
    theme_color: '#f8fafc',
    lang: 'en',
    categories: ['travel', 'entertainment', 'education'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
