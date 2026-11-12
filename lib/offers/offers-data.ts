import { SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { GIFT_CARD_DESIGNS } from '@/lib/catalog/gift-card-designs';
import {
  CONSUMER_SUBSCRIPTION_PASSES,
  PRO_SUBSCRIPTION_PASSES,
  getSubscriptionPassFinancials,
} from '@/lib/data/subscription-passes';
import { applyBirthdayDiscount, getBirthdayEligiblePackages, type BirthdayPrice } from '@/lib/discounts/birthday';

/**
 * Everything /offers states about money, read from the registries (AGENTS.md §8): no price, duration
 * or percentage on the page is typed by hand. Pure functions, no React.
 */

export interface BirthdayExample {
  packageId: string;
  durationMinutes: number;
  price: BirthdayPrice;
}

/** The flagship eligible flight (the featured consumer package, else the first eligible one). */
export function getBirthdayExample(): BirthdayExample {
  const eligible = getBirthdayEligiblePackages();
  const featured = eligible.find((entry) => SIMULATOR_PACKAGES.find((pkg) => pkg.id === entry.id)?.featured);
  const chosen = featured ?? eligible[0];
  if (!chosen) throw new Error('No package is eligible for the birthday discount.');
  return { packageId: chosen.id, durationMinutes: chosen.durationMinutes, price: applyBirthdayDiscount(chosen.priceIls) };
}

/** The Discounted Promotion package: the one flagged `daytimeOnly` in the registry. */
export function getDaytimePromotion(): { id: string; slug: string; durationMinutes: number; priceIls: number } {
  const promo = SIMULATOR_PACKAGES.find((pkg) => pkg.daytimeOnly);
  if (!promo) throw new Error('The package registry has no Discounted Promotion.');
  return { id: promo.id, slug: promo.slug, durationMinutes: promo.durationMinutes, priceIls: promo.priceIls };
}

/** Largest saving of the consumer flight tracks against single flights, in whole percent. */
export function getConsumerTrackSavingPercent(): number {
  return Math.max(...CONSUMER_SUBSCRIPTION_PASSES.map((pass) => getSubscriptionPassFinancials(pass).savingsPercent));
}

/** Smallest and largest saving of the professional tracks, in whole percent. */
export function getProTrackSavingRange(): { minPercent: number; maxPercent: number } {
  const percents = PRO_SUBSCRIPTION_PASSES.map((pass) => getSubscriptionPassFinancials(pass).savingsPercent);
  return { minPercent: Math.min(...percents), maxPercent: Math.max(...percents) };
}

/** Cheapest and dearest gift card the voucher page sells. */
export function getGiftCardRange(): { minIls: number; maxIls: number } {
  const amounts = GIFT_CARD_DESIGNS.map((design) => design.amountIls);
  return { minIls: Math.min(...amounts), maxIls: Math.max(...amounts) };
}
