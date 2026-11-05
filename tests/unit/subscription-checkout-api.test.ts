import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/subscriptions/checkout/route';
import * as wixModule from '@/lib/wix';

describe('/api/subscriptions/checkout API Route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects unknown subscription IDs with HTTP 400', async () => {
    const req = new NextRequest('https://simdream.co.il/api/subscriptions/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'unknown-id-123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Unknown or invalid');
  });

  it('returns Wix checkout redirect URL when plan resolves', async () => {
    vi.spyOn(wixModule, 'resolveWixPlanId').mockResolvedValueOnce('wix-plan-guid-123');
    vi.spyOn(wixModule, 'createPlanCheckoutUrl').mockResolvedValueOnce(
      'https://checkout.wix.com/hosted-payment-plan'
    );

    const req = new NextRequest('https://simdream.co.il/api/subscriptions/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'flight-foundations-5x60' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.checkoutUrl).toBe('https://checkout.wix.com/hosted-payment-plan');
    expect(data.planId).toBe('flight-foundations-5x60');
    expect(data.wixConnected).toBe(true);
  });

  it('falls back cleanly to Dispatch when Wix plan is not yet configured', async () => {
    vi.spyOn(wixModule, 'resolveWixPlanId').mockResolvedValueOnce(null);

    const req = new NextRequest('https://simdream.co.il/api/subscriptions/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'advanced-captain-5x90' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.checkoutUrl).toContain('/contact?subject=subscription&plan=advanced-captain-5x90');
    expect(data.wixConnected).toBe(false);
  });

  it('redirects with 303 See Other when invoked via HTML navigation or form submit', async () => {
    vi.spyOn(wixModule, 'resolveWixPlanId').mockResolvedValueOnce(null);

    const req = new NextRequest(
      'https://simdream.co.il/api/subscriptions/checkout?planId=atpl-concepts-10x60',
      {
        method: 'GET',
        headers: { Accept: 'text/html' },
      }
    );

    const res = await GET(req);
    expect(res.status).toBe(303);
    const location = res.headers.get('location');
    expect(location).toContain('/contact?subject=subscription&plan=atpl-concepts-10x60');
  });
});

