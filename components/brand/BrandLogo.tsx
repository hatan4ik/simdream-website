import Image from 'next/image';

// Official Sim Dream artwork from simdream.co.il: the orange airplane (#FF5500) and the
// cerulean wordmark (#2096C7). The Hebrew tagline is cut from the wordmark artwork so each
// language can render it as translated text (t.nav.brandSub). Logos are never mirrored in RTL.

/** Airplane mark and "SIM DREAM" wordmark. Size it with a height class, e.g. "h-8 w-auto". */
export function BrandLogo({ className = 'h-8 w-auto', priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/simdream-logo.png"
      alt="SIM DREAM"
      width={1130}
      height={153}
      priority={priority}
      className={className}
    />
  );
}

/** The orange airplane on its own, for compact badges. Decorative unless a label is given. */
export function BrandMark({ className = 'w-10 h-10', label }: { className?: string; label?: string }) {
  return (
    <Image
      src="/brand/simdream-plane.png"
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      width={520}
      height={520}
      className={className}
    />
  );
}
