import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { store } from '@/lib/db/store';
import { adminWorkshopPatchSchema, validationError, workshopInquirySchema } from '@/lib/validation';

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    return NextResponse.json(await store.getCorporateInquiries(), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Corporate inquiry lookup failed', error);
    return NextResponse.json({ error: 'Corporate inquiries are temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }
  const parsed = workshopInquirySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 });

  try {
    const inquiry = await store.createCorporateInquiry(parsed.data);
    return NextResponse.json({ id: inquiry.id, status: inquiry.status }, { status: 201 });
  } catch (error) {
    console.error('Corporate inquiry creation failed', error);
    return NextResponse.json({ error: 'Unable to submit your inquiry right now.' }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }
  const parsed = adminWorkshopPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(validationError(parsed.error), { status: 400 });

  try {
    const updated = await store.updateInquiryStatus(parsed.data.id, parsed.data.status);
    if (!updated) return NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Corporate inquiry update failed', error);
    return NextResponse.json({ error: 'Unable to update inquiry.' }, { status: 503 });
  }
}
