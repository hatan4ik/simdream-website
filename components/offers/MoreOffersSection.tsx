import React from 'react';
import Link from 'next/link';
import { Clock, Gift, GraduationCap, Layers } from 'lucide-react';
import { buttonClassName } from '@/components/ui/Button';
import { getLocalizedPackages, type SupportedLanguage } from '@/lib/i18n/translations';
import { formatIls } from '@/lib/offers/format';
import { fillOffersTemplate, type OffersCopy } from '@/lib/offers/offers-copy';
import {
  getConsumerTrackSavingPercent,
  getDaytimePromotion,
  getGiftCardRange,
  getProTrackSavingRange,
} from '@/lib/offers/offers-data';

interface OfferCardProps {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  title: string;
  badge?: string;
  body: string;
  href: string;
  cta: string;
  id: string;
}

function OfferCard({ icon: Icon, title, badge, body, href, cta, id }: OfferCardProps) {
  return (
    <article className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6" data-offer-card={id}>
      <div className="space-y-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-400">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-bold text-white leading-snug">{title}</h3>
        {badge && (
          <p className="inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-semibold text-sky-300">
            {badge}
          </p>
        )}
        <p className="text-sm text-slate-300 leading-relaxed">{body}</p>
      </div>
      <Link href={href} data-ui-control="button" data-button-variant="outline" className={buttonClassName('outline', 'md', 'self-start')}>
        {cta}
      </Link>
    </article>
  );
}

/** `#more-offers`: the other offers that exist today, every figure read from the registries. */
export function MoreOffersSection({ copy, language }: { copy: OffersCopy; language: SupportedLanguage }) {
  const promo = getDaytimePromotion();
  const localizedPromo = getLocalizedPackages(language).find((pkg) => pkg.id === promo.id);
  const proRange = getProTrackSavingRange();
  const giftCards = getGiftCardRange();

  return (
    <section id="more-offers" aria-labelledby="more-offers-title" className="scroll-mt-28 space-y-6" data-offers-more>
      <div className="space-y-2">
        <h2 id="more-offers-title" className="text-2xl sm:text-3xl font-bold text-white">
          {copy.moreTitle}
        </h2>
        <p className="text-sm sm:text-base text-slate-300">{copy.moreLead}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <OfferCard
          id="daytime"
          icon={Clock}
          title={localizedPromo?.title ?? ''}
          badge={localizedPromo?.badge}
          body={fillOffersTemplate(copy.daytimeBody, { minutes: promo.durationMinutes, price: formatIls(promo.priceIls) })}
          href={`/book?package=${promo.slug}`}
          cta={copy.daytimeCta}
        />
        <OfferCard
          id="tracks"
          icon={Layers}
          title={copy.tracksTitle}
          body={fillOffersTemplate(copy.tracksBody, { percent: getConsumerTrackSavingPercent() })}
          href="/subscriptions"
          cta={copy.tracksCta}
        />
        <OfferCard
          id="pro-tracks"
          icon={GraduationCap}
          title={copy.proTracksTitle}
          body={fillOffersTemplate(copy.proTracksBody, { min: proRange.minPercent, max: proRange.maxPercent })}
          href="/pro#pro-tracks"
          cta={copy.proTracksCta}
        />
        <OfferCard
          id="vouchers"
          icon={Gift}
          title={copy.vouchersTitle}
          body={fillOffersTemplate(copy.vouchersBody, { min: formatIls(giftCards.minIls), max: formatIls(giftCards.maxIls) })}
          href="/vouchers"
          cta={copy.vouchersCta}
        />
      </div>
    </section>
  );
}
