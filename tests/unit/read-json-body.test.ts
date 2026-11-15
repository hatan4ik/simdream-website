import { describe, expect, it } from 'vitest';
import { readJsonBody, type ReadJsonBodyResult } from '@/lib/http/read-json-body';

const URL_ = 'http://localhost:3000/api/probe';
const MAX = 64;

function jsonRequest(raw: string, headers: Record<string, string> = { 'content-type': 'application/json' }): Request {
  return new Request(URL_, { method: 'POST', headers, body: raw });
}

/** A body that arrives in chunks with no Content-Length, the way a chunked upload does. */
function chunkedRequest(chunks: Uint8Array[], onPull?: () => void, extraHeaders: Record<string, string> = {}): Request {
  let index = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      onPull?.();
      if (index < chunks.length) controller.enqueue(chunks[index++]);
      else controller.close();
    },
  });
  return new Request(URL_, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...extraHeaders },
    body: stream,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
}

async function failure(result: ReadJsonBodyResult) {
  if (result.ok) throw new Error('expected the body to be refused');
  return {
    status: result.response.status,
    cacheControl: result.response.headers.get('cache-control'),
    body: (await result.response.json()) as unknown,
  };
}

describe('readJsonBody', () => {
  it('returns the parsed body of a JSON request', async () => {
    const result = await readJsonBody(jsonRequest('{"a":1,"b":["x"]}'), { maxBytes: MAX });

    expect(result).toEqual({ ok: true, body: { a: 1, b: ['x'] } });
  });

  it('hands back any JSON value for the caller schema to judge, including null and arrays', async () => {
    expect(await readJsonBody(jsonRequest('null'), { maxBytes: MAX })).toEqual({ ok: true, body: null });
    expect(await readJsonBody(jsonRequest('[1,2]'), { maxBytes: MAX })).toEqual({ ok: true, body: [1, 2] });
  });

  it('accepts a body of exactly maxBytes', async () => {
    const raw = JSON.stringify({ v: 'x'.repeat(MAX - '{"v":""}'.length) });
    expect(new TextEncoder().encode(raw).byteLength).toBe(MAX);

    expect((await readJsonBody(jsonRequest(raw), { maxBytes: MAX })).ok).toBe(true);
  });

  it('refuses malformed and empty JSON with 400, no-store', async () => {
    for (const raw of ['{', '', 'not json', '{"a":}']) {
      const refused = await failure(await readJsonBody(jsonRequest(raw), { maxBytes: MAX }));
      expect(refused).toEqual({ status: 400, cacheControl: 'no-store', body: { error: 'Invalid JSON request body.' } });
    }
  });

  describe('content type', () => {
    it('is not checked unless requireJsonContentType is set', async () => {
      const result = await readJsonBody(jsonRequest('{"a":1}', {}), { maxBytes: MAX });

      expect(result).toEqual({ ok: true, body: { a: 1 } });
    });

    it('answers 415 without application/json when it is required', async () => {
      for (const headers of [{}, { 'content-type': 'text/plain' }, { 'content-type': 'application/x-www-form-urlencoded' }] as Array<Record<string, string>>) {
        const refused = await failure(await readJsonBody(jsonRequest('{"a":1}', headers), { maxBytes: MAX, requireJsonContentType: true }));
        expect(refused).toEqual({ status: 415, cacheControl: 'no-store', body: { error: 'Send the request as application/json.' } });
      }
    });

    it('accepts application/json with a charset or in another case when it is required', async () => {
      for (const type of ['application/json; charset=utf-8', 'Application/JSON']) {
        const result = await readJsonBody(jsonRequest('{"a":1}', { 'content-type': type }), { maxBytes: MAX, requireJsonContentType: true });
        expect(result).toEqual({ ok: true, body: { a: 1 } });
      }
    });

    it('checks the content type before the size', async () => {
      const refused = await failure(
        await readJsonBody(jsonRequest('x'.repeat(MAX + 1), { 'content-type': 'text/plain' }), { maxBytes: MAX, requireJsonContentType: true })
      );

      expect(refused.status).toBe(415);
    });
  });

  describe('size cap', () => {
    const tooLarge = { status: 413, cacheControl: 'no-store', body: { error: 'Request body is too large.' } };

    it('answers 413 when the declared content-length is over the cap, without reading the body', async () => {
      const request = chunkedRequest([new Uint8Array(4)], undefined, { 'content-length': String(MAX + 1) });

      expect(await failure(await readJsonBody(request, { maxBytes: MAX }))).toEqual(tooLarge);
      expect(request.bodyUsed).toBe(false);
    });

    it('answers 413 when the actual byte length is over the cap although the header is missing or understated', async () => {
      const raw = JSON.stringify({ v: 'x'.repeat(MAX) });

      expect(await failure(await readJsonBody(jsonRequest(raw), { maxBytes: MAX }))).toEqual(tooLarge);
      expect(await failure(await readJsonBody(jsonRequest(raw, { 'content-type': 'application/json', 'content-length': '5' }), { maxBytes: MAX }))).toEqual(
        tooLarge
      );
    });

    it('counts bytes, not characters', async () => {
      // 29 two-byte characters inside the JSON braces and quotes: 37 characters, 66 bytes.
      const raw = JSON.stringify({ v: 'é'.repeat(MAX / 2 - 3) });
      expect(raw.length).toBeLessThanOrEqual(MAX);
      expect(new TextEncoder().encode(raw).byteLength).toBeGreaterThan(MAX);

      expect(await failure(await readJsonBody(jsonRequest(raw), { maxBytes: MAX }))).toEqual(tooLarge);
    });

    it('ignores a content-length that is not a number and still enforces the real size', async () => {
      const raw = JSON.stringify({ v: 'x'.repeat(MAX) });
      const request = jsonRequest(raw, { 'content-type': 'application/json', 'content-length': 'abc' });

      expect(await failure(await readJsonBody(request, { maxBytes: MAX }))).toEqual(tooLarge);
    });

    it('stops reading a chunked body as soon as it passes the cap', async () => {
      let pulls = 0;
      const chunk = new TextEncoder().encode('x'.repeat(16));
      // Unbounded in principle: 1,000 chunks of 16 bytes against a 64 byte cap.
      const request = chunkedRequest(Array.from({ length: 1_000 }, () => chunk), () => (pulls += 1));

      expect(await failure(await readJsonBody(request, { maxBytes: MAX }))).toEqual(tooLarge);
      expect(pulls).toBeLessThan(20);
    });

    it('reads a chunked body that stays within the cap', async () => {
      const encoder = new TextEncoder();
      const request = chunkedRequest([encoder.encode('{"a":'), encoder.encode('"é"'), encoder.encode('}')]);

      expect(await readJsonBody(request, { maxBytes: MAX })).toEqual({ ok: true, body: { a: 'é' } });
    });
  });
});
