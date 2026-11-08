'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';
import { useRef } from 'react';
import { useLanguage } from '@/lib/i18n/language-context';
import {
  GIFT_CARD_ART,
  GIFT_CARD_DESIGNS,
  getGiftCardDesign,
  type GiftCardDesignId,
} from '@/lib/catalog/gift-card-designs';

interface GiftCardDesignPickerProps {
  selectedDesignId: GiftCardDesignId;
  onChange: (designId: GiftCardDesignId) => void;
  label: string;
}

/** Apple-style colour choice that loads only the selected, locally served preview asset, shown whole. */
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
    <div className="w-full" aria-label={label}>
      {/* The art is one shared canvas with the whole card centred on it (see GIFT_CARD_ART), so it
          is shown uncropped at its natural proportions on every screen. The name sits beside the
          swatches below; a caption over the card would cover its tagline. */}
      <figure className="relative flex w-full items-center justify-center overflow-clip bg-gradient-to-b from-slate-900 to-slate-950 px-2 pb-1 pt-3 sm:px-5 sm:pb-2 sm:pt-5">
        <Image
          key={selected.id}
          data-gift-card-design-preview={selected.id}
          src={selected.image}
          alt={t.vouchers[selected.nameKey]}
          width={GIFT_CARD_ART.width}
          height={GIFT_CARD_ART.height}
          sizes="(max-width: 1024px) 100vw, 42vw"
          unoptimized
          className="block h-auto w-full max-w-[42rem] drop-shadow-[0_16px_22px_rgba(2,6,23,0.5)]"
        />
        <figcaption className="sr-only">{t.vouchers[selected.nameKey]}</figcaption>
      </figure>

      {/* The seven swatches share the panel width in a grid of 44px-minimum cells. A fixed-width row was
          wider than a phone panel, and focusing its last swatch scrolled the whole panel sideways,
          dragging the card left and cutting its text. */}
      <div className="@container px-5 sm:px-6 pt-3 pb-1">
        {/* Seven columns as soon as seven 44px cells fit the panel (19.25rem); a narrower panel
            wraps five and two instead of leaving one swatch alone on a row. */}
        <div
          className="grid max-w-[21rem] grid-cols-5 @[19.25rem]:grid-cols-7"
          role="radiogroup"
          aria-label={label}
        >
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
                className="relative inline-flex h-12 w-full items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
        <p className="mt-1 min-w-0 text-xs text-slate-300">
          <span className="font-semibold text-white">{t.vouchers[selected.nameKey]}</span>
        </p>
      </div>
    </div>
  );
}
