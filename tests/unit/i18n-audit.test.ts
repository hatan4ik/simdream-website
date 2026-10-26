import path from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { FLIGHT_ADDONS, SIMULATOR_PACKAGES } from '@/lib/db/seed-data';
import { LANGUAGES, getLocalizedAddons, getLocalizedPackages, translations, type Language } from '@/lib/i18n/translations';
import { REPO_ROOT, literalTexts, location, parseSource, readConstLiteral, sourceFiles, walk } from './_support/source';

const CODES: Language[] = ['he', 'en', 'ru', 'fr', 'ar'];
const HEBREW = /[֐-׿]/;
const ARABIC = /[؀-ۿ]/;
/** Scripts that must never appear in each language's copy (AGENTS.md section 5). */
const FORBIDDEN_SCRIPTS: Record<Language, Array<{ name: string; pattern: RegExp }>> = {
  he: [{ name: 'Arabic', pattern: ARABIC }],
  ar: [{ name: 'Hebrew', pattern: HEBREW }],
  en: [{ name: 'Hebrew', pattern: HEBREW }, { name: 'Arabic', pattern: ARABIC }],
  ru: [{ name: 'Hebrew', pattern: HEBREW }, { name: 'Arabic', pattern: ARABIC }],
  fr: [{ name: 'Hebrew', pattern: HEBREW }, { name: 'Arabic', pattern: ARABIC }],
};

type Shape = string | Shape[] | { [key: string]: Shape };

function shapeOf(value: unknown): Shape {
  if (Array.isArray(value)) return value.map(shapeOf);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, shapeOf(child)])
    );
  }
  return typeof value;
}

function stringLeaves(value: unknown, path = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((child, index) => stringLeaves(child, `${path}[${index}]`));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => stringLeaves(child, path ? `${path}.${key}` : key));
  }
  return [];
}

/** Every customer-facing string for a language: the dictionary plus the localized catalog. */
function allCopy(language: Language): Array<[string, string]> {
  return [
    ...stringLeaves(translations[language], 'translations'),
    ...stringLeaves(getLocalizedPackages(language), 'packages'),
    ...stringLeaves(getLocalizedAddons(language), 'addons'),
  ];
}

const PLACEHOLDER = /\{\{\s*[\w.]+\s*\}\}|\{[\w.]+\}|%[sd]|\$\{[\w.]+\}/g;
const placeholders = (text: string) => (text.match(PLACEHOLDER) ?? []).sort();

