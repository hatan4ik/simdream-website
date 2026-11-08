import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { FACILITY_INFO } from '@/lib/config/facility-info';
import { fetchRating, PLACE_ID } from '../../scripts/refresh-google-rating.mjs';

const SCRIPT = fileURLToPath(new URL('../../scripts/refresh-google-rating.mjs', import.meta.url));
const respond = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
/** The exact text of lib/reviews/last-known-rating.json, which the workflow writes from the script's output. */
const fileText = (overallRating: number, totalReviewsCount: number) => `{\n  "overallRating": ${overallRating},\n  "totalReviewsCount": ${totalReviewsCount}\n}\n`;

describe('refresh-google-rating', () => {
  it('asks the official Places API (New) for only the rating and the count', async () => {
    const fetchImpl = vi.fn().mockReturnValue(respond({ rating: 5, userRatingCount: 422 }));

    await fetchRating({ key: 'test-key', fetchImpl });

    expect(PLACE_ID).toBe(FACILITY_INFO.placeId); // the constant is hard-coded, so this guards drift
    expect(fetchImpl).toHaveBeenCalledWith(`https://places.googleapis.com/v1/places/${FACILITY_INFO.placeId}`, {
      headers: { 'X-Goog-Api-Key': 'test-key', 'X-Goog-FieldMask': 'rating,userRatingCount' },
    });
  });

  it('returns the validated numbers in the data file format: 2-space JSON, grade first, trailing newline', async () => {
    await expect(fetchRating({ key: 'k', fetchImpl: () => respond({ rating: 4.9, userRatingCount: 423, ignored: 'x' }) })).resolves.toBe(fileText(4.9, 423));
    await expect(fetchRating({ key: 'k', fetchImpl: () => respond({ rating: 5, userRatingCount: 422 }) })).resolves.toBe(fileText(5, 422));
  });

  it.each([
    [4.86, 4.9],
    [4.04, 4],
    [4.96, 5],
    [4.9, 4.9],
  ])('rounds %s to the one decimal Google displays (%s)', async (rating, expected) => {
    await expect(fetchRating({ key: 'k', fetchImpl: () => respond({ rating, userRatingCount: 500 }) })).resolves.toBe(fileText(expected, 500));
  });

  it('returns nothing, and never calls Google, when the key is missing', async () => {
    const fetchImpl = vi.fn();

    for (const key of [undefined, '']) {
      await expect(fetchRating({ key, fetchImpl })).resolves.toBe('');
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails on an HTTP error', async () => {
    const fetchImpl = () => respond({ error: { message: 'API key not valid.' } }, 403);

    await expect(fetchRating({ key: 'bad', fetchImpl })).rejects.toThrow(/HTTP 403.*API key not valid/);
  });

  it.each([
    ['an empty payload', {}],
    ['a missing count', { rating: 4.8 }],
    ['a missing rating', { userRatingCount: 10 }],
    ['a rating sent as text', { rating: '4.8', userRatingCount: 10 }],
    ['a count sent as text', { rating: 4.8, userRatingCount: '10' }],
    ['a fractional count', { rating: 4.8, userRatingCount: 10.5 }],
    ['a zero count', { rating: 5, userRatingCount: 0 }],
    ['a negative count', { rating: 5, userRatingCount: -3 }],
    ['a zero rating', { rating: 0, userRatingCount: 10 }],
    ['a rating above five', { rating: 5.4, userRatingCount: 10 }],
    ['a negative rating', { rating: -1, userRatingCount: 10 }],
    ['a null rating', { rating: null, userRatingCount: 10 }],
    ['a payload that is not an object', null],
  ])('rejects %s', async (_label, payload) => {
    await expect(fetchRating({ key: 'k', fetchImpl: () => respond(payload) })).rejects.toThrow();
  });

  it('touches no file: the workflow writes the data file, the script only prints it', () => {
    expect(readFileSync(SCRIPT, 'utf8')).not.toMatch(/node:fs|writeFile|readFile/);
  });

  describe('as the CLI that the workflow runs', () => {
    const STUB = fileURLToPath(new URL('./_support/stub-places-fetch.mjs', import.meta.url));
    const run = (env: Record<string, string>, google?: { status: number; body: string }) =>
      spawnSync(process.execPath, [...(google ? ['--import', STUB] : []), SCRIPT], {
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH ?? '',
          NODE_ENV: 'test',
          ...(google && { STUB_PLACES_STATUS: String(google.status), STUB_PLACES_BODY: google.body }),
          ...env,
        },
      });

    it('prints exactly the data file text on stdout and nothing else', () => {
      const result = run({ GOOGLE_PLACES_API_KEY: 'k' }, { status: 200, body: '{"rating":4.86,"userRatingCount":500}' });

      expect(result.status).toBe(0);
      expect(result.stdout).toBe(fileText(4.9, 500));
      expect(result.stderr).toBe('');
    });

    it('exits 0 with a notice on stderr and an empty stdout when the key is missing', () => {
      const result = run({});

      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
      expect(result.stderr).toMatch(/^::notice::GOOGLE_PLACES_API_KEY is not set/);
    });

    it('exits 1 with an error annotation and an empty stdout when Google answers badly', () => {
      const result = run({ GOOGLE_PLACES_API_KEY: 'k' }, { status: 500, body: 'nope' });

      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('::error::Places API answered HTTP 500: nope');
    });

    it('exits 1 with an empty stdout on an implausible payload', () => {
      const result = run({ GOOGLE_PLACES_API_KEY: 'k' }, { status: 200, body: '{"rating":5,"userRatingCount":0}' });

      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('::error::Unexpected Places payload');
    });
  });
});
