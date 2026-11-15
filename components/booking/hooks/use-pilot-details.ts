'use client';

import { useCallback, useState } from 'react';
import { useCustomerContactSeed } from '@/lib/customer/customer-draft';

/**
 * The Pilot Manifest text fields (name, email, phone, special requests). Inherits previously
 * entered tab contact details and authenticated member profile fields (`fullName`, `email`,
 * `phone`) once, without overwriting what the visitor already typed, and shares edits across pages.
 *
 * SEAM: a feature that collects more pilot data (a birthday, consent) keeps its own state in its
 * own hook and is wired in the page, rather than growing this one.
 */
export function usePilotDetails() {
  const [pilotName, setPilotNameState] = useState<string>('');
  const [pilotEmail, setPilotEmailState] = useState<string>('');
  const [pilotPhone, setPilotPhoneState] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const { updateCustomerDraft } = useCustomerContactSeed((contact) => {
    setPilotNameState((current) => current || contact.fullName);
    setPilotEmailState((current) => current || contact.email);
    setPilotPhoneState((current) => current || contact.phone);
  });

  const setPilotName = useCallback(
    (value: string) => {
      setPilotNameState(value);
      updateCustomerDraft({ fullName: value });
    },
    [updateCustomerDraft]
  );

  const setPilotEmail = useCallback(
    (value: string) => {
      setPilotEmailState(value);
      updateCustomerDraft({ email: value });
    },
    [updateCustomerDraft]
  );

  const setPilotPhone = useCallback(
    (value: string) => {
      setPilotPhoneState(value);
      updateCustomerDraft({ phone: value });
    },
    [updateCustomerDraft]
  );

  return { pilotName, setPilotName, pilotEmail, setPilotEmail, pilotPhone, setPilotPhone, notes, setNotes };
}

export type PilotDetails = ReturnType<typeof usePilotDetails>;