describe('translations dictionary', () => {
  it('ships exactly the five supported languages, with Hebrew and Arabic right-to-left', () => {
    expect(Object.keys(translations).sort()).toEqual([...CODES].sort());
    expect(Object.fromEntries(LANGUAGES.map((language) => [language.code, language.dir]))).toEqual({
      en: 'ltr',
      he: 'rtl',
      ru: 'ltr',
      fr: 'ltr',
      ar: 'rtl',
    });
  });

  it.each(CODES.filter((code) => code !== 'en'))('gives %s exactly the same key tree as English', (code) => {
    expect(shapeOf(translations[code])).toEqual(shapeOf(translations.en));
  });

  it.each(CODES)('has no empty strings in %s', (code) => {
    const leaves = allCopy(code);
    expect(leaves.length).toBeGreaterThan(500);
    expect(leaves.filter(([, text]) => text.trim() === '').map(([path]) => path)).toEqual([]);
  });

  it.each(CODES.filter((code) => code !== 'he'))('keeps Hebrew letters out of %s copy', (code) => {
    expect(allCopy(code).filter(([, text]) => HEBREW.test(text))).toEqual([]);
  });

  it.each(CODES.filter((code) => code !== 'ar'))('keeps Arabic letters out of %s copy', (code) => {
    expect(allCopy(code).filter(([, text]) => ARABIC.test(text))).toEqual([]);
  });

  it('recognises the interpolation placeholder styles it audits', () => {
    expect(placeholders('Hi {name}, {{ count }} seats, %s and ${total}')).toEqual(['${total}', '%s', '{name}', '{{ count }}'].sort());
  });

  it.each(CODES.filter((code) => code !== 'en'))('uses the same interpolation placeholders in %s as in English', (code) => {
    const english = new Map(stringLeaves(translations.en));
    const mismatched = stringLeaves(translations[code]).filter(
      ([path, text]) => JSON.stringify(placeholders(text)) !== JSON.stringify(placeholders(english.get(path) ?? ''))
    );
    expect(mismatched).toEqual([]);
  });

  it.each(CODES)('localizes every catalog package and add-on for %s', (code) => {
    const packages = getLocalizedPackages(code);
    const addons = getLocalizedAddons(code);
    expect(packages.map((pkg) => pkg.id)).toEqual(SIMULATOR_PACKAGES.map((pkg) => pkg.id));
    expect(addons.map((addon) => addon.id)).toEqual(FLIGHT_ADDONS.map((addon) => addon.id));
    expect(packages.filter((pkg) => !pkg.title.trim() || !pkg.description.trim() || pkg.features.length === 0)).toEqual([]);
    expect(addons.filter((addon) => !addon.name.trim() || !addon.description.trim())).toEqual([]);
  });

  it.each(CODES)('keeps catalog prices and durations identical in %s', (code) => {
    const strip = <T extends { priceIls: number; durationMinutes: number; id: string }>(items: T[]) =>
      items.map(({ id, priceIls, durationMinutes }) => ({ id, priceIls, durationMinutes }));
    expect(strip(getLocalizedPackages(code))).toEqual(strip(SIMULATOR_PACKAGES));
    expect(strip(getLocalizedAddons(code))).toEqual(strip(FLIGHT_ADDONS));
  });
});

// ---------------------------------------------------------------------------
// Static source scans (AGENTS.md section 5)
// ---------------------------------------------------------------------------

const LAYOUT_WORDS = new Set([
  'rtl', 'ltr', 'left', 'right', 'start', 'end', 'flex', 'grid', 'block', 'hidden', 'inline', 'absolute',
  'relative', 'fixed', 'sticky', 'italic', 'underline', 'uppercase', 'lowercase', 'truncate', 'border',
  'rounded', 'shadow', 'transition', 'transform', 'auto', 'none', 'center', 'contents',
]);
const isLayoutToken = (token: string) =>
  /^[a-z0-9!:/[\]._%#()-]+$/.test(token) && (/[-:[]/.test(token) || LAYOUT_WORDS.has(token));
const isDisplayText = (text: string) => text.trim().split(/\s+/).some((token) => token !== '' && !isLayoutToken(token));

function isRtlFlag(node: ts.Expression): boolean {
  if (ts.isParenthesizedExpression(node)) return isRtlFlag(node.expression);
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) return isRtlFlag(node.operand);
  if (ts.isIdentifier(node)) return node.text === 'isRTL';
  return ts.isPropertyAccessExpression(node) && node.name.text === 'isRTL';
}

/** `copy.he`, `copy['ar']` and similar: a branch that picks one language's copy by key. */
function readsLanguageKey(node: ts.Node): boolean {
  let found = false;
  walk(node, (child) => {
    if (ts.isPropertyAccessExpression(child) && (CODES as string[]).includes(child.name.text)) found = true;
    if (
      ts.isElementAccessExpression(child) &&
      ts.isStringLiteral(child.argumentExpression) &&
      (CODES as string[]).includes(child.argumentExpression.text)
    ) {
      found = true;
    }
  });
  return found;
}

/** `isRTL ? A : B` where either branch renders words or language-keyed copy instead of layout classes. */
function isRtlTextTernaries(source: ts.SourceFile): string[] {
  const found: string[] = [];
  walk(source, (node) => {
    if (ts.isConditionalExpression(node) && isRtlFlag(node.condition)) {
      const texts = [...literalTexts(node.whenTrue), ...literalTexts(node.whenFalse)];
      const choosesText = texts.some(isDisplayText) || readsLanguageKey(node.whenTrue) || readsLanguageKey(node.whenFalse);
      if (choosesText) found.push(`${location(node)} ${node.getText().replace(/\s+/g, ' ').slice(0, 80)}`);
    }
  });
  return found;
}

