'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';

/**
 * The Pilot Manifest text fields (name, email, phone, special requests). A signed-in member's
 * profile prefills the name and email once, without overwriting what the visitor already typed.
 *
 * SEAM: a feature that collects more pilot data (a birthday, consent) keeps its own state in its
 * own hook and is wired in the page, rather than growing this one.
 */
export function usePilotDetails() {
  const { user } = useAuth();
  const [pilotName, setPilotName] = useState<string>('');
  const [pilotEmail, setPilotEmail] = useState<string>('');
  const [pilotPhone, setPilotPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    setPilotName((current) => current || user.fullName);
    setPilotEmail((current) => current || user.email);
  }, [user?.email, user?.fullName, user?.id]);

  return { pilotName, setPilotName, pilotEmail, setPilotEmail, pilotPhone, setPilotPhone, notes, setNotes };
}

export type PilotDetails = ReturnType<typeof usePilotDetails>;
