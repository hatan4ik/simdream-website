'use client';

import React from 'react';
import Link from 'next/link';
import { BIRTHDAY_CHECKOUT_COPY } from '@/lib/discounts/birthday';
import { useLanguage } from '@/lib/i18n/language-context';
import { cn } from '@/lib/utils';

/**
 * "How does the birthday discount work?" in the page language, pointing at the explanation on /offers.
 * Meant for the checkout (placed by the checkout owner); it carries a 44px-high tap target.
 */
export function BirthdayOfferLink({ className }: { className?: string }) {
  const { language } = useLanguage();
  const label = (BIRTHDAY_CHECKOUT_COPY[language] || BIRTHDAY_CHECKOUT_COPY.en).linkLabel;

  return (
    <Link
      href="/offers#birthday"
      data-birthday-offer-link
      className={cn(
        'inline-flex min-h-11 items-center text-sm font-medium text-sky-400 underline underline-offset-4 transition-colors hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded',
        className
      )}
    >
      {label}
    </Link>
  );
}
