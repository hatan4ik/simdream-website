'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/language-context';
import { refundCopyFor } from '@/lib/refund';
import { Badge } from '@/components/ui/Badge';

/** The page's one h1 and its introduction, in the page language. */
export function RefundPageHeader() {
  const { language } = useLanguage();
  const copy = refundCopyFor(language);
  return (
    <header className="max-w-3xl space-y-3">
      <Badge variant="sky">{copy.header.eyebrow}</Badge>
      <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">{copy.header.title}</h1>
      <p className="text-lg leading-relaxed text-slate-300">{copy.header.intro}</p>
    </header>
  );
}
