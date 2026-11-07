'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';
import { useRef } from 'react';
import { useLanguage } from '@/lib/i18n/language-context';
import {
  GIFT_CARD_DESIGNS,
  getGiftCardDesign,
  type GiftCardDesignId,
} from '@/lib/catalog/gift-card-designs';

interface GiftCardDesignPickerProps {
  selectedDesignId: GiftCardDesignId;
  onChange: (designId: GiftCardDesignId) => void;
  label: string;
}

/** Apple-style colour choice that loads only the selected, locally served preview asset. */
export function GiftCardDesignPicker({
  selectedDesignId,
  onChange,
  label,
}: GiftCardDesignPickerProps) {
  const { t } = useLanguage();
  const designRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = getGiftCardDesign(selectedDesignId);

  const chooseAt = (index: number) => {
    const nextIndex = (index + GIFT_CARD_DESIGNS.length) % GIFT_CARD_DESIGNS.length;
    onChange(GIFT_CARD_DESIGNS[nextIndex].id);
    requestAnimationFrame(() => designRefs.current[nextIndex]?.focus());
  };

  return (
    <div className="mt-5" aria-label={label}>
      <figure className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-xl">
        <Image
          key={selected.id}
          data-gift-card-design-preview={selected.id}
          src={selected.image}
          alt={t.vouchers[selected.nameKey]}
          width={960}
          height={536}
          sizes="(max-width: 1024px) 100vw, 42vw"
          unoptimized
          className="block h-auto w-full object-cover"
        />
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-transparent px-4 pb-3 pt-10 text-xs font-semibold text-white">
          {t.vouchers[selected.nameKey]}
        </figcaption>
      </figure>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-2" role="radiogroup" aria-label={label}>
          {GIFT_CARD_DESIGNS.map((design, index) => {
            const selectedDesign = selected.id === design.id;
            return (
              <button
                key={design.id}
                ref={(element) => {
                  designRefs.current[index] = element;
                }}
                data-gift-card-design={design.id}
                type="button"
                role="radio"
                aria-checked={selectedDesign}
                tabIndex={selectedDesign ? 0 : -1}
                aria-label={`${label}: ${t.vouchers[design.nameKey]}`}
                title={t.vouchers[design.nameKey]}
                onClick={() => onChange(design.id)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    chooseAt(index + 1);
                  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    chooseAt(index - 1);
                  } else if (event.key === 'Home') {
                    event.preventDefault();
                    chooseAt(0);
                  } else if (event.key === 'End') {
                    event.preventDefault();
                    chooseAt(GIFT_CARD_DESIGNS.length - 1);
                  }
                }}
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
        <p className="min-w-0 text-xs text-slate-300">
          <span className="font-semibold text-white">{t.vouchers[selected.nameKey]}</span>
        </p>
      </div>
    </div>
  );
}
