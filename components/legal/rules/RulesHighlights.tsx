import React from 'react';
import { Clock, ShieldCheck, UserCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { RulesPageCopy } from '@/lib/legal/page-copy';

/** Three quick facts above the full text: age, arrival and the nature of the service. */
export function RulesHighlights({ copy }: { copy: RulesPageCopy }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card borderAccent="amber" className="p-4 space-y-1.5">
        <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase">
          <UserCheck className="w-4 h-4" aria-hidden="true" />
          <span>{copy.ageBadge}</span>
        </div>
        <p className="text-sm font-bold text-white">{copy.ageTitle}</p>
        <p className="text-xs text-slate-300 leading-relaxed">{copy.ageDesc}</p>
      </Card>

      <Card borderAccent="sky" className="p-4 space-y-1.5">
        <div className="flex items-center gap-2 text-sky-400 font-mono text-xs font-bold uppercase">
          <Clock className="w-4 h-4" aria-hidden="true" />
          <span>{copy.arrivalBadge}</span>
        </div>
        <p className="text-sm font-bold text-white">{copy.arrivalTitle}</p>
        <p className="text-xs text-slate-300 leading-relaxed">{copy.arrivalDesc}</p>
      </Card>

      <Card borderAccent="emerald" className="p-4 space-y-1.5">
        <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          <span>{copy.natureBadge}</span>
        </div>
        <p className="text-sm font-bold text-white">{copy.natureTitle}</p>
        <p className="text-xs text-slate-300 leading-relaxed">{copy.natureDesc}</p>
      </Card>
    </section>
  );
}
