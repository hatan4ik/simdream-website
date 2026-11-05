import { NextRequest, NextResponse } from 'next/server';
import { findSubscriptionPass, type SubscriptionPassId } from '@/lib/data/subscription-passes';
import { createPlanCheckoutUrl, resolveWixPlanId } from '@/lib/wix';

export const dynamic = 'force-dynamic';

async function handleCheckout(req: NextRequest) {
  let planId = '';
  let wixMemberCheckout = false;

  if (req.method === 'POST') {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      planId = String(body.planId || body.passId || '');
      wixMemberCheckout = body.wixMemberCheckout === true;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        planId = String(formData.get('planId') || formData.get('passId') || '');
      }
    }
  }

  if (!planId) {
    planId =
      req.nextUrl.searchParams.get('planId') ||
      req.nextUrl.searchParams.get('plan') ||
      req.nextUrl.searchParams.get('passId') ||
      '';
  }

  planId = planId.trim();

  const pass = findSubscriptionPass(planId as SubscriptionPassId);
  if (!pass) {
    return NextResponse.json(
      { error: 'Unknown or invalid subscription pass id', planId },
      { status: 400 }
    );
  }

  const baseUrl = req.nextUrl.origin || 'https://simdream.co.il';
  const acceptsHtml = req.headers.get('accept')?.includes('text/html');
  const isDirectFormPost =
    req.method === 'POST' &&
    acceptsHtml &&
    !req.headers.get('content-type')?.includes('application/json');

  let checkoutUrl: string | null = null;
  let wixPlanId: string | null = null;
  let wixConnected = false;

  try {
    const resolvedWixPlanId = await resolveWixPlanId(pass.id);
    if (resolvedWixPlanId) {
      wixPlanId = resolvedWixPlanId;
      if (!wixMemberCheckout) {
        checkoutUrl = await createPlanCheckoutUrl({
          planId: resolvedWixPlanId,
          baseUrl,
          passId: pass.id,
        });
      }
      wixConnected = true;
    }
  } catch (err) {
    console.warn('[subscriptions:checkout] Wix Pricing Plans redirect generation failed:', err);
  }

  // Graceful fallback to Captain Dispatch if the plan is not yet configured or published on Wix
  if (!checkoutUrl) {
    checkoutUrl = `${baseUrl}/contact?subject=subscription&plan=${pass.id}&notice=dispatch_assisted`;
  }

  if (isDirectFormPost || (req.method === 'GET' && acceptsHtml)) {
    return NextResponse.redirect(new URL(checkoutUrl, req.url), 303);
  }

  return NextResponse.json({
    checkoutUrl,
    planId: pass.id,
    wixConnected,
    wixMemberCheckout: wixMemberCheckout && Boolean(wixPlanId),
    wixPlanId,
  });
}

export async function POST(req: NextRequest) {
  return handleCheckout(req);
}

export async function GET(req: NextRequest) {
  return handleCheckout(req);
}
