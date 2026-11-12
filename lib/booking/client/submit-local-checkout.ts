import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

export interface LocalCheckoutMessages {
  paymentStartFailed: string;
  paymentInitializeFailed: string;
}

interface CheckoutResponse {
  error?: string;
  kind?: string;
  successUrl?: unknown;
  url?: unknown;
}

/**
 * Starts the local (Stripe or fully voucher-funded) checkout: posts the booking to `/api/checkout`
 * with the member's session token when there is one, then sends the browser to the returned
 * `successUrl` or Stripe `url`. Throws an `Error` with a displayable message on failure. On success
 * the page navigates away, so callers must not reset their submitting state.
 */
export async function startLocalCheckout(
  body: Record<string, unknown>,
  messages: LocalCheckoutMessages
): Promise<void> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  }
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const checkout = (await res.json()) as CheckoutResponse;
  if (!res.ok) throw new Error(checkout.error || messages.paymentStartFailed);
  if (checkout.kind === 'voucher' && typeof checkout.successUrl === 'string') {
    window.location.assign(checkout.successUrl);
    return;
  }
  if (checkout.kind === 'stripe' && typeof checkout.url === 'string') {
    window.location.assign(checkout.url);
    return;
  }
  throw new Error(messages.paymentInitializeFailed);
}
