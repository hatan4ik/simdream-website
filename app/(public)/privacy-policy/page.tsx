import React from 'react';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/seo-config';
import { PrivacyPolicyContentView } from '@/components/legal/PrivacyPolicyContentView';
import { PrivacyBodyHebrew } from '@/components/legal/privacy/PrivacyBodyHebrew';

export const metadata: Metadata = buildPageMetadata('privacy');

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyContentView hebrewBody={<PrivacyBodyHebrew />} />;
}

