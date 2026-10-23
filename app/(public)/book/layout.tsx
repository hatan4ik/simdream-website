import React from 'react';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/seo-config';

export const metadata: Metadata = buildPageMetadata('book');

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

