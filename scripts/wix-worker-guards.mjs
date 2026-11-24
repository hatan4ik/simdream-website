/**
 * Guards for the OpenNext output that becomes the Wix worker (checked in `scripts/prepare-wix-worker.mjs`).
 *
 * The OpenNext middleware converter reads the request cookie with the `cookie` package, which is
 * CommonJS with `__esModule: true`. esbuild must wrap it in node mode, `__toESM(require_x(), 1)`,
 * so that `import_cookie.default` is the module. `@opennextjs/cloudflare` 1.20.18 (with
 * `@opennextjs/aws` 4.2.0) bundled it as `__toESM(require_x())`: `default` was undefined, and every
 * request that carried a Cookie header failed with HTTP 500, "Cannot read properties of undefined
 * (reading 'parse')" (staging, 2026-11-24). Requests without cookies were fine, which is why the
 * cookie-less smoke checks did not notice.
 */

// `import_cookie`, `import_cookie2`, ... = __toESM(<wrapper>()) with no second argument.
const COOKIE_IMPORT_WITHOUT_NODE_MODE = /\bimport_cookie\d*\s*=\s*__toESM\(\s*[\w$]+\(\s*\)\s*\)/g;

/** Returns every cookie import in the bundle that lacks esbuild's node-mode flag. */
export function findBrokenCookieImports(source) {
  return source.match(COOKIE_IMPORT_WITHOUT_NODE_MODE) ?? [];
}
