import 'server-only';

import { z } from 'zod';
import { normalizeMemberEmail } from '@/lib/auth/member-ownership';

/**
 * The body of `POST /api/wix/birthday/claim`, as `lib/booking/client/wix-birthday-claim.ts` sends
 * it. The pilot's email is required: the issued claim is bound to it (and to the phone when the
 * form has one), and the issuance limit counts per email.
 */
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const wixBirthdayClaimRequestSchema = z.object({
  packageId: z.string().min(1).max(80),
  birthDate: isoDay,
  flightDate: isoDay,
  email: z.string().trim().email().max(254).transform(normalizeMemberEmail),
  phone: z.string().trim().max(32).optional(),
});

export type WixBirthdayClaimRequest = z.infer<typeof wixBirthdayClaimRequestSchema>;

/** The validated request with the email normalized, or null for anything else. */
export function parseWixBirthdayClaimRequest(input: unknown): WixBirthdayClaimRequest | null {
  const parsed = wixBirthdayClaimRequestSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}
