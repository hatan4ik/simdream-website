'use client';

import { useState } from 'react';
import type { FlightSlot } from '@/types';
import {
  buildWixCheckoutDraftKey,
  pickActiveWixCheckoutDraft,
  prepareWixCheckoutDraft,
  type WixCheckoutDraftState,
} from '@/lib/booking/client';

interface UseWixCheckoutDraftArgs {
  packageId: string;
  selectedDate: string;
  selectedSlot: FlightSlot | null;
  pilotName: string;
  pilotEmail: string;
  pilotPhone: string;
  notes: string;
  messages: { errorSelectSlot: string; paymentStartFailed: string };
}

/**
 * The unpaid, visitor-owned Wix cart ("draft") that a native Wix checkout and a Wix coupon or Gift
 * Card share. A draft is valid only for the exact package, date, departure and pilot data it was
 * created for: `activeDraft` is the stored draft while it still matches, otherwise null and a fresh
 * cart is prepared on demand by `ensureDraft`.
 */
export function useWixCheckoutDraft(args: UseWixCheckoutDraftArgs) {
  const { packageId, selectedDate, selectedSlot, pilotName, pilotEmail, pilotPhone, notes, messages } = args;
  const [draft, setDraft] = useState<WixCheckoutDraftState | null>(null);

  const draftKey = buildWixCheckoutDraftKey({
    packageId,
    selectedDate,
    slotId: selectedSlot?.id,
    pilotName,
    pilotEmail,
    pilotPhone,
    notes,
  });
  const activeDraft = pickActiveWixCheckoutDraft(draft, draftKey);

  const prepareDraft = async (): Promise<WixCheckoutDraftState> => {
    if (!selectedSlot) throw new Error(messages.errorSelectSlot);
    const prepared = await prepareWixCheckoutDraft({
      inputKey: draftKey,
      packageId,
      bookingDate: selectedDate,
      startTime: selectedSlot.startTime,
      pilotName,
      pilotEmail,
      pilotPhone,
      notes,
      paymentStartFailed: messages.paymentStartFailed,
    });
    setDraft(prepared);
    return prepared;
  };

  const ensureDraft = async (): Promise<WixCheckoutDraftState> => activeDraft ?? prepareDraft();

  return { draft, setDraft, activeDraft, ensureDraft };
}

export type WixCheckoutDraftHandle = ReturnType<typeof useWixCheckoutDraft>;
