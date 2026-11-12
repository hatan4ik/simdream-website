import type { ReactNode } from 'react';
import { BirthdayDiscountLine } from './BirthdayDiscountLine';
import { BirthdayField } from './BirthdayField';
import { ConsentBlock } from './ConsentBlock';
import type { BookingExtras } from './hooks';

export interface BookingExtraSlots {
  /** The mandatory birthday field, for the pilot form column. */
  extraFields: ReactNode;
  /** The two mandatory confirmations, directly above the submit button. */
  agreements: ReactNode;
  /** The birthday discount row of the order summary. */
  extraDiscountLines: ReactNode;
}

/**
 * The checkout extras as ready-made nodes for the seams of `PilotManifestStep` (guided steps) and
 * `AmazonFlightStorefront` (Express Shop). One definition, so both views carry exactly the same field,
 * confirmations and discount row.
 */
export function bookingExtraSlots(extras: BookingExtras, variant: 'wizard' | 'storefront'): BookingExtraSlots {
  return {
    extraFields: <BirthdayField birthday={extras.birthday} variant={variant} />,
    agreements: <ConsentBlock consent={extras.consent} />,
    extraDiscountLines: (
      <BirthdayDiscountLine
        discountIls={extras.birthday.discountIls}
        reserveSpace={variant === 'storefront' && extras.birthday.discountPossible}
      />
    ),
  };
}
