import React from 'react';
import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { buttonClassName } from '@/components/ui/Button';
import { FACILITY_INFO } from '@/lib/config/facility-info';

interface LegalContactBoxProps {
  question: string;
  crossLinkHref: string;
  crossLinkLabel: string;
}

/** Contact details and a link to the sibling legal document, closing both legal pages. */
export function LegalContactBox({ question, crossLinkHref, crossLinkLabel }: LegalContactBoxProps) {
  const { contact, address } = FACILITY_INFO;
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-300">
      <div className="space-y-1">
        <p className="font-bold text-white">{question}</p>
        <div className="flex flex-wrap items-center gap-4 font-mono text-slate-400" dir="ltr">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            {address.streetEn}, Tel Aviv
          </span>
          <a href={contact.phoneHref} className="inline-flex items-center gap-1 hover:text-sky-400">
            <Phone className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            {contact.phoneDisplay}
          </a>
          <a href={contact.emailHref} className="inline-flex items-center gap-1 hover:text-sky-400">
            <Mail className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            {contact.email}
          </a>
        </div>
      </div>
      <Link
        href={crossLinkHref}
        className={buttonClassName('secondary', 'md', 'shrink-0')}
        data-ui-control="button"
        data-button-variant="secondary"
      >
        {crossLinkLabel}
      </Link>
    </div>
  );
}