function countRtlTernaries(source: ts.SourceFile): number {
  let count = 0;
  walk(source, (node) => {
    if (ts.isConditionalExpression(node) && isRtlFlag(node.condition)) count += 1;
  });
  return count;
}

interface LanguageCopy {
  language: Language;
  node: ts.Node;
}

/** Copy explicitly tied to one language: `{ ar: ... }` entries and `language === 'ar' ? ... :` branches. */
function languageKeyedCopy(source: ts.SourceFile): LanguageCopy[] {
  const copy: LanguageCopy[] = [];
  const isLanguage = (value: string): value is Language => (CODES as string[]).includes(value);
  walk(source, (node) => {
    if (ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) && isLanguage(node.name.text)) {
      copy.push({ language: node.name.text, node: node.initializer });
    }
    if (ts.isConditionalExpression(node)) {
      let condition: ts.Expression = node.condition;
      while (ts.isParenthesizedExpression(condition)) condition = condition.expression;
      if (
        ts.isBinaryExpression(condition) &&
        condition.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
        ts.isIdentifier(condition.left) &&
        condition.left.text === 'language' &&
        ts.isStringLiteral(condition.right) &&
        isLanguage(condition.right.text)
      ) {
        copy.push({ language: condition.right.text, node: node.whenTrue });
      }
    }
  });
  return copy;
}

function crossScriptViolations(copy: LanguageCopy[]): string[] {
  return copy.flatMap(({ language, node }) =>
    literalTexts(node).flatMap((text) =>
      FORBIDDEN_SCRIPTS[language]
        .filter(({ pattern }) => pattern.test(text))
        .map(({ name }) => `${location(node)} [${language}] contains ${name}: ${text.trim().slice(0, 60)}`)
    )
  );
}

