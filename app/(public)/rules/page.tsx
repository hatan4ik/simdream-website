import React from 'react';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/seo-config';
import { RulesContentView } from '@/components/legal/RulesContentView';

export const metadata: Metadata = buildPageMetadata('rules');

export default function RulesPage() {
  return <RulesContentView />;
}

