/**
 * Deadlines for outbound reads. A Worker request that waits on a hung upstream holds the visitor's
 * response open and, on checkout, the booking behind it. Only idempotent reads carry one: an abort on
 * a call that creates something (a Wix cart, a Stripe session) could leave an orphan, so those do not.
 */

/** Verifying a member token happens on every authenticated checkout, so it gets the shortest deadline. */
export const AUTH_READ_TIMEOUT_MS = 5_000;

/** Wix catalog, availability and calendar reads, and Google Places and Cloud Translation reads. */
export const UPSTREAM_READ_TIMEOUT_MS = 8_000;

/** All pages of one Wix availability query together; each page also has its own read deadline. */
export const AVAILABILITY_TOTAL_TIMEOUT_MS = 20_000;
