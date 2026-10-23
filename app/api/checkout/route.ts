import { NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe';
import { extractErrorMessage } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      amountIls,
      customerEmail,
      bookingId,
      voucherId,
      returnUrl,
    } = body;

    if (!amountIls || !customerEmail) {
      return NextResponse.json({ error: 'Amount and customer email are required' }, { status: 400 });
    }

    const host = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = returnUrl || `${host}/book/success?booking_id=${bookingId || ''}&voucher_id=${voucherId || ''}`;
    const cancelUrl = `${host}/book?cancelled=true`;

    const session = await createCheckoutSession({
      title: title || 'Sim Dream Flight Simulator Booking',
      description: description || 'Boeing 737 MAX Simulator Session',
      amountIls: Number(amountIls),
      customerEmail,
      bookingId,
      voucherId,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.sessionId,
    });
  } catch (error: unknown) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: extractErrorMessage(error, 'Failed to initialize checkout session') }, { status: 500 });
  }
}

