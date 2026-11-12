import React from 'react';
import { RefundPageHeader, RefundRequestView } from '@/components/refund';

export default function RefundPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl flex-1 space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <RefundPageHeader />
      <RefundRequestView />
    </div>
  );
}
