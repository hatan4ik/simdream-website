'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import {
  GIFT_CARD_DESIGNS,
  type GiftCardDesignId,
} from '@/lib/catalog/gift-card-designs';

interface GiftCardDesignPickerProps {
  selectedDesignId: GiftCardDesignId;
  onChange: (designId: GiftCardDesignId) => void;
  label: string;
  selectedLabel: string;
}

/** Apple-style colour choice that only loads the selected preview asset. */
export function GiftCardDesignPicker({
  selectedDesignId,
  onChange,
  label,
  selectedLabel,
}: GiftCardDesignPickerProps) {
  const { t } = useLanguage();
  const selected = GIFT_CARD_DESIGNS.find((design) => design.id === selectedDesignId) ?? GIFT_CARD_DESIGNS[0];

  return (
    <div className="mt-5" aria-label={label}>
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-xl">
        <Image
          key={selected.id}
          data-gift-card-design-preview={selected.id}
          src={selected.image}
          alt=""
          width={960}
          height={536}
          sizes="(max-width: 1024px) 100vw, 42vw"
          quality={76}
          className="h-auto w-full object-cover opacity-35 transition-opacity duration-200"
        />
        <div className="pointer-events-none absolute inset-0 bg-slate-950/55" />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-2" role="radiogroup" aria-label={label}>
          {GIFT_CARD_DESIGNS.map((design) => {
            const selectedDesign = selected.id === design.id;
            return (
              <button
                key={design.id}
                data-gift-card-design={design.id}
                type="button"
                role="radio"
                aria-checked={selectedDesign}
                aria-label={`${label}: ${t.vouchers[design.nameKey]}`}
                title={t.vouchers[design.nameKey]}
                onClick={() => onChange(design.id)}
                className="relative inline-flex h-12 w-12 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <span
                  aria-hidden="true"
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border-2 transition ${
                  selectedDesign
                    ? 'border-white ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-950'
                    : 'border-white/30 hover:border-white/75'
                  }`}
                  style={{ background: design.swatch }}
                >
                  {selectedDesign && <Check className="h-4 w-4 text-white drop-shadow" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-300">
          <span className="font-semibold text-white">{t.vouchers[selected.nameKey]}</span>
          <span className="text-slate-500"> · {selectedLabel}</span>
        </p>
      </div>
    </div>
  );
}
