import React from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'hud' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

/**
 * Apple store actions (apple.com `.button` / `.button-secondary`): a 980px pill, regular-weight
 * system type with -0.022em tracking, 8px/16px padding, no shadow, no press scale, a 1px border on
 * every variant so a filled and an outlined pill sit at the same height. The same geometry applies
 * in all three themes and on every viewport; themes only change colour (app/globals.css).
 */
const baseStyles =
  'inline-flex items-center justify-center text-center rounded-[980px] border font-normal tracking-[-0.022em] leading-[1.17648] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed select-none touch-manipulation cursor-pointer';

const variants: Record<ButtonVariant, string> = {
  // "Learn more": filled brand cerulean. sky-700 keeps white label text at ~5.9:1 (WCAG AA).
  primary: 'bg-sky-700 border-sky-700 text-white hover:bg-sky-800 hover:border-sky-800',
  // "Buy": the same cerulean as a 1px outline on a transparent pill; fills on hover like apple.com.
  // Cockpit Night uses sky-400 for contrast on dark slate; daylight remaps it to sky-700.
  outline: 'bg-transparent border-sky-400 text-sky-400 hover:bg-sky-400 hover:text-slate-950',
  // Neutral grey pill (apple.com `.button-neutral`) for tertiary actions.
  secondary: 'bg-slate-800 border-slate-800 text-slate-100 hover:bg-slate-700 hover:border-slate-700',
  danger: 'bg-red-600 border-red-600 text-white hover:bg-red-500 hover:border-red-500',
  hud: 'bg-slate-900/80 text-emerald-400 border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-950/30 font-mono tracking-wider',
  // Text-only action in link blue.
  ghost: 'bg-transparent border-transparent text-sky-400 hover:text-sky-300 hover:bg-sky-500/10',
};

// apple.com: `.button` is 17px with 8px/16px padding; `.button-elevated` grows to 21px with
// 11px/22px padding from the 1069px breakpoint. Minimum heights keep the 44px tap target.
const sizes: Record<ButtonSize, string> = {
  sm: 'text-sm min-h-9 px-3.5 py-1.5 gap-1.5',
  md: 'text-[17px] min-h-11 px-4 py-2 gap-2',
  lg: 'text-[17px] lg:text-[21px] lg:tracking-[0.011em] min-h-12 px-[22px] py-[11px] gap-2',
};

/**
 * Shared class contract for a native button or a link styled as an action. The data attributes
 * below deliberately give the themes a stable, semantic styling hook; they must never target
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
