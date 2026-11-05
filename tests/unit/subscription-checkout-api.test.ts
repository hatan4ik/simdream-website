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

  it('returns the Wix plan id without creating a server-owned visitor checkout for a signed-in member', async () => {
    const redirectSpy = vi.spyOn(wixModule, 'createPlanCheckoutUrl');
    vi.spyOn(wixModule, 'resolveWixPlanId').mockResolvedValueOnce('wix-plan-guid-member');

    const req = new NextRequest('https://simdream.co.il/api/subscriptions/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'advanced-captain-5x90', wixMemberCheckout: true }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      planId: 'advanced-captain-5x90',
      wixPlanId: 'wix-plan-guid-member',
      wixConnected: true,
      wixMemberCheckout: true,
    });
    expect(redirectSpy).not.toHaveBeenCalled();
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

describe('/api/subscriptions/checkout input channels and failure paths', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('accepts a classic form post and sends the browser straight to the Wix checkout', async () => {
    vi.spyOn(wixModule, 'resolveWixPlanId').mockResolvedValueOnce('wix-plan-guid-456');
    vi.spyOn(wixModule, 'createPlanCheckoutUrl').mockResolvedValueOnce('https://checkout.wix.com/plan-456');

    const req = new NextRequest('https://simdream.co.il/api/subscriptions/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html' },
      body: new URLSearchParams({ passId: 'flight-foundations-5x60' }).toString(),
    });

    const res = await POST(req);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('https://checkout.wix.com/plan-456');
  });

  it('answers JSON to a form post that does not accept HTML', async () => {
    vi.spyOn(wixModule, 'resolveWixPlanId').mockResolvedValueOnce(null);

    const req = new NextRequest('https://simdream.co.il/api/subscriptions/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ planId: 'advanced-captain-5x90' }).toString(),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect((await res.json()).planId).toBe('advanced-captain-5x90');
  });

  it('falls back to the query string when the form body cannot be read', async () => {
    vi.spyOn(wixModule, 'resolveWixPlanId').mockResolvedValueOnce(null);

    const req = new NextRequest('https://simdream.co.il/api/subscriptions/checkout?passId=advanced-captain-5x90', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'planId=ignored',
    });
    Object.defineProperty(req, 'formData', { value: () => Promise.reject(new Error('stream already consumed')) });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect((await res.json()).planId).toBe('advanced-captain-5x90');
  });

  it('treats a malformed JSON body as empty and reads the ?plan= parameter instead', async () => {
    vi.spyOn(wixModule, 'resolveWixPlanId').mockResolvedValueOnce(null);

    const req = new NextRequest('https://simdream.co.il/api/subscriptions/checkout?plan=atpl-concepts-10x60', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect((await res.json()).planId).toBe('atpl-concepts-10x60');
  });

  it('honours the passId alias in a JSON body', async () => {
    vi.spyOn(wixModule, 'resolveWixPlanId').mockResolvedValueOnce(null);

    const req = new NextRequest('https://simdream.co.il/api/subscriptions/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passId: ' flight-foundations-5x60 ' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect((await res.json()).planId).toBe('flight-foundations-5x60');
  });

  it('reads the query string for a POST that carries no content type or an unknown one', async () => {
    vi.spyOn(wixModule, 'resolveWixPlanId').mockResolvedValue(null);

    const bare = new NextRequest('https://simdream.co.il/api/subscriptions/checkout?planId=flight-foundations-5x60', {
      method: 'POST',
    });
    expect((await (await POST(bare)).json()).planId).toBe('flight-foundations-5x60');

    const text = new NextRequest('https://simdream.co.il/api/subscriptions/checkout?planId=advanced-captain-5x90', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'planId=ignored-because-plain-text',
    });
    expect((await (await POST(text)).json()).planId).toBe('advanced-captain-5x90');
  });

  it('rejects a form post that names no pass', async () => {
    const req = new NextRequest('https://simdream.co.il/api/subscriptions/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ note: 'no pass here' }).toString(),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects a GET without any pass id', async () => {
    const req = new NextRequest('https://simdream.co.il/api/subscriptions/checkout', { method: 'GET' });

    const res = await GET(req);
    expect(res.status).toBe(400);
    expect((await res.json()).planId).toBe('');
  });

  it('keeps the visitor on the Dispatch fallback when Wix throws, and never surfaces the error', async () => {
    vi.spyOn(wixModule, 'resolveWixPlanId').mockRejectedValueOnce(new Error('Wix 503'));

    const req = new NextRequest('https://simdream.co.il/api/subscriptions/checkout?planId=advanced-captain-5x90', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.wixConnected).toBe(false);
    expect(data.checkoutUrl).toContain('notice=dispatch_assisted');
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('redirects an HTML GET to the Wix checkout when the plan is published', async () => {
    vi.spyOn(wixModule, 'resolveWixPlanId').mockResolvedValueOnce('wix-plan-guid-789');
    vi.spyOn(wixModule, 'createPlanCheckoutUrl').mockResolvedValueOnce('https://checkout.wix.com/plan-789');

    const req = new NextRequest('https://simdream.co.il/api/subscriptions/checkout?planId=flight-foundations-5x60', {
      method: 'GET',
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });

    const res = await GET(req);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('https://checkout.wix.com/plan-789');
  });
});
