import React from 'react';
import type { Metadata } from 'next';

// A post-checkout confirmation has no search value and would otherwise inherit the
// /subscriptions title and indexable robots directive from the parent layout.
export const metadata: Metadata = {
  title: 'Flight Track Order Confirmed | Sim Dream',
  description: 'Your Sim Dream flight track order confirmation and next steps.',
  robots: { index: false, follow: true },
};

export default function SubscriptionsThankYouLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
