import { NextResponse } from 'next/server';
import { store } from '@/lib/db/store';
import { FLIGHT_ADDONS, SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import {
  getDayOperatingConfig,
  getReservedMinutesForFlight,
  minutesToTime,
  timeToMinutes,
} from '@/lib/scheduler/kantorovich-engine';
import {
  addMinutesToTime,
  calculateMissionManifest,
  sanitizePackageTitle,
} from '@/lib/scheduler/mission-calculator';
import { sendBookingConfirmationEmail } from '@/lib/sendgrid';
import { extractErrorMessage } from '@/lib/utils';
import { PilotExperienceLevel } from '@/types';

const VALID_EXPERIENCE_LEVELS: readonly PilotExperienceLevel[] = [
  'beginner',
  'enthusiast',
  'student_pilot',
  'atpl',
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const ref = searchParams.get('ref');
    const id = searchParams.get('id');

    if (ref) {
      const booking = await store.getBookingByRef(ref);
      if (!booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
      return NextResponse.json(booking);
    }

    if (id) {
      const all = await store.getBookings();
      const found = all.find((b) => b.id === id);
      if (!found) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
      return NextResponse.json(found);
    }

    if (email) {
      const bookings = await store.getBookingsByEmail(email);
      return NextResponse.json(bookings);
    }

    const allBookings = await store.getBookings();
    return NextResponse.json(allBookings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      packageId,
      packageTitle,
      durationMinutes,
      bookingDate,
      startTime,
      endTime,
      pilotName,
      pilotEmail,
      pilotPhone,
      experienceLevel,
      addons = [],
      subtotalIls,
      discountIls = 0,
      totalIls,
      voucherCode,
      notes = '',
    } = body;

    if (!packageId || !bookingDate || !startTime || !pilotName || !pilotEmail || !pilotPhone) {
      return NextResponse.json({ error: 'Missing required booking fields' }, { status: 400 });
    }

    // Authoritative server-side Mission Manifest calculation (Base Package + Selected Time Add-Ons)
    const matchedPkg = SIMULATOR_PACKAGES.find((p) => p.id === packageId) || SIMULATOR_PACKAGES[0];
    const safeAddonIds: string[] = Array.isArray(addons)
      ? addons.filter((item): item is string => typeof item === 'string')
      : [];

    const manifest = calculateMissionManifest({
      pkg: {
        title: packageTitle || matchedPkg.title,
        durationMinutes: matchedPkg.durationMinutes,
        priceIls: matchedPkg.priceIls,
      },
      selectedAddonIds: safeAddonIds,
      availableAddons: FLIGHT_ADDONS,
      voucherDiscountIls: Number(discountIls) || 0,
      fallbackStartTime: startTime,
    });

    const finalDurationMinutes = Math.max(
      Number(durationMinutes) || 0,
      manifest.totalDurationMinutes
    );
    const startMin = timeToMinutes(startTime);
    const finalEndTime = addMinutesToTime(startTime, finalDurationMinutes);
    const reservedEndMin = startMin + getReservedMinutesForFlight(finalDurationMinutes);

    // Systems Engineering Guard: Server-Side Slot Collision & Facility Closing Verification
    const dayConfig = getDayOperatingConfig(bookingDate);
    if (reservedEndMin > dayConfig.closeMinutes) {
      return NextResponse.json(
        {
          error: `Selected mission duration (${finalDurationMinutes}m + turnaround) exceeds facility closing time (${minutesToTime(dayConfig.closeMinutes)}). Please choose an earlier departure slot.`,
        },
        { status: 409 }
      );
    }

    const existingBookingsOnDate = (await store.getBookings()).filter(
      (b) => b.bookingDate === bookingDate && b.status !== 'cancelled'
    );
    const collidingBooking = existingBookingsOnDate.find((b) => {
      const bStart = timeToMinutes(b.startTime);
      const bDur = b.durationMinutes || Math.max(20, timeToMinutes(b.endTime) - bStart);
      const bResEnd = bStart + getReservedMinutesForFlight(bDur);
      return startMin < bResEnd && reservedEndMin > bStart;
    });

    if (collidingBooking) {
      return NextResponse.json(
        {
          error: `Departure slot ${startTime}–${finalEndTime} overlaps with an existing reservation (${collidingBooking.startTime}–${collidingBooking.endTime}). Please select another open slot.`,
        },
        { status: 409 }
      );
    }

    const cleanTitle = sanitizePackageTitle(
      packageTitle || matchedPkg.title || manifest.cleanPackageTitle
    );
    const validExperience: PilotExperienceLevel = VALID_EXPERIENCE_LEVELS.includes(experienceLevel)
      ? experienceLevel
      : 'beginner';

    // If voucher was used, deduct balance
    if (voucherCode && discountIls > 0) {
      await store.redeemVoucher(voucherCode, discountIls);
    }

    const newBooking = await store.createBooking({
      packageId,
      packageTitle: cleanTitle,
      durationMinutes: finalDurationMinutes,
      bookingDate,
      startTime,
      endTime: finalEndTime || endTime,
      pilotName,
      pilotEmail,
      pilotPhone,
      experienceLevel: validExperience,
      addons: safeAddonIds,
      subtotalIls: Number(subtotalIls) || manifest.subtotalIls,
      discountIls: Number(discountIls) || 0,
      totalIls: Number(totalIls) ?? manifest.totalIls,
      voucherCode,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: voucherCode && discountIls >= totalIls ? 'voucher' : 'stripe',
      notes,
    });

    // Send email confirmation asynchronously
    sendBookingConfirmationEmail(newBooking).catch(console.error);

    return NextResponse.json(newBooking, { status: 201 });
  } catch (error: unknown) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { error: extractErrorMessage(error, 'Failed to create booking') },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, startTime } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    let updated;
    if (startTime) {
      updated = await store.updateBookingTime(id, startTime);
    }
    if (status) {
      updated = await store.updateBookingStatus(id, status);
    }

    if (!updated) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

