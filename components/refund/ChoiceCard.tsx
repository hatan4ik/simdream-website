import React from 'react';
import { cn } from '@/lib/utils';

interface ChoiceCardProps {
  name: string;
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  title: string;
  hint: string;
  /** The first radio of an invalid group receives programmatic focus after a failed Continue. */
  invalid?: boolean;
}

/** A radio button presented as a card. The native input stays visible, so keyboard and screen readers behave natively. */
export function ChoiceCard({ name, value, checked, onSelect, title, hint, invalid }: ChoiceCardProps) {
  return (
    <label
      className={cn(
        'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
        'border-slate-800 bg-slate-950/40 hover:border-slate-700',
        'has-[:checked]:border-sky-400 has-[:checked]:bg-sky-500/10',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sky-400'
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        data-invalid={invalid || undefined}
        onChange={() => onSelect(value)}
        className="mt-1 h-5 w-5 shrink-0 accent-sky-500"
      />
      <span className="min-w-0">
        <span className="block text-base font-semibold text-white">{title}</span>
        <span className="mt-0.5 block text-sm leading-relaxed text-slate-400">{hint}</span>
      </span>
    </label>
  );
}
