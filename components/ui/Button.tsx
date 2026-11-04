import React from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'hud' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const baseStyles =
  'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed select-none touch-manipulation cursor-pointer';

const variants: Record<ButtonVariant, string> = {
  // sky-700 keeps white label text at ~5.9:1 (WCAG AA); sky-500 was 2.7:1.
  primary: 'bg-sky-700 text-white hover:bg-sky-800 shadow-glow active:scale-[0.98]',
  secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700',
  outline: 'bg-transparent text-sky-400 border border-sky-500/50 hover:bg-sky-500/10 hover:border-sky-400',
  danger: 'bg-red-600 text-white hover:bg-red-500 shadow-md',
  hud: 'bg-slate-900/80 text-emerald-400 border border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-950/30 font-mono tracking-wider shadow-glowGreen',
  ghost: 'bg-transparent text-slate-300 hover:text-white hover:bg-slate-800/60',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-md gap-1.5',
  md: 'text-sm px-4 py-2.5 rounded-lg gap-2',
  lg: 'text-base px-6 py-3.5 rounded-lg gap-2.5 font-semibold',
};

/**
 * Shared class contract for a native button or a link styled as an action. The data attributes
 * below deliberately give Clean Studio a stable, semantic styling hook; it must never target
 * generic `button`, Tailwind colour, or rounded utility selectors again.
 */
export function buttonClassName(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(baseStyles, variants[variant], sizes[size], className);
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        data-ui-control="button"
        data-button-variant={variant}
        className={buttonClassName(variant, size, className)}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
