'use client';

import React from 'react';
import Link from 'next/link';
import { buttonClassName } from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/language-context';
import { useLocalizedInternalHref } from './use-localized-internal-href';

/**
 * The header's primary action. The desktop actions carry the full label; the phone and tablet cluster the
 * short one (`nav.bookFlightShort`, which Russian shortens so the row still fits at 360px).
 */
export function NavBookLink({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  const localHref = useLocalizedInternalHref();
  return (
    <Link
      href={localHref('/book')}
      data-ui-control="button"
      data-button-variant="primary"
      className={buttonClassName('primary', 'sm', compact ? 'min-h-11 px-3' : 'min-h-11 whitespace-nowrap')}
    >
      {compact ? t.nav.bookFlightShort : t.nav.bookFlight}
    </Link>
  );
}
