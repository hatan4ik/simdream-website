import React from 'react';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/seo-config';
import { ProSessionsView } from '@/components/pro/ProSessionsView';

export const metadata: Metadata = buildPageMetadata('simulator');

export default function SimulatorPage() {
  return <ProSessionsView />;
}
