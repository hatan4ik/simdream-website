import { describe, expect, it } from 'vitest';
import { findBrokenCookieImports } from '../../scripts/wix-worker-guards.mjs';

// Regression for the 2026-11-24 staging outage: @opennextjs/cloudflare 1.20.18 bundled the
// middleware `cookie` import without esbuild's node-mode flag, so `import_cookie.default`
// was undefined and every request that carried a Cookie header answered HTTP 500
// ("Cannot read properties of undefined (reading 'parse')").
describe('findBrokenCookieImports (Wix worker bundle guard)', () => {
  it('accepts the node-mode import that v1.31.1 shipped', () => {
    expect(findBrokenCookieImports('var import_cookie = __toESM(require_dist(), 1);')).toEqual([]);
  });

  it('accepts the same import after minification', () => {
    expect(findBrokenCookieImports('var import_cookie=__toESM(require_dist(),1),x=2;')).toEqual([]);
  });

  it('rejects the import without the flag (the v1.31.2 bundle)', () => {
    expect(findBrokenCookieImports('var import_cookie = __toESM(require_dist());')).toHaveLength(1);
  });

  it('rejects the minified form without the flag, whatever the wrapper is called', () => {
    expect(findBrokenCookieImports('var import_cookie=__toESM(require_dist2());')).toHaveLength(1);
  });

  it('reports every occurrence and ignores unrelated imports', () => {
    const source = [
      'var import_cookie = __toESM(require_dist());',
      'var import_other = __toESM(require_other());',
      'var import_cookie2 = __toESM(require_dist());',
    ].join('\n');
    expect(findBrokenCookieImports(source)).toHaveLength(2);
  });

  it('is a no-op for a bundle that does not import cookie', () => {
    expect(findBrokenCookieImports('export default { fetch() { return new Response("ok"); } };')).toEqual([]);
  });
});
