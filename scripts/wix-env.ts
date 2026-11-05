import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Loads only explicitly requested local Wix values, without logging any values. */
export function loadWixLocalEnv(keys: readonly string[]): void {
  let text = '';
  try {
    text = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  } catch {
    return;
  }

  for (const line of text.split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || !keys.includes(match[1]) || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}
