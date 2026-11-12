import type { FieldErrorCode, RefundProductKind, RefundReason } from '@/lib/refund';

export type RefundStep = 1 | 2 | 3;

export interface RefundFormValues {
  productKind: RefundProductKind;
  orderReference: string;
  email: string;
  name: string;
  phone: string;
  sessionDate: string;
  sessionTime: string;
  reason: RefundReason | '';
  message: string;
  acceptedTruth: boolean;
  acceptedRules: boolean;
  /** Honeypot: stays empty for a person. */
  website: string;
}

export type FormErrors = Partial<Record<keyof RefundFormValues, FieldErrorCode>>;

/** What the lookup route reveals about a matching order. */
export interface VerifiedOrder {
  productKind: RefundProductKind;
  packageTitle: string | null;
  sessionDate: string | null;
  sessionTime: string | null;
  orderDate: string;
}

export type Verification =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'verified'; order: VerifiedOrder }
  | { state: 'unverified' }
  | { state: 'unavailable' };

export interface RefundReceiptView {
  reference: string;
  receivedAt: string;
  duplicate: boolean;
  acknowledged: boolean;
  urgent: boolean;
}

export type SubmitPhase =
  | { phase: 'editing' }
  | { phase: 'sending' }
  | { phase: 'done'; receipt: RefundReceiptView }
  | { phase: 'unavailable' };

export type BannerKind = 'network' | 'server' | 'rateLimited' | 'invalid' | null;

export const EMPTY_VALUES: RefundFormValues = {
  productKind: 'flight',
  orderReference: '',
  email: '',
  name: '',
  phone: '',
  sessionDate: '',
  sessionTime: '',
  reason: '',
  message: '',
  acceptedTruth: false,
  acceptedRules: false,
  website: '',
};
