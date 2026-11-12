import React from 'react';
import Link from 'next/link';
import { buttonClassName } from '@/components/ui/Button';
import type { LegalClause } from '@/lib/legal/types';

/** DOM id of a numbered clause, for deep links such as `/rules#clause-4-6`. */
export function clauseDomId(number: string): string {
  return `clause-${number.replace(/\./g, '-')}`;
}

interface LegalClauseListProps {
  clauses: readonly LegalClause[];
}

/**
 * Renders clauses exactly as written: the number (always left-to-right), a bold lead-in term, the
 * text, optional bullet lines and an optional action link. One list item per clause.
 */
export function LegalClauseList({ clauses }: LegalClauseListProps) {
  return (
    <ul className="space-y-3 text-xs sm:text-sm leading-relaxed">
      {clauses.map((clause, index) => (
        <li key={clause.number ?? `${index}-${clause.term ?? clause.text.slice(0, 12)}`} id={clause.number ? clauseDomId(clause.number) : undefined}>
          <p>
            {clause.number ? (
              <>
                <span dir="ltr" className="inline-block font-mono font-semibold text-sky-400">
                  {clause.number}
                </span>{' '}
              </>
            ) : null}
            {clause.term ? <strong className="font-bold text-white">{clause.term} </strong> : null}
            {clause.text}
          </p>
          {clause.items && clause.items.length > 0 ? (
            <ul className="mt-2 list-disc ps-6 space-y-1.5">
              {clause.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {clause.action ? (
            <p className="mt-3">
              <Link
                href={clause.action.href}
                className={buttonClassName('outline', 'md')}
                data-ui-control="button"
                data-button-variant="outline"
              >
                {clause.action.label}
              </Link>
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
