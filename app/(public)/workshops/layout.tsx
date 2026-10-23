import React from 'react';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/seo-config';

export const metadata: Metadata = buildPageMetadata('workshops');

export default function WorkshopsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

