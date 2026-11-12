'use client';

import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { RefundCopy } from '@/lib/refund';
import { Button } from '@/components/ui/Button';
import { ContactLinks } from './ContactLinks';

/** Shown when the server answered 503: nothing was sent, and the desk is one tap away. */
export function RefundUnavailable({ copy, onBack }: { copy: RefundCopy; onBack: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <section data-refund-unavailable className="space-y-6 rounded-2xl border border-amber-500/40 bg-amber-950/40 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <AlertTriangle aria-hidden="true" className="mt-1 h-8 w-8 shrink-0 text-amber-400" />
        <div className="space-y-2">
          <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-white focus:outline-none">
            {copy.unavailable.title}
          </h2>
          <p className="text-slate-300">{copy.unavailable.body}</p>
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-white">{copy.unavailable.contactTitle}</h3>
        <ContactLinks copy={copy} />
      </div>
      <Button type="button" variant="secondary" onClick={onBack}>
        {copy.actions.back}
      </Button>
    </section>
  );
}
