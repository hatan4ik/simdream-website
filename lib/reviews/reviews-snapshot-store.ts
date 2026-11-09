import 'server-only';

import { isProduction } from '@/lib/config/server-env';
import { PersistenceError } from '@/lib/db/store';
import { getSupabaseAdmin, requireSupabaseAdmin } from '@/lib/db/supabase-admin';
import { isReviewLanguage, REVIEW_LANGUAGES, type ReviewLanguage } from './review-language';
import type { GoogleReview, StoredReviewsSnapshot } from './google-reviews-source';

/**
 * Persistence for the twice-daily Google reviews snapshot (migration 009). One row, id 1,
 * replaced on every refresh. The same rules as the order store (AGENTS.md §6): Supabase in
 * production, the process memory in development and tests, and production without Supabase
 * fails closed unless ALLOW_IN_MEMORY_STORE=true opts a demo server in explicitly.
 */
const TABLE = 'google_reviews_snapshot';
const ROW_ID = 1;

interface SnapshotRow {
  id: number;
  fetched_at: string;
  source: string;
  overall_rating: number | string;
  total_reviews_count: number;
  reviews_by_language: unknown;
}

type SnapshotGlobal = typeof globalThis & { __simDreamReviewsSnapshotV1?: StoredReviewsSnapshot | null };
const memory = globalThis as SnapshotGlobal;

/** True when the snapshot lives in Supabase; throws when production has no storage. */
function persistent(): boolean {
  if (!isProduction) return false;
  if (getSupabaseAdmin()) return true;
  if (process.env.ALLOW_IN_MEMORY_STORE === 'true') return false;
  throw new PersistenceError('Persistent storage is not configured.');
}

function isReview(value: unknown): value is GoogleReview {
  if (!value || typeof value !== 'object') return false;
  const review = value as Partial<GoogleReview>;
  return typeof review.id === 'string' && typeof review.author === 'string' && typeof review.quote === 'string' && typeof review.rating === 'number';
}

/** Only well-formed review lists come back from storage; anything else counts as "no reviews" for that language. */
function reviewsByLanguageFrom(value: unknown): Record<ReviewLanguage, GoogleReview[]> {
  const stored = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const result = {} as Record<ReviewLanguage, GoogleReview[]>;
  for (const language of REVIEW_LANGUAGES) {
    const list = stored[language];
    result[language] = Array.isArray(list) ? list.filter(isReview).filter((review) => isReviewLanguage(review.language)) : [];
  }
  return result;
}

function fromRow(row: SnapshotRow): StoredReviewsSnapshot {
  return {
    fetchedAt: new Date(row.fetched_at).toISOString(),
    source: row.source,
    overallRating: Number(row.overall_rating) || 0,
    totalReviewsCount: Number(row.total_reviews_count) || 0,
    reviewsByLanguage: reviewsByLanguageFrom(row.reviews_by_language),
  };
}

export async function readReviewsSnapshot(): Promise<StoredReviewsSnapshot | null> {
  if (!persistent()) return memory.__simDreamReviewsSnapshotV1 ?? null;
  const { data, error } = await requireSupabaseAdmin().from(TABLE).select('*').eq('id', ROW_ID).maybeSingle();
  if (error) {
    console.error('Google reviews snapshot read failed', error.message);
    throw new PersistenceError('Persistent storage operation failed.');
  }
  return data ? fromRow(data as SnapshotRow) : null;
}

export async function saveReviewsSnapshot(snapshot: StoredReviewsSnapshot): Promise<void> {
  if (!persistent()) {
    memory.__simDreamReviewsSnapshotV1 = snapshot;
    return;
  }
  const { error } = await requireSupabaseAdmin()
    .from(TABLE)
    .upsert(
      {
        id: ROW_ID,
        fetched_at: snapshot.fetchedAt,
        source: snapshot.source,
        overall_rating: snapshot.overallRating,
        total_reviews_count: snapshot.totalReviewsCount,
        reviews_by_language: snapshot.reviewsByLanguage,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  if (error) {
    console.error('Google reviews snapshot write failed', error.message);
    throw new PersistenceError('Persistent storage operation failed.');
  }
}

/** Test and demo helper: forgets the in-memory snapshot (a no-op for Supabase). */
export function forgetInMemoryReviewsSnapshot(): void {
  delete memory.__simDreamReviewsSnapshotV1;
}
