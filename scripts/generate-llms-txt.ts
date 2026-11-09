/**
 * Regenerates `public/llms.txt` from the site's registries (facility config, package and
 * add-on catalog, the shared public route list, the blog corpus and the labelled last-known
 * Google rating). See `lib/seo/llms-txt.ts` for what goes in and why.
 *
 *   npm run llms:generate            rewrite public/llms.txt
 *   npm run llms:generate -- --check exit 1 when the committed file differs (same as the Vitest)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildLlmsTxt, LLMS_TXT_GENERATE_COMMAND, LLMS_TXT_PUBLIC_PATH } from '../lib/seo/llms-txt';

const target = resolve(process.cwd(), LLMS_TXT_PUBLIC_PATH);
const expected = buildLlmsTxt();

if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(target, 'utf8');
  } catch {
    /* a missing file is simply stale */
  }
  if (current !== expected) {
    console.error(`${LLMS_TXT_PUBLIC_PATH} is stale. Run \`${LLMS_TXT_GENERATE_COMMAND}\` and commit the result.`);
    process.exit(1);
  }
  console.log(`${LLMS_TXT_PUBLIC_PATH} is current.`);
} else {
  writeFileSync(target, expected);
  console.log(`Wrote ${LLMS_TXT_PUBLIC_PATH} (${expected.split('\n').length} lines) from the registries.`);
}
