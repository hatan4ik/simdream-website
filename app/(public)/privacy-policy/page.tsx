import React from 'react';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/seo-config';
import { PrivacyPolicyContentView } from '@/components/legal/PrivacyPolicyContentView';

export const metadata: Metadata = buildPageMetadata('privacy');

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyContentView />;
}

