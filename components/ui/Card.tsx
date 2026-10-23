import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  borderAccent?: 'sky' | 'amber' | 'emerald' | 'purple' | 'none';
}

export function Card({ className, glow = false, borderAccent = 'none', children, ...props }: CardProps) {
  const accents = {
    none: 'border-slate-800',
    sky: 'border-sky-500/40 hover:border-sky-400/80',
    amber: 'border-amber-500/40 hover:border-amber-400/80',
    emerald: 'border-emerald-500/40 hover:border-emerald-400/80',
    purple: 'border-purple-500/40 hover:border-purple-400/80',
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-slate-900/60 backdrop-blur-md p-6 text-slate-100 transition-all duration-200',
        accents[borderAccent],
        glow && 'shadow-glow',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