describe('static source scans', () => {
  const uiSources = sourceFiles('app', 'components').map((file) => parseSource(file));
  const copySources = sourceFiles('app', 'components', 'lib').map((file) => parseSource(file));
  const synthetic = (text: string) => parseSource('synthetic.tsx', text);

  it('detects display text chosen by isRTL and ignores layout-only ternaries', () => {
    expect(isRtlTextTernaries(synthetic(`const a = isRTL ? 'חזרה' : 'Back';`))).toHaveLength(1);
    expect(isRtlTextTernaries(synthetic(`const b = <p>{isRTL ? <b>חזרה</b> : <b>Back</b>}</p>;`))).toHaveLength(1);
    expect(isRtlTextTernaries(synthetic(`const c = props.isRTL ? 'back' : 'forward';`))).toHaveLength(1);
    expect(isRtlTextTernaries(synthetic(`const f = isRTL ? COPY.he : COPY.en;`))).toHaveLength(1);
    expect(isRtlTextTernaries(synthetic(`const g = <p>{isRTL ? t['he'].back : label}</p>;`))).toHaveLength(1);
    expect(isRtlTextTernaries(synthetic(`const d = isRTL ? 'rotate-180 ml-2' : 'mr-2';`))).toEqual([]);
    expect(
      isRtlTextTernaries(synthetic(`const e = isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />;`))
    ).toEqual([]);
  });

  it('never chooses display text with an isRTL ternary in app/ or components/', () => {
    const scanned = uiSources.reduce((total, source) => total + countRtlTernaries(source), 0);
    expect(scanned).toBeGreaterThan(10);
    expect(uiSources.flatMap(isRtlTextTernaries)).toEqual([]);
  });

  it('detects copy written in the wrong script for its language', () => {
    const copy = languageKeyedCopy(
      synthetic(`const COPY = { he: 'שלום', ar: 'مرحبا (ח.פ.)', en: 'Hello' }; const x = language === 'he' ? 'مرحبا' : 'Hi';`)
    );
    expect(copy.map(({ language }) => language)).toEqual(['he', 'ar', 'en', 'he']);
    expect(crossScriptViolations(copy)).toHaveLength(2);
  });

  it('finds the language-keyed copy dictionaries and ternaries it audits', () => {
    const languages = new Set(copySources.flatMap(languageKeyedCopy).map(({ language }) => language));
    expect(copySources.flatMap(languageKeyedCopy).length).toBeGreaterThan(50);
    expect([...languages].sort()).toEqual([...CODES].sort());
  });

  // The UNIT-8 registration labels quote 'ח.פ.' in the en/ru/fr/ar legal headers of these two files.
  const UNIT_8_LABEL = /^components\/legal\/(PrivacyPolicyContentView|RulesContentView)\.tsx:\d+ \[(en|ru|fr|ar)\] contains Hebrew: .*\(ח\.פ\.\)/;

  it('keeps language-keyed copy free of foreign-script letters apart from the known UNIT-8 labels', () => {
    const violations = crossScriptViolations(copySources.flatMap(languageKeyedCopy));
    expect(violations.filter((violation) => !UNIT_8_LABEL.test(violation))).toEqual([]);
  });

  it('keeps the company-registration label in en/ru/fr/ar legal copy free of Hebrew letters (UNIT-8)', () => {
    expect(crossScriptViolations(copySources.flatMap(languageKeyedCopy)).filter((violation) => UNIT_8_LABEL.test(violation))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Member area ratchet (AGENTS.md section 5): every visible string comes from t.member
// ---------------------------------------------------------------------------

/** The member area: sign-in, dashboard, auth callback, password reset and the auth result messages. */
const MEMBER_FILES = [
  'app/(auth)/login/page.tsx',
  'app/dashboard/layout.tsx',
  'app/dashboard/page.tsx',
  'app/auth/callback/page.tsx',
  'app/auth/reset-password/page.tsx',
  'lib/auth/auth-context.tsx',
];

/** JSX attributes whose value a visitor reads or a screen reader announces. */
const DISPLAY_ATTRIBUTES = new Set([
  'placeholder',
  'aria-label',
  'aria-description',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'title',
  'alt',
  'label',
]);

/**
 * Literal text that reads the same in every language and may therefore be written in member JSX.
 * Anything else with a letter in it belongs in `member` in lib/i18n/translations.ts.
 */
const LANGUAGE_NEUTRAL_TEXT = [
  // Brand names stay in Latin script in every language.
  'Sim Dream',
  'SimDream',
  'Boeing',
  'Google',
  'Facebook',
  'Apple',
  'Stripe',
  // Left-to-right telemetry and identifier samples (AGENTS.md section 5.3).
  'IST', // time-zone suffix of a slot range, e.g. "11:15–12:15 IST"
  'pilot@example.com', // address-format sample in the dir="ltr" email field
];

const HTML_ENTITY = /&(?:[a-z][a-z0-9]*|#\d+|#x[0-9a-f]+);/gi;
const LETTER = /\p{L}/u;

/** Whether rendered literal text still holds a letter once entities and language-neutral text are removed. */
function isHardCodedDisplayText(text: string): boolean {
  let remainder = text.replace(HTML_ENTITY, ' ');
  for (const neutral of LANGUAGE_NEUTRAL_TEXT) remainder = remainder.split(neutral).join(' ');
  return LETTER.test(remainder);
}

/**
 * Literal pieces of the value an expression renders: through parentheses, both ternary branches,
 * the right side of `&&` and both sides of `||` / `??`. Literals passed to calls (such as the
 * `'{count}'` token in `copy.x.replace('{count}', n)`) are arguments, not rendered text.
 */
function renderedLiterals(node: ts.Expression): ts.LiteralLikeNode[] {
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node)) {
    return renderedLiterals(node.expression);
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node];
  if (ts.isTemplateExpression(node)) return [node.head, ...node.templateSpans.map((span) => span.literal)];
  if (ts.isConditionalExpression(node)) return [...renderedLiterals(node.whenTrue), ...renderedLiterals(node.whenFalse)];
  if (ts.isBinaryExpression(node)) {
    const operator = node.operatorToken.kind;
    if (operator === ts.SyntaxKind.AmpersandAmpersandToken) return renderedLiterals(node.right);
    if (operator === ts.SyntaxKind.BarBarToken || operator === ts.SyntaxKind.QuestionQuestionToken) {
      return [...renderedLiterals(node.left), ...renderedLiterals(node.right)];
    }
  }
  return [];
}

interface DisplaySite {
  node: ts.Node;
  /** Literal text this site renders; empty when it renders only dictionary lookups or variables. */
  texts: string[];
}

/** Every place JSX renders text: JSX text, `{expression}` children and display attributes. */
function displaySites(source: ts.SourceFile): DisplaySite[] {
  const sites: DisplaySite[] = [];
  const textsOf = (literals: ts.LiteralLikeNode[]) => literals.map((literal) => literal.text);
  walk(source, (node) => {
    if (ts.isJsxText(node) && !node.containsOnlyTriviaWhiteSpaces) {
      sites.push({ node, texts: [node.text] });
    } else if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      sites.push({ node, texts: textsOf(renderedLiterals(node.expression)) });
    } else if (ts.isJsxAttribute(node) && DISPLAY_ATTRIBUTES.has(node.name.getText()) && node.initializer) {
      const { initializer } = node;
      const literals = ts.isStringLiteral(initializer)
        ? [initializer]
        : ts.isJsxExpression(initializer) && initializer.expression
        ? renderedLiterals(initializer.expression)
        : [];
      sites.push({ node, texts: textsOf(literals) });
    }
  });
  return sites;
}

function hardCodedDisplayText(source: ts.SourceFile): string[] {
  return displaySites(source).flatMap(({ node, texts }) =>
    texts.filter(isHardCodedDisplayText).map((text) => `${location(node)} ${JSON.stringify(text.replace(/\s+/g, ' ').trim())}`)
  );
}

describe('member area localization ratchet', () => {
  const synthetic = (text: string) => parseSource('synthetic.tsx', text);
  const memberSources = MEMBER_FILES.map((file) => parseSource(path.join(REPO_ROOT, file)));

  it('detects hard-coded display text and allows dictionary lookups, brands and LTR telemetry', () => {
    const violations = hardCodedDisplayText(
      synthetic(`
        const heading = <h1>Member Flight Deck Login</h1>;
        const field = <input placeholder="Your name" aria-label={'Email'} />;
        const status = <p title={ok ? copy.hint : 'Fallback'}>{loading ? 'Loading…' : copy.ready}</p>;
        const duration = <span>{\`\${minutes} min\`}</span>;
        const guest = <b>{user?.fullName || 'Guest'}</b>;
        const branded = <button>Continue with Google</button>;
      `)
    );
    expect(violations.map((violation) => violation.replace(/^synthetic\.tsx:\d+ /, ''))).toEqual([
      '"Member Flight Deck Login"',
      '"Your name"',
      '"Email"',
      '"Fallback"',
      '"Loading…"',
      '"min"',
      '"Guest"',
      '"Continue with Google"',
    ]);

    expect(
      hardCodedDisplayText(
        synthetic(`
          const ok = (
            <p className="flex text-sky-400" dir="ltr" placeholder={isSignup ? copy.newPassword : '••••••••'}>
              {copy.title} &bull; {start}–{end} IST · <b>Google</b> {copy.count.replace('{count}', String(n))}
              {isAdmin && <span>{nav.adminBoard}</span>}
            </p>
          );
          const email = <input type="email" placeholder="pilot@example.com" />;
        `)
      )
    ).toEqual([]);
  });

  it('renders no hard-coded display text in the six member files', () => {
    // Guard against a vacuous pass: the scan must reach the member JSX it audits.
    const sites = memberSources.flatMap(displaySites);
    expect(sites.length).toBeGreaterThan(100);
    expect(memberSources.flatMap(hardCodedDisplayText)).toEqual([]);
  });

  it('keeps the English auth fallback messages identical to en.member.auth', () => {
    expect(readConstLiteral('lib/auth/auth-context.tsx', 'AUTH_RESULT_FALLBACK_COPY')).toEqual(translations.en.member.auth);
  });
});
