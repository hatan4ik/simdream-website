import { REFUND_POLICY } from './refund-policy';
import type { RefundEligibilityInput, SubscriptionRefund } from './refund-types';

/**
 * Rule 4.6: the refund for a subscription that was not used in full is the amount paid minus the
 * FULL price of the sessions already used (30 min 450, 60 min 650, 90 min 850). Returns null while
 * the paid amount or the used sessions are unknown: staff read them from the order.
 */
export function computeSubscriptionRefund(
  subscription: RefundEligibilityInput['subscription']
): SubscriptionRefund | null {
  if (!subscription || subscription.paidIls === undefined || !subscription.usedSessions) return null;
  if (!Number.isFinite(subscription.paidIls) || subscription.paidIls < 0) return null;

  let usedValueIls = 0;
  for (const [minutes, count] of Object.entries(subscription.usedSessions)) {
    const price = REFUND_POLICY.subscription.fullSessionPriceIls[Number(minutes)];
    if (price === undefined || !Number.isInteger(count) || (count as number) < 0) return null;
    usedValueIls += price * (count as number);
  }
  return { usedValueIls, refundIls: Math.max(0, subscription.paidIls - usedValueIls) };
}
