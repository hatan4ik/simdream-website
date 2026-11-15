'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/language-context';

export interface VoucherSenderFieldsProps {
  senderName: string;
  onSenderNameChange: (value: string) => void;
  senderEmail: string;
  onSenderEmailChange: (value: string) => void;
  senderPhone: string;
  onSenderPhoneChange: (value: string) => void;
  onFieldBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
}

const INPUT_CLASS =
  'w-full max-sm:min-h-11 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500';

/** Buyer (sender) contact inputs collected on `/vouchers` and forwarded to Wix Hosted Checkout. */
export function VoucherSenderFields({
  senderName,
  onSenderNameChange,
  senderEmail,
  onSenderEmailChange,
  senderPhone,
  onSenderPhoneChange,
  onFieldBlur,
}: VoucherSenderFieldsProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label htmlFor="voucher-sender-name" className="block text-xs font-medium text-slate-300 mb-1.5">
          {t.vouchers.senderNameLabel}
        </label>
        <input
          id="voucher-sender-name"
          name="senderName"
          type="text"
          required
          autoComplete="name"
          value={senderName}
          onChange={(e) => onSenderNameChange(e.target.value)}
          onBlur={onFieldBlur}
          placeholder={t.vouchers.senderNamePlaceholder}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label htmlFor="voucher-sender-email" className="block text-xs font-medium text-slate-300 mb-1.5">
          {t.vouchers.senderEmailLabel}
        </label>
        <input
          id="voucher-sender-email"
          name="senderEmail"
          type="email"
          required
          autoComplete="email"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={senderEmail}
          onChange={(e) => onSenderEmailChange(e.target.value)}
          onBlur={onFieldBlur}
          placeholder={t.vouchers.senderEmailPlaceholder}
          className={INPUT_CLASS}
          dir="ltr"
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="voucher-sender-phone" className="block text-xs font-medium text-slate-300 mb-1.5">
          {t.vouchers.senderPhoneLabel}
        </label>
        <input
          id="voucher-sender-phone"
          name="senderPhone"
          type="tel"
          required
          autoComplete="tel"
          value={senderPhone}
          onChange={(e) => onSenderPhoneChange(e.target.value)}
          onBlur={onFieldBlur}
          placeholder={t.vouchers.senderPhonePlaceholder}
          className={`${INPUT_CLASS} text-left rtl:text-right`}
          dir="ltr"
        />
      </div>
    </div>
  );
}
