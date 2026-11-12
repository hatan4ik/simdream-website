import type { Metadata } from 'next';
import { GroundSchoolView } from '@/components/ground-school/GroundSchoolView';
import { buildPageMetadata } from '@/lib/seo/seo-config';

export const metadata: Metadata = buildPageMetadata('groundSchool');

export default function GroundSchoolPage() {
  return <GroundSchoolView />;
}
