import { NextResponse } from 'next/server';
import { store } from '@/lib/db/store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (code) {
      const voucher = await store.getVoucherByCode(code);
      if (!voucher) {
        return NextResponse.json({ error: 'Invalid voucher code.' }, { status: 404 });
      }

      if (new Date(voucher.expiryDate).getTime() < Date.now()) {
        return NextResponse.json({ error: 'This voucher has expired.', expired: true }, { status: 400 });
      }

      if (voucher.currentBalanceIls <= 0 || voucher.isRedeemed) {
        return NextResponse.json({ error: 'This voucher has already been fully redeemed.', redeemed: true }, { status: 400 });
      }

      return NextResponse.json(voucher);
    }

    const allVouchers = await store.getVouchers();
    return NextResponse.json(allVouchers);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process voucher request' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      amountIls,
      recipientName,
      recipientEmail,
      senderName,
      senderEmail,
      personalMessage = '',
      packageId,
      packageTitle,
    } = body;

    if (!amountIls || !recipientName || !recipientEmail || !senderName || !senderEmail) {
      return NextResponse.json({ error: 'Missing required voucher fields' }, { status: 400 });
    }

    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year validity

    const newVoucher = await store.createVoucher({
      initialValueIls: amountIls,
      currentBalanceIls: amountIls,
      recipientName,
      recipientEmail,
      senderName,
      senderEmail,
      personalMessage,
      packageId,
      packageTitle,
      expiryDate: expiryDate.toISOString(),
    });

    return NextResponse.json(newVoucher, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create voucher' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { code, amount } = body;

    if (!code || !amount) {
      return NextResponse.json({ error: 'Code and deduction amount are required' }, { status: 400 });
    }

    const result = await store.redeemVoucher(code, amount);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to redeem voucher' }, { status: 500 });
  }
}

