import 'server-only';

import { NextResponse } from 'next/server';

/**
 * Reads the JSON body of a public POST with a hard size cap, or returns the response to send.
 * The refusals are the same everywhere: 415 for a body that is not application/json (only when
 * asked), 413 for a body over the cap, 400 for text that is not JSON; all `no-store`.
 *
 * The cap is in bytes and is enforced on what actually arrives, not only on the declared
 * Content-Length: a chunked upload carries no length, and a client can understate it.
 */
export interface ReadJsonBodyOptions {
  /** Largest accepted body, in bytes. */
  maxBytes: number;
  /** Answer 415 unless the Content-Type names application/json. */
  requireJsonContentType?: boolean;
}

export type ReadJsonBodyResult = { ok: true; body: unknown } | { ok: false; response: NextResponse };

const NO_STORE = { 'Cache-Control': 'no-store' };

function refuse(error: string, status: number): ReadJsonBodyResult {
  return { ok: false, response: NextResponse.json({ error }, { status, headers: NO_STORE }) };
}

/** The body as text, or `null` once it passes `maxBytes`; the rest of the upload is never read. */
async function readCappedText(request: Request, maxBytes: number): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function readJsonBody(request: Request, options: ReadJsonBodyOptions): Promise<ReadJsonBodyResult> {
  const { maxBytes, requireJsonContentType = false } = options;
  if (requireJsonContentType && !(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
    return refuse('Send the request as application/json.', 415);
  }

  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return refuse('Request body is too large.', 413);

  let text: string | null;
  try {
    text = await readCappedText(request, maxBytes);
  } catch {
    // The connection dropped or the stream failed mid-body: there is no usable JSON.
    return refuse('Invalid JSON request body.', 400);
  }
  if (text === null) return refuse('Request body is too large.', 413);

  try {
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return refuse('Invalid JSON request body.', 400);
  }
}
