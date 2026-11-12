import type { WixSubscriptionBookingCopy } from '@/lib/booking/client';

/** Shown while redeeming an active Wix subscription: the flight is covered, add-ons and vouchers are not. */
export function WixSubscriptionBanner({ copy }: { copy: Pick<WixSubscriptionBookingCopy, 'eyebrow' | 'title' | 'description'> }) {
  return (
    <section
      data-wix-subscription-redemption="true"
      className="max-w-4xl mx-auto rounded-2xl border border-sky-500/35 bg-sky-500/10 p-4 sm:p-5"
    >
      <p className="text-xs font-semibold tracking-wide text-sky-300">{copy.eyebrow}</p>
      <h1 className="mt-1 text-lg font-semibold text-white">{copy.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-200">{copy.description}</p>
    </section>
  );
}
