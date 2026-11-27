'use client';

import { useLayoutEffect, useRef, type HTMLAttributes } from 'react';

/**
 * A span whose text an `Intl` formatter produced, for content the server renders.
 *
 * The server's locale data and the browser's can disagree on the same date ("Sept" and "Sep" in
 * en-GB, a capitalised weekday in ru-RU, a comma in de-DE: Safari against Node, 2026-11). React treats
 * any text difference as a hydration mismatch and discards the whole server-rendered page. Here the
 * server's wording is accepted during hydration and replaced by the browser's own straight after, so
 * every later render of the calendar uses one wording.
 */
export function IntlText({ children, ...rest }: { children: string } & Omit<HTMLAttributes<HTMLSpanElement>, 'children'>) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (ref.current && ref.current.textContent !== children) ref.current.textContent = children;
  }, [children]);
  return (
    <span ref={ref} suppressHydrationWarning {...rest}>
      {children}
    </span>
  );
}
