import 'server-only';

import { isReviewLanguage, type ReviewLanguage } from './review-language';

/**
 * Google Places never translates reviews: asked for a language it only *selects* reviews written
 * in that language, and asked for the newest reviews it returns the originals (checked live on
 * 2026-11-11: `translated=false` for every language and sort). The translation the bar shows under
 * "Translated by Google" therefore comes from Google Cloud Translation (Basic, v2), which accepts
 * the same API key once "Cloud Translation API" is enabled on the project and allowed in the key's
 * API restriction. One request per page language carries every review that was not written in
 * that language; the response keeps the request order.
 */
export const CLOUD_TRANSLATION_URL = 'https://translation.googleapis.com/language/translate/v2';

/** Google tags Hebrew with the legacy code `iw` and sometimes mislabels it as Yiddish (`yi`). */
const GOOGLE_LANGUAGE_ALIASES: Record<string, ReviewLanguage> = { iw: 'he', yi: 'he' };

/** The site language a Google language tag maps to, or null when the tag is missing or unsupported. */
export function reviewLanguageFromGoogle(value: string | undefined | null): ReviewLanguage | null {
  const code = (value ?? '').toLowerCase().split(/[-_]/)[0];
  if (!code) return null;
  const normalized = GOOGLE_LANGUAGE_ALIASES[code] ?? code;
  return isReviewLanguage(normalized) ? normalized : null;
}

export type TranslateFetch = (url: string, init?: RequestInit) => Promise<Response>;

export class ReviewTranslationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewTranslationError';
  }
}

export interface Translation {
  text: string;
  /** Google's detected source language, mapped to a site language when it is one. */
  detectedLanguage: ReviewLanguage | null;
}

interface CloudTranslationResponse {
  data?: { translations?: Array<{ translatedText?: string; detectedSourceLanguage?: string }> };
  error?: { status?: string; message?: string };
}

/**
 * Translates `texts` into `target` in one request (Google detects each segment's language and
 * reports it). Throws `ReviewTranslationError` with Google's status text, never the key.
 */
export async function translateTexts({
  key,
  texts,
  target,
  fetchImpl = fetch,
}: {
  key: string;
  texts: readonly string[];
  target: ReviewLanguage;
  fetchImpl?: TranslateFetch;
}): Promise<Translation[]> {
  if (texts.length === 0) return [];
  const url = new URL(CLOUD_TRANSLATION_URL);
  url.searchParams.set('key', key);
  const response = await fetchImpl(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: texts, target, format: 'text' }),
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => ({}))) as CloudTranslationResponse;
  if (!response.ok) {
    throw new ReviewTranslationError(
      `Cloud Translation returned ${response.status}${payload.error?.status ? ` ${payload.error.status}` : ''}${payload.error?.message ? `: ${payload.error.message}` : ''}.`
    );
  }
  const translations = payload.data?.translations;
  if (!Array.isArray(translations) || translations.length !== texts.length) {
    throw new ReviewTranslationError(`Cloud Translation answered ${translations?.length ?? 0} translation(s) for ${texts.length} text(s).`);
  }
  return translations.map((entry, index) => ({
    text: typeof entry.translatedText === 'string' && entry.translatedText.trim() ? entry.translatedText.trim() : texts[index],
    detectedLanguage: reviewLanguageFromGoogle(entry.detectedSourceLanguage),
  }));
}
