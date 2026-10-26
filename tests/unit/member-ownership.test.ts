import assert from 'node:assert/strict';
import { test } from 'vitest';
import { memberIdForBooking, memberOwnsBooking, normalizeMemberEmail } from '@/lib/auth/member-ownership';

test('a verified member can attach only a booking made with the same email address', () => {
  const member = {
    id: '3ca25a7e-6ec9-4e73-a0df-1b68742d8a88',
    email: ' Pilot@Example.com ',
    emailVerified: true,
  };

  assert.equal(memberIdForBooking(member, 'pilot@example.com'), member.id);
  assert.equal(memberIdForBooking(member, 'someone-else@example.com'), undefined);
});

test('an unverified identity cannot claim guest purchase history', () => {
  assert.equal(
    memberIdForBooking(
      { id: '3ca25a7e-6ec9-4e73-a0df-1b68742d8a88', email: 'pilot@example.com', emailVerified: false },
      'pilot@example.com'
    ),
    undefined
  );
});

test('ownership checks rely on the persisted member id, not an email supplied by the browser', () => {
  assert.equal(memberOwnsBooking('member-1', 'member-1'), true);
  assert.equal(memberOwnsBooking('member-1', 'member-2'), false);
  assert.equal(memberOwnsBooking('member-1'), false);
  assert.equal(normalizeMemberEmail(' Pilot@Example.com '), 'pilot@example.com');
});
