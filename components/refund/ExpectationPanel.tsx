import React from 'react';
import { describeEvaluation, type PanelTone, type RefundCopy, type RefundEvaluation } from '@/lib/refund';
import type { Language } from '@/lib/i18n/translations';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { ContactLinks } from './ContactLinks';

const SURFACE: Record<PanelTone, string> = {
  positive: 'border-emerald-500/40 bg-emerald-950/20',
  info: 'border-sky-500/40 bg-sky-950/20',
  caution: 'border-amber-500/40 bg-amber-950/40',
  neutral: 'border-slate-800 bg-slate-900/60',
};
const HEADLINE: Record<PanelTone, string> = {
  positive: 'text-emerald-300',
  info: 'text-sky-300',
  caution: 'text-amber-300',
  neutral: 'text-white',
};

interface ExpectationPanelProps {
  evaluation: RefundEvaluation | null;
  copy: RefundCopy;
  language: Language;
  idBase: string;
}

/**
 * "What to expect": the likely outcome under the rules, in plain words, updated live as the
 * customer fills the form. It is an estimate for the customer's benefit; a person decides.
 */
export function ExpectationPanel({ evaluation, copy, language, idBase }: ExpectationPanelProps) {
  const view = evaluation ? describeEvaluation(evaluation, copy, language) : null;
  const titleId = `${idBase}-panel-title`;

  return (
    <aside
      aria-labelledby={titleId}
      data-refund-panel
      data-refund-outcome={view?.outcome ?? 'pending'}
      className={cn('space-y-4 rounded-2xl border p-5', view ? SURFACE[view.tone] : SURFACE.neutral)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={titleId} className="text-lg font-bold text-white">
          {copy.panel.title}
        </h2>
        <Badge variant="slate">{copy.panel.badge}</Badge>
      </div>

      {!view ? (
        <p className="text-sm leading-relaxed text-slate-300">{copy.panel.pending}</p>
      ) : (
        <>
          <div className="space-y-2">
            <p role="status" className={cn('text-xl font-bold leading-snug', HEADLINE[view.tone])}>
              {view.headline}
            </p>
            <p className="text-sm leading-relaxed text-slate-300">{view.body}</p>
          </div>

          {view.blockers.length > 0 && (
            <ul className="list-disc space-y-1 ps-5 text-sm text-slate-300">
              {view.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          )}

          {view.details.length > 0 && (
            <ul className="space-y-1 border-t border-slate-800 pt-3 text-sm text-slate-300">
              {view.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
          {view.timeAssumed && <p className="text-xs leading-relaxed text-amber-300">{copy.panel.facts.assumedTime}</p>}
          {view.clauses && <p className="text-xs font-medium text-slate-400">{view.clauses}</p>}

          {view.nudge && (
            <div data-refund-nudge className="space-y-2 rounded-xl border border-sky-500/40 bg-sky-500/10 p-4">
              <p className="font-semibold text-white">{view.nudge.title}</p>
              <p className="text-sm leading-relaxed text-slate-300">{view.nudge.body}</p>
              <ContactLinks copy={copy} />
            </div>
          )}
        </>
      )}

      <p className="text-xs leading-relaxed text-slate-400">{copy.panel.disclaimer}</p>
    </aside>
  );
}
