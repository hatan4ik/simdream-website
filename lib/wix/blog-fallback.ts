/**
 * A fallback to the local Hebrew articles is a degraded answer and must never be silent: a rejected Wix query
 * once served every translated article in Hebrew for hours without a signal (2026-11-24). The log line carries
 * the language and Wix's own message only, never request data.
 */

export const FALLBACK_REASON_NO_POST = 'Wix returned no post in that language';
export const FALLBACK_REASON_NO_SLUG = 'Wix returned no post for that slug';
export const FALLBACK_REASON_SHAPE = 'the Wix response did not match the expected shape';

export function describeWixFailure(error: unknown): string {
  return `the request failed: ${error instanceof Error ? error.message.slice(0, 200) : 'unknown error'}`;
}

export function warnBlogFallback(operation: 'list' | 'post', language: string, reason: string): void {
  console.warn(`Wix blog ${operation} for language "${language}" fell back to the local articles: ${reason}`);
}
