/**
 * Wrangler bundles the worker with esbuild's default `charset: 'ascii'`, which
 * writes every non-ASCII character as a six-byte `\uXXXX` escape. This site is
 * mostly Hebrew, Arabic and Russian text (six UI languages plus the blog
 * corpus), so that escaping alone inflated the worker by about 2.5 MB and
 * contributed to Wix rejecting the 2026-11-09 deployment with HTTP 413.
 *
 * `restoreUtf8Literals` undoes it the way esbuild's `charset: 'utf8'` would:
 * each real `\uXXXX` escape of a printable BMP character becomes the character
 * itself, which is semantically identical inside string literals, template
 * literals and regular expressions. It leaves alone:
 *  - escapes whose backslash is itself escaped (`"\\u05D0"` is literal text);
 *  - surrogate halves (`🚀`), which must stay paired escapes;
 *  - control characters, U+2028/U+2029 and U+FEFF, which esbuild also keeps escaped.
 */

const UNICODE_ESCAPE = /\\u([0-9a-fA-F]{4})/g;

function keepEscaped(codePoint) {
  return (
    codePoint < 0xa0 ||
    (codePoint >= 0xd800 && codePoint <= 0xdfff) ||
    codePoint === 0x2028 ||
    codePoint === 0x2029 ||
    codePoint === 0xfeff
  );
}

/** Returns true when the backslash at `index` starts an escape (odd run of backslashes). */
function startsEscape(source, index) {
  let run = 0;
  for (let i = index; i >= 0 && source.charCodeAt(i) === 0x5c; i -= 1) run += 1;
  return run % 2 === 1;
}

export function restoreUtf8Literals(source) {
  return source.replace(UNICODE_ESCAPE, (match, hex, offset) => {
    const codePoint = Number.parseInt(hex, 16);
    if (keepEscaped(codePoint) || !startsEscape(source, offset)) return match;
    return String.fromCharCode(codePoint);
  });
}
