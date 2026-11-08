// Preloaded with `node --import` by refresh-google-rating.test.ts: answers the script's Places call from
// env vars, so the CLI test needs no generated source code.
globalThis.fetch = async () => new Response(process.env.STUB_PLACES_BODY, { status: Number(process.env.STUB_PLACES_STATUS) });
