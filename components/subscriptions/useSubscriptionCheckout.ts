'use client';

import { useState } from 'react';
import { getWixMemberClient } from '@/lib/wix/member-client';
import { subscriptionPassReturnPath, type SubscriptionPass } from '@/lib/data/subscription-passes';
import { useLanguage } from '@/lib/i18n/language-context';
import { localizeInternalHref } from '@/lib/i18n/locale-routing';

/**
 * Starts the single-payment checkout of a flight track (consumer tracks on `/subscriptions`,
 * PRO tracks on `/pro`). The server (`POST /api/subscriptions/checkout`) resolves the Wix
 * Pricing Plan; a signed-in Wix member is sent through the member checkout so the order lands
 * on their account, everyone else follows the hosted checkout URL, and any failure falls back to
 * Captain Dispatch with the chosen track pre-filled.
 */
export function useSubscriptionCheckout() {
  const [pendingPassId, setPendingPassId] = useState<string | null>(null);
  const { language } = useLanguage();

  const buySubscription = async (pass: Pick<SubscriptionPass, 'id' | 'audience'>) => {
    const passId = pass.id;
    setPendingPassId(passId);
    try {
      const wixClient = getWixMemberClient();
      const isMember = wixClient.auth.loggedIn();

      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: passId, wixMemberCheckout: isMember, language }),
      });
      if (!res.ok) throw new Error('Checkout API failed');
      const data = await res.json();

      if (isMember && data.wixMemberCheckout && data.wixPlanId) {
        const redirectSession = await wixClient.redirects.createRedirectSession({
          paidPlansCheckout: { planId: data.wixPlanId },
          callbacks: {
            postFlowUrl: `${window.location.origin}${localizeInternalHref(subscriptionPassReturnPath(pass), language)}`,
            thankYouPageUrl: `${window.location.origin}${localizeInternalHref('/subscriptions/thank-you', language)}`,
          },
          preferences: {
            additionalQueryParameters: { lang: language },
          },
        });
        const memberCheckoutUrl = redirectSession.redirectSession?.fullUrl;
        if (memberCheckoutUrl) {
          window.location.assign(memberCheckoutUrl);
          return;
        }
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      throw new Error('No checkout URL');
    } catch (err) {
      console.warn('Subscription checkout redirect failed, falling back to dispatch:', err);
      window.location.href = localizeInternalHref(`/contact?subject=subscription&plan=${passId}`, language);
    }
  };

  return { pendingPassId, buySubscription };
}
