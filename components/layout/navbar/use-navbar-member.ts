'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';

/** Who the header shows: the signed-in member (or the localized default pilot name) and the auth actions it offers. */
export function useNavbarMember() {
  const { user, isAdmin, logout, setDemoUser } = useAuth();
  const { t } = useLanguage();
  const memberName = user?.fullName || user?.email || t.member.dashboard.defaultPilotName;
  return { user, isAdmin, logout, setDemoUser, memberName };
}
