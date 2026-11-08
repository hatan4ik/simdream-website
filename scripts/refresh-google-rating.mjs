// Prints lib/reviews/last-known-rating.json as refreshed from the official Places API (New); the workflow writes it.
// Run by .github/workflows/google-rating-refresh.yml; needs GOOGLE_PLACES_API_KEY. No key: a notice on stderr, no output.
import { pathToFileURL } from 'node:url';

export const PLACE_ID = 'ChIJAyYTsyJLHRURRrWPGuNnmn4'; // FACILITY_INFO.placeId; a unit test guards drift

/** @param {{ key?: string, fetchImpl?: (url: string, init: object) => Promise<Response> }} [options] @returns {Promise<string>} the JSON file text, or '' without a key */
export async function fetchRating({ key, fetchImpl = fetch } = {}) {
  if (!key) return '';
  const res = await fetchImpl(`https://places.googleapis.com/v1/places/${PLACE_ID}`, {
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'rating,userRatingCount' },
  });
  if (!res.ok) throw new Error(`Places API answered HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const { rating, userRatingCount: count } = await res.json();
  const stars = Math.round(rating * 10) / 10; // one decimal, as Google displays it
  if (!Number.isFinite(rating) || !(stars > 0 && stars <= 5) || !Number.isInteger(count) || count < 1) {
    throw new Error(`Unexpected Places payload: rating=${JSON.stringify(rating)} userRatingCount=${JSON.stringify(count)}`);
  }
  return `${JSON.stringify({ overallRating: stars, totalReviewsCount: count }, null, 2)}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await fetchRating({ key: process.env.GOOGLE_PLACES_API_KEY?.trim() }).then(
    (json) => (json ? process.stdout.write(json) : console.error('::notice::GOOGLE_PLACES_API_KEY is not set; skipping the Google rating refresh.')),
    (error) => {
      console.error(`::error::${error.message}`);
      process.exitCode = 1;
    },
  );
}
