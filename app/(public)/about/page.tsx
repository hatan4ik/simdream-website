import type { Metadata } from 'next';
import { AboutExperienceView } from '@/components/about/AboutExperienceView';
import { buildPageMetadata } from '@/lib/seo/seo-config';

export const metadata: Metadata = buildPageMetadata('about');

export default function AboutPage() {
  return <AboutExperienceView />;
}
