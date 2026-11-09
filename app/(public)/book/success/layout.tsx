import React from 'react';
import type { Metadata } from 'next';

// A post-checkout confirmation has no search value and would otherwise inherit the
// /book title and indexable robots directive from the parent layout.
export const metadata: Metadata = {
  title: 'Booking Confirmed | Sim Dream Boeing 737 Flight Simulator',
  description: 'Your Sim Dream flight simulator booking details and dispatch confirmation.',
  robots: { index: false, follow: true },
};

export default function BookSuccessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
