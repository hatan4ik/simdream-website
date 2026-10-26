import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  memberIdForBooking,
  memberOwnsBooking,
  normalizeMemberEmail,
  type VerifiedMemberIdentity,
} from '@/lib/auth/member-ownership';

const emailArb = fc.stringMatching(/^[a-z0-9]{1,12}(\.[a-z0-9]{1,6})?@[a-z0-9]{1,10}\.[a-z]{2,4}$/);
const caseAndSpacing = (email: string) =>
  fc
    .tuple(fc.array(fc.boolean(), { minLength: email.length, maxLength: email.length }), fc.constantFrom('', ' ', '\t', '  '))
    .map(([upper, pad]) => pad + [...email].map((char, i) => (upper[i] ? char.toUpperCase() : char)).join('') + pad);

const member = (email: string, emailVerified = true): VerifiedMemberIdentity => ({
  id: '3ca25a7e-6ec9-4e73-a0df-1b68742d8a88',
  email,
  emailVerified,
});

describe('memberIdForBooking', () => {
  it('attaches a booking to a verified member regardless of email case or surrounding spaces', () => {
    fc.assert(
      fc.property(
        emailArb.chain((email) => fc.tuple(caseAndSpacing(email), caseAndSpacing(email))),
        ([memberEmail, pilotEmail]) => {
          expect(memberIdForBooking(member(memberEmail), pilotEmail)).toBe(member(memberEmail).id);
        }
      )
    );
  });

  it('never attaches a booking made with a different email address', () => {
    fc.assert(
      fc.property(emailArb, emailArb, (memberEmail, pilotEmail) => {
        fc.pre(memberEmail !== pilotEmail);
        expect(memberIdForBooking(member(memberEmail), pilotEmail)).toBeUndefined();
      })
    );
  });

  it('never attaches a booking for an unverified identity, even with the same email', () => {
    fc.assert(
      fc.property(emailArb, (email) => {
        expect(memberIdForBooking(member(email, false), email)).toBeUndefined();
      })
    );
  });

  it('returns nothing for a guest checkout', () => {
    expect(memberIdForBooking(null, 'pilot@example.com')).toBeUndefined();
  });

  it.each([
    ['a Cyrillic look-alike letter', 'pilot@exаmple.com'],
    ['a dotted capital I', 'PİLOT@example.com'],
    ['a plus-address variant', 'pilot+promo@example.com'],
    ['an inner space', 'pilot @example.com'],
  ])('refuses %s as the same address', (_label, pilotEmail) => {
    expect(memberIdForBooking(member('pilot@example.com'), pilotEmail)).toBeUndefined();
  });
});

describe('memberOwnsBooking', () => {
  it('grants ownership only for an identical, non-empty persisted member id', () => {
    let owned = 0;
    // Half of the cases reuse the member id, so the "same id" branch is exercised, not just random mismatches.
    const idPair = fc.string().chain((memberId) =>
      fc.tuple(fc.constant(memberId), fc.oneof(fc.constant(memberId), fc.option(fc.string(), { nil: undefined })))
    );
    fc.assert(
      fc.property(idPair, ([memberId, bookingUserId]) => {
        const expected = Boolean(bookingUserId) && bookingUserId === memberId;
        if (expected) owned += 1;
        expect(memberOwnsBooking(memberId, bookingUserId)).toBe(expected);
      })
    );
    expect(owned).toBeGreaterThan(10);
  });

  it('never treats an unclaimed booking as owned by an empty member id', () => {
    expect(memberOwnsBooking('', '')).toBe(false);
    expect(memberOwnsBooking('', undefined)).toBe(false);
  });
});

describe('normalizeMemberEmail', () => {
  it('is idempotent and produces lower-case, trimmed addresses', () => {
    fc.assert(
      fc.property(fc.string(), (email) => {
        const normalized = normalizeMemberEmail(email);
        expect(normalizeMemberEmail(normalized)).toBe(normalized);
        expect(normalized).toBe(normalized.trim());
        expect(normalized).toBe(normalized.toLowerCase());
      })
    );
  });
});
