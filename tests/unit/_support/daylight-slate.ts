/**
 * Pure helpers behind tests/unit/daylight-slate-overrides.test.ts.
 *
 * Brand Daylight (and Clean Studio, which is layered on it) re-colours the cockpit's slate fills
 * with hand-written overrides under `html[data-ui="brand"]` in app/globals.css. Tailwind generates
 * one class per shade AND per opacity (`bg-slate-950/95` and `bg-slate-950/98` are unrelated
 * classes), so a fill whose exact class has no override stays near-black in daylight while its text
 * is re-coloured to dark ink. That is how the phone menu panel (`bg-slate-950/98`) became unreadable.
 */

export type SlateFillKind = 'bg' | 'from' | 'via' | 'to';

/**
 * A slate fill as written in source: optional variants (`hover:`, `md:`, `focus-visible:` ...),
 * the utility kind, the shade, and an optional integer opacity. Arbitrary opacities such as
 * `bg-slate-950/[0.98]` are not matched on purpose; the project does not use them.
 */
const SLATE_FILL =
  /(?<![^\s"'`])((?:[^\s"'`:]+:)*!?)(bg|from|via|to)-slate-(\d{2,3})(?:\/(\d{1,3}))?(?![\w/-])/g;

/** Every distinct slate fill class in `text` (a string literal, template chunk or JSX text). */
export function slateFillClasses(text: string): string[] {
  return [...text.matchAll(SLATE_FILL)].map((match) => match[0]);
}

/** Shade of a slate fill class: `hover:bg-slate-900/40` -> `900`. */
export function slateShade(className: string): string {
  const match = /-slate-(\d{2,3})/.exec(className);
  if (!match) throw new Error(`Not a slate fill class: ${className}`);
  return match[1]!;
}

const BRAND_SCOPE = 'html[data-ui="brand"]';

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Splits at `separator(s)` that are not inside (), [] or an escape sequence. */
function splitTopLevel(text: string, isSeparator: (char: string) => boolean): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (char === '\\') {
      current += char + (text[index + 1] ?? '');
      index += 1;
      continue;
    }
    if (char === '(' || char === '[') depth += 1;
    if (char === ')' || char === ']') depth -= 1;
    if (depth === 0 && isSeparator(char)) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function unescapeCss(identifier: string): string {
  return identifier.replace(/\\(.)/g, '$1');
}

/**
 * The one utility class a selector re-colours: the subject (last compound selector, after the final
 * combinator) must be a single class, optionally with pseudo-classes (`:hover`, `:focus-visible`).
 * `.fixed.inset-0.bg-slate-950\/80` targets one specific scrim, not every `bg-slate-950/80` fill,
 * so it is not an override of the general class.
 */
function subjectUtilityClass(selector: string): string | null {
  const compounds = splitTopLevel(selector, (char) => /[\s>+~]/.test(char));
  const subject = compounds[compounds.length - 1];
  if (!subject) return null;
  // Pseudo-class arguments (:not(...), :is(...)) do not select the subject's own classes.
  let bare = subject;
  for (let previous = ''; previous !== bare; ) {
    previous = bare;
    bare = bare.replace(/:[\w-]+\([^()]*\)/g, '');
  }
  const classes = [...bare.matchAll(/\.((?:\\.|[\w-])+)/g)].map((match) => unescapeCss(match[1]!));
  return classes.length === 1 ? classes[0]! : null;
}

/**
 * Slate fill classes that app/globals.css re-colours for Brand Daylight: every comma-separated
 * selector under `html[data-ui="brand"]` whose subject is exactly one slate fill utility class.
 */
export function daylightSlateOverrides(css: string): Set<string> {
  const covered = new Set<string>();
  for (const [, prelude] of stripComments(css).matchAll(/([^{};]+)\{/g)) {
    for (const selector of splitTopLevel(prelude!, (char) => char === ',')) {
      if (!selector.startsWith(BRAND_SCOPE)) continue;
      const className = subjectUtilityClass(selector.slice(BRAND_SCOPE.length));
      if (className && slateFillClasses(className)[0] === className) covered.add(className);
    }
  }
  return covered;
}

/**
 * The classes in `used` that Brand Daylight leaves untouched even though it re-colours the same
 * slate shade elsewhere (a shade with no daylight override at all, such as `bg-slate-500`, is a
 * deliberate choice and is not this guard's business). `allowed` lists accepted exceptions.
 */
export function uncoveredSlateFills(used: Iterable<string>, overrides: ReadonlySet<string>, allowed: ReadonlySet<string>): string[] {
  const overriddenShades = new Set([...overrides].map(slateShade));
  return [...new Set(used)]
    .filter((className) => overriddenShades.has(slateShade(className)) && !overrides.has(className) && !allowed.has(className))
    .sort();
}
