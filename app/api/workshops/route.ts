import { NextResponse } from 'next/server';
import { store } from '@/lib/db/store';

export async function GET() {
  try {
    const inquiries = await store.getCorporateInquiries();
    return NextResponse.json(inquiries);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch corporate inquiries' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      companyName,
      contactName,
      email,
      phone,
      teamSize,
      targetDate,
      primaryGoal,
      message,
    } = body;

    if (!companyName || !contactName || !email || !phone || !teamSize || !primaryGoal) {
      return NextResponse.json({ error: 'Missing required corporate inquiry fields' }, { status: 400 });
    }

    const inquiry = await store.createCorporateInquiry({
      companyName,
      contactName,
      email,
      phone,
      teamSize: Number(teamSize),
      targetDate,
      primaryGoal,
      message,
    });

    return NextResponse.json(inquiry, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit inquiry' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status required' }, { status: 400 });
    }

    const updated = await store.updateInquiryStatus(id, status);
    if (!updated) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update inquiry status' }, { status: 500 });
  }
}

