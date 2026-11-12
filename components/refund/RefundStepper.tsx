import React from 'react';
import { fillCopy, type RefundCopy } from '@/lib/refund';
import { cn } from '@/lib/utils';
import type { RefundStep } from './refund-form-types';

/** Three segments and the words "Step 2 of 3". Decorative bars; the list and aria-current carry the meaning. */
export function RefundStepper({ step, copy }: { step: RefundStep; copy: RefundCopy }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-400">{fillCopy(copy.stepper.stepOf, { current: step, total: 3 })}</p>
      <ol aria-label={copy.stepper.label} className="grid grid-cols-3 gap-2">
        {copy.stepper.steps.map((label, index) => {
          const position = index + 1;
          return (
            <li key={label} aria-current={position === step ? 'step' : undefined} className="space-y-1.5">
              <span
                aria-hidden="true"
                className={cn('block h-1.5 rounded-full', position <= step ? 'bg-sky-400' : 'bg-slate-800')}
              />
              <span className={cn('block text-xs leading-tight', position === step ? 'font-semibold text-white' : 'text-slate-400')}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
