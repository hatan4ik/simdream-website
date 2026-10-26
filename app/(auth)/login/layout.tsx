import React from 'react';
import type { Metadata } from 'next';

// The login page had no metadata of its own and inherited the home page's title and description.
export const metadata: Metadata = {
  title: 'Pilot Login | Sim Dream Boeing 737 MAX Simulator',
  description: 'Sign in to your Sim Dream pilot account to view your flight bookings, receipts and logbook.',
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
