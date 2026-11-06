import { describe, expect, it } from 'vitest';
import { readWixMemberProfile } from '@/lib/wix/member-profile';

describe('Wix member profile projection', () => {
  it('keeps a Google-linked member signed in when Wix supplies email through contact data', () => {
    expect(
      readWixMemberProfile({
        _id: 'wix-google-member',
        loginEmailVerified: true,
        profile: { nickname: 'Google Captain' },
        contact: { emails: ['captain@gmail.example'], phones: ['+972501234567'] },
        _createdDate: '2026-11-06T10:00:00.000Z',
      })
    ).toEqual({
      id: 'wix-google-member',
      email: 'captain@gmail.example',
      emailVerified: true,
      fullName: 'Google Captain',
      phone: '+972501234567',
      createdAt: '2026-11-06T10:00:00.000Z',
    });
  });

  it('treats a member ID as authenticated identity even when no email is currently returned', () => {
    expect(readWixMemberProfile({ _id: 'wix-member-without-email', profile: { nickname: 'Captain' } })).toEqual({
      id: 'wix-member-without-email',
      email: undefined,
      emailVerified: false,
      fullName: 'Captain',
      phone: undefined,
      createdAt: undefined,
    });
  });

  it('rejects payloads that have no immutable Wix member ID', () => {
    expect(readWixMemberProfile({ loginEmail: 'captain@example.test' })).toBeNull();
  });
});
