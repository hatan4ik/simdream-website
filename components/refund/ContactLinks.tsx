import React from 'react';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import type { RefundCopy } from '@/lib/refund';
import { buttonClassName } from '@/components/ui/Button';

/** WhatsApp, phone and email of the desk, from the facility config. Numbers and addresses stay left to right. */
export function ContactLinks({ copy, className }: { copy: RefundCopy; className?: string }) {
  const { whatsappHref, phoneHref, phoneDisplay, emailHref, email } = FACILITY_INFO.contact;
  return (
    <div className={className ?? 'flex flex-wrap gap-2'}>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        data-ui-control="button"
        data-button-variant="primary"
        className={buttonClassName('primary', 'md')}
      >
        {copy.contact.whatsapp}
      </a>
      <a href={phoneHref} data-ui-control="button" data-button-variant="outline" className={buttonClassName('outline', 'md')}>
        <span>{copy.contact.call}</span>
        <span dir="ltr">{phoneDisplay}</span>
      </a>
      <a href={emailHref} data-ui-control="button" data-button-variant="outline" className={buttonClassName('outline', 'md')}>
        <span>{copy.contact.email}</span>
        <span dir="ltr">{email}</span>
      </a>
    </div>
  );
}
