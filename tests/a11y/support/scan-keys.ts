import { PUBLIC_ROUTES, type Language, type UiTheme } from '../../support/e2e';

// Single source of the axe scan matrix, shared by the scanning specs and the baseline integrity check.

export const SCAN_THEMES: readonly UiTheme[] = ['cockpit', 'brand', 'studio'];
/**
 * Languages scanned per public route. Arabic is scanned on the main funnel only: RTL plus
 * Arabic shaping is a separate risk from Hebrew, while the remaining routes share its layout.
 */
export const PUBLIC_SCAN_LANGUAGES: ReadonlyArray<{ language: Language; routes: readonly string[] }> = [
  { language: 'en', routes: PUBLIC_ROUTES },
  { language: 'he', routes: PUBLIC_ROUTES },
  { language: 'ar', routes: ['/', '/book', '/vouchers'] },
];
export const MOBILE_SCAN_ROUTES = ['/', '/book', '/vouchers'] as const;
export const ADMIN_SCAN_ROUTES = ['/admin', '/admin/bookings', '/admin/vouchers', '/admin/workshops'] as const;
export const BOOKING_SCAN_STATES = ['add-on step', 'manifest with errors', 'zero-slot state', 'wizard manifest step'] as const;
/** /vouchers states a plain page scan never reaches: the certificate flow is the default, so the Gift Card flow is scanned here. */
export const VOUCHER_SCAN_STATES = ['gift card flow'] as const;
/** Pages outside PUBLIC_ROUTES that customers still land on: post-checkout, member, auth and error pages. */
export const SECONDARY_SCAN_STATES = [
  'boarding pass (paid)',
  'boarding pass (unknown ref)',
  'member dashboard (anonymous)',
  'password reset',
  'auth callback (no code)',
  'not found page',
] as const;

/** The unlisted /refund form: each step, its inline errors, the confirmation and the "nothing was sent" ending. */
export const REFUND_SCAN_STATES = [
  'order step',
  'order step with errors',
  'order step (he)',
  'reason step',
  'review step with errors',
  'request received',
  'unavailable',
] as const;

export type BookingScanState = (typeof BOOKING_SCAN_STATES)[number];
export type RefundScanState = (typeof REFUND_SCAN_STATES)[number];
export type VoucherScanState = (typeof VOUCHER_SCAN_STATES)[number];
export type SecondaryScanState = (typeof SECONDARY_SCAN_STATES)[number];

export const publicScanKey = (route: string, theme: UiTheme, language: Language) => `public ${route} [${theme}/${language}]`;
export const bookingScanKey = (state: BookingScanState, theme: UiTheme) => `booking ${state} [${theme}]`;
export const secondaryScanKey = (state: SecondaryScanState, theme: UiTheme) => `secondary ${state} [${theme}]`;
export const refundScanKey = (state: RefundScanState, theme: UiTheme) => `refund ${state} [${theme}]`;
export const voucherScanKey = (state: VoucherScanState, theme: UiTheme) => `voucher ${state} [${theme}]`;
export const mobileScanKey = (route: string) => `mobile ${route}`;
export const adminScanKey = (route: string) => `admin ${route}`;

/** Every scan key the a11y specs produce. */
export function allScanKeys(): string[] {
  return [
    ...SCAN_THEMES.flatMap((theme) =>
      PUBLIC_SCAN_LANGUAGES.flatMap(({ language, routes }) => routes.map((route) => publicScanKey(route, theme, language)))
    ),
    ...SCAN_THEMES.flatMap((theme) => BOOKING_SCAN_STATES.map((state) => bookingScanKey(state, theme))),
    ...SCAN_THEMES.flatMap((theme) => SECONDARY_SCAN_STATES.map((state) => secondaryScanKey(state, theme))),
    ...SCAN_THEMES.flatMap((theme) => VOUCHER_SCAN_STATES.map((state) => voucherScanKey(state, theme))),
    ...SCAN_THEMES.flatMap((theme) => REFUND_SCAN_STATES.map((state) => refundScanKey(state, theme))),
    ...MOBILE_SCAN_ROUTES.map(mobileScanKey),
    ...ADMIN_SCAN_ROUTES.map(adminScanKey),
  ];
}

/**
 * Tracked known defect for every axe rule the baseline may tolerate. A rule without an entry
 * here cannot be baselined: fix it, or file a defect and add it with its ID.
 */
export const BASELINED_RULE_DEFECTS: Readonly<Record<string, string>> = {
  'color-contrast': 'UX-24',
  'label-content-name-mismatch': 'UX-25',
  'nested-interactive': 'UX-26',
  'button-name': 'UX-27',
  'target-size': 'UX-12',
  label: 'UX-19',
  'select-name': 'UX-19',
};
