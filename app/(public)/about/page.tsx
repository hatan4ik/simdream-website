import React from 'react';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/seo-config';
import { AboutExperienceView } from '@/components/about/AboutExperienceView';

export const metadata: Metadata = buildPageMetadata('about');

export default function AboutPage() {
  return <AboutExperienceView />;
}

