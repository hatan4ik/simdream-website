import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OrderSummary } from '@/components/booking/OrderSummary';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { translations } from '@/lib/i18n/translations';
import type { FlightAddon, FlightSlot, MissionManifestCalculation } from '@/types';

const ADDONS: FlightAddon[] = [
  {
    id: 'addon-cold-dark',
    name: 'Cold & Dark Startup',
    description: 'Full pre-flight cockpit initialization.',
    priceIls: 150,
    durationMinutes: 15,
    icon: 'Zap',
  },
];

const SLOT: FlightSlot = {
  id: 'slot-1015',
  date: '2026-11-09',
  startTime: '10:15',
  endTime: '11:15',
  reservedEndTime: '11:30',
  durationMinutes: 60,
  totalReservedMinutes: 75,
  available: true,
  blockPeriod: 'morning',
  blockLabel: 'Block 1',
  isPrimeTime: false,
  dynamicPriceIls: 690,
  basePriceIls: 690,
  yieldPerMinIls: 11.5,
  maxAvailableMinutes: 120,
};

const MANIFEST: MissionManifestCalculation = {
  cleanPackageTitle: "Captain's Command 60",
  baseDurationMinutes: 60,
  addonsDurationMinutes: 15,
  totalDurationMinutes: 75,
  startTime: '10:15',
  effectiveEndTime: '11:30',
  maxAvailableMinutes: 120,
  basePriceIls: 690,
  addonsPriceIls: 150,
  subtotalIls: 840,
  discountIls: 0,
  totalIls: 840,
  selectedAddonItems: [
    {
      addon: ADDONS[0],
      durationMinutes: 15,
      priceIls: 150,
    },
  ],
};

function findButtonByAriaLabel(
  node: React.ReactNode,
  ariaLabel: string
): React.ReactElement<{ onClick?: () => void }> | null {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findButtonByAriaLabel(child, ariaLabel);
      if (found) return found;
    }
    return null;
  }
  if (!React.isValidElement(node)) return null;
  const props = node.props as { 'aria-label'?: string; children?: React.ReactNode; onClick?: () => void };
  if (node.type === 'button' && props['aria-label'] === ariaLabel) {
    return node as React.ReactElement<{ onClick?: () => void }>;
  }
  return findButtonByAriaLabel(props.children, ariaLabel);
}

vi.mock('@/lib/i18n/language-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/i18n/language-context')>();
  return {
    ...actual,
    useLanguage: () => ({
      language: 'en' as const,
      setLanguage: () => {},
      t: translations.en,
      isRTL: false,
    }),
  };
});

describe('OrderSummary add-on remove button', () => {
  it('omits the remove button when onRemoveAddon is not provided', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        LanguageProvider,
        { initialLanguage: 'en', children: null },
        React.createElement(OrderSummary, {
          manifest: MANIFEST,
          selectedDate: '2026-11-09',
          selectedSlot: SLOT,
          selectedAddonIds: ['addon-cold-dark'],
          addons: ADDONS,
          discount: { amountIls: 0, label: '', code: undefined },
          totalIls: 840,
          redeem: null,
          children: null,
        })
      )
    );

    expect(html).not.toContain('aria-label="Remove Cold &amp; Dark Startup"');
  });

  it('renders the remove button when onRemoveAddon is provided and invokes it on click', () => {
    const onRemoveAddon = vi.fn();
    const props = {
      manifest: MANIFEST,
      selectedDate: '2026-11-09',
      selectedSlot: SLOT,
      selectedAddonIds: ['addon-cold-dark'],
      addons: ADDONS,
      onRemoveAddon,
      discount: { amountIls: 0, label: '', code: undefined },
      totalIls: 840,
      redeem: null,
      children: null,
    };

    const html = renderToStaticMarkup(React.createElement(OrderSummary, props));
    expect(html).toContain('aria-label="Remove Cold &amp; Dark Startup"');

    const tree = OrderSummary(props);
    const removeButton = findButtonByAriaLabel(tree, 'Remove Cold & Dark Startup');
    expect(removeButton).not.toBeNull();
    removeButton?.props.onClick?.();
    expect(onRemoveAddon).toHaveBeenCalledTimes(1);
    expect(onRemoveAddon).toHaveBeenCalledWith('addon-cold-dark');
  });
});
