import React from 'react';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/seo-config';
import { FearOfFlyingView } from '@/components/fear-of-flying/FearOfFlyingView';

export const metadata: Metadata = buildPageMetadata('fearOfFlying');

export default function FearOfFlyingPage() {
  return <FearOfFlyingView />;
}
