/**
 * Read-only CONTENT verification of the deployed Wix staging site, run after a publish.
 *
 * Runs in the pinned Playwright Docker image, never in a personal browser profile:
 *   npm run test:staging:content:docker
 * or on the host (needs the Playwright browsers installed): npm run test:staging:content
 *
 * What it proves, with a real Chromium and real requests (no purchases, no writes):
 *   cookie   a request carrying a Cookie header is served (a bundle without esbuild's node-mode flag once
 *            answered HTTP 500 to every browser, 2026-11-24);
 *   article  every language of the sample blog articles returns its own title and its own canonical (a failed
 *            Wix lookup falls back to the Hebrew article, whose canonical is the Hebrew page);
 *   loop     opening a Hebrew article with English saved settles on it and does not bounce between translations;
 *   index    /en/blog and /ru/blog list their own language's articles;
 *   legal    /rules and /privacy-policy (he, en, ar) never hold a duplicate id, even with requestAnimationFrame
 *            delayed 800 ms, show no loading flash, scroll to their hash target, and do not overflow at 320 px;
 *   html     the served HTML of those pages has the text inline (no streamed hidden segment).
 *
 *   npm run test:staging:content:docker -- --only=cookie,article --article=does-autopilot-land-alone
 *
 * Target host: STAGING_BASE_URL, default the Wix staging host. It refuses simdream.co.il. Requests are paced
 * (staging answers HTTP 429 when pushed) and the run stops at the first 429.
 */
import { chromium } from 'playwright';

export const DEFAULT_BASE_URL = 'https://headless-ciwstxzqhgf-hatan4ik-1408.wix-site-host.com';
export const LANGUAGES = ['he', 'en', 'ru', 'fr', 'es', 'ar', 'de'];
export const DEFAULT_ARTICLES = ['does-autopilot-land-alone', 'boeing-737-simulator-beginners'];
export const LEGAL_PAGES = [
  { path: '/rules', id: 'refunds' },
  { path: '/privacy-policy', id: 'cookies' },
];

const HEBREW = /[\u0590-\u05FF]/;
const ARABIC = /[\u0600-\u06FF]/;
const CYRILLIC = /[\u0400-\u04FF]/;
const PAUSE_MS = 1200;
const COOKIE_HEADER = 'simdream_smoke=1; _wixAB3=1';

export function assertStagingUrl(url) {
  if (/simdream\.co\.il/i.test(url)) throw new Error('Refusing to run the staging content suite against simdream.co.il.');
  return url.replace(/\/+$/, '');
}

/** The path a visitor opens for a blog article: the Hebrew master has no language prefix. */
export function articlePath(shortSlug, language) {
  return language === 'he' ? `/post/${shortSlug}` : `/post/${language}/${shortSlug}`;
}

/** A title is in the right language when it uses that language's script (and not another script). */
export function titleMatchesLanguage(title, language) {
  if (language === 'he') return HEBREW.test(title);
  if (language === 'ar') return ARABIC.test(title) && !HEBREW.test(title);
  if (language === 'ru') return CYRILLIC.test(title) && !HEBREW.test(title);
  return title.length > 0 && !HEBREW.test(title) && !ARABIC.test(title) && !CYRILLIC.test(title);
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const results = [];

function record(group, name, ok, detail = '') {
  results.push({ group, name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${group}] ${name}${detail ? ` | ${detail}` : ''}`);
}

function guard429(response) {
  if (response.status() === 429) throw new Error('HTTP 429 from staging: stopping (go slowly, then retry later).');
}

async function checkCookie(base, context) {
  const response = await context.request.get(`${base}/`, { headers: { Cookie: COOKIE_HEADER } });
  guard429(response);
  const body = await response.text();
  record('cookie', 'GET / with a Cookie header', response.status() === 200 && !/Error while running user code/.test(body), `HTTP ${response.status()}`);
}

async function checkArticles(base, context, articles) {
  for (const short of articles) {
    for (const language of LANGUAGES) {
      await sleep(PAUSE_MS);
      const path = articlePath(short, language);
      const response = await context.request.get(`${base}${path}`, { headers: { Cookie: COOKIE_HEADER } });
      guard429(response);
      const html = await response.text();
      const title = /<title>([^<]*)/.exec(html)?.[1] ?? '';
      const canonical = /rel="canonical" href="([^"]*)"/.exec(html)?.[1] ?? '';
      const canonicalPath = canonical ? new URL(canonical).pathname : '(none)';
      const ok = response.status() === 200 && canonicalPath === path && titleMatchesLanguage(title, language);
      record('article', path, ok, `HTTP ${response.status()}, canonical ${canonicalPath}, title "${title.slice(0, 36)}"`);
    }
  }
}

async function open(base, page, path) {
  const response = await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
  if (response) guard429(response);
  await page
    .waitForFunction(() => !document.documentElement.hasAttribute('data-language-pending'), null, { timeout: 25_000 })
    .catch(() => undefined);
}

/** Init script: the visitor's saved site language. It receives the value as an argument (init scripts are serialized). */
const setSavedLanguage = (language) => {
  try {
    window.localStorage.setItem('simdream_lang', language);
  } catch {
    /* storage unavailable */
  }
};

async function checkLanguageLoop(base, browser, short) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(setSavedLanguage, 'en');
  const page = await context.newPage();
  const visited = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) visited.push(new URL(frame.url()).pathname);
  });
  const path = articlePath(short, 'he');
  await open(base, page, path);
  await page.waitForTimeout(4000);
  const state = await page.evaluate(() => ({ saved: localStorage.getItem('simdream_lang'), history: history.length, path: location.pathname }));
  const stayed = visited.every((entry) => entry === path) && state.path === path;
  record('loop', `Hebrew article with English saved (${path})`, stayed && visited.length <= 3 && state.history <= 4 && state.saved === 'he', `navigations ${visited.length}, history ${state.history}, saved ${state.saved}`);
  await context.close();
}

async function checkBlogIndex(base, browser) {
  for (const language of ['en', 'ru']) {
    await sleep(PAUSE_MS);
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(setSavedLanguage, language);
    const page = await context.newPage();
    await open(base, page, `/${language}/blog`);
    // The server renders the Hebrew list first; the language's own list replaces it when /api/blog answers. Judge the
    // settled state (with a time limit, so a list that never settles still fails), and report how long the swap took.
    const startedAt = Date.now();
    await page
      .waitForFunction(
        () => {
          const links = [...document.querySelectorAll('a[href*="/post/"]')];
          return links.length >= 30 && !links.some((a) => /[\u0590-\u05FF]/.test(a.textContent ?? ''));
        },
        null,
        { timeout: 25_000 }
      )
      .catch(() => undefined);
    const settledMs = Date.now() - startedAt;
    const info = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a[href*="/post/"]')];
      return { hrefs: [...new Set(links.map((a) => a.getAttribute('href')))], hebrew: links.some((a) => /[\u0590-\u05FF]/.test(a.textContent ?? '')), lang: document.documentElement.lang };
    });
    const ok = info.hrefs.length >= 30 && info.hrefs.every((href) => href.startsWith(`/post/${language}/`)) && !info.hebrew && info.lang === language;
    record('index', `/${language}/blog`, ok, `${info.hrefs.length} article links, html lang ${info.lang}, Hebrew cards ${info.hebrew}, list settled after ${settledMs} ms`);
    await context.close();
  }
}

async function checkLegal(base, browser, language, { path, id }, { stall = false, width = 1280 } = {}) {
  await sleep(PAUSE_MS);
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 700 : 900 } });
  await context.addInitScript(
    ({ language: lang, stall: delay, id: target }) => {
      try {
        window.localStorage.setItem('simdream_lang', lang);
      } catch {
        /* storage unavailable */
      }
      if (delay) {
        const raf = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = (callback) => {
          setTimeout(() => raf(callback), 800);
          return 0;
        };
      }
      window.__duplicates = new Set();
      window.__maxTarget = 0;
      setInterval(() => {
        const seen = new Set();
        for (const element of document.querySelectorAll('[id]')) {
          if (seen.has(element.id)) window.__duplicates.add(element.id);
          seen.add(element.id);
        }
        window.__maxTarget = Math.max(window.__maxTarget, document.querySelectorAll(`#${target}`).length);
      }, 20);
    },
    { language, stall, id }
  );
  const page = await context.newPage();
  await open(base, page, `${path}#${id}`);
  await page.waitForTimeout(3000);
  const info = await page.evaluate((target) => {
    const main = document.querySelector('main')?.innerText ?? '';
    const element = document.getElementById(target);
    return {
      duplicates: [...window.__duplicates],
      maxTarget: window.__maxTarget,
      count: document.querySelectorAll(`#${target}`).length,
      fallback: Boolean(document.querySelector('[role="status"]')),
      top: element ? element.getBoundingClientRect().top : null,
      viewport: innerHeight,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      hebrew: /[\u0590-\u05FF]/.test(main),
      arabic: /[\u0600-\u06FF]/.test(main),
      lang: document.documentElement.lang,
    };
  }, id);
  const scriptOk = language === 'en' ? !info.hebrew && !info.arabic : language === 'ar' ? !info.hebrew && info.arabic : true;
  const ok =
    info.duplicates.length === 0 && info.maxTarget <= 1 && info.count === 1 && !info.fallback &&
    info.top !== null && info.top >= 0 && info.top < info.viewport && info.overflow <= 0 && info.lang === language && scriptOk;
  const variant = `${language}${stall ? ', rAF +800ms' : ''}${width < 500 ? `, ${width}px` : ''}`;
  record('legal', `${path}#${id} (${variant})`, ok, `duplicates [${info.duplicates.join(',')}], #${id} max ${info.maxTarget} final ${info.count}, fallback ${info.fallback}, top ${Math.round(info.top ?? -1)}px, overflow ${info.overflow}px`);
  await context.close();
}

async function checkServedHtml(base, context) {
  for (const { path, id } of LEGAL_PAGES) {
    await sleep(PAUSE_MS);
    const response = await context.request.get(`${base}${path}`, { headers: { Cookie: COOKIE_HEADER } });
    guard429(response);
    const html = await response.text();
    const hidden = (html.match(/id="S:\d+"/g) ?? []).length;
    const templates = (html.match(/id="B:\d+"/g) ?? []).length;
    const target = (html.match(new RegExp(`id="${id}"`, 'g')) ?? []).length;
    record('html', `${path} served HTML`, response.status() === 200 && hidden === 0 && templates === 0 && target === 1, `streamed segments ${hidden}, fallback templates ${templates}, id="${id}" x${target}`);
  }
}

async function main() {
  const base = assertStagingUrl(process.env.STAGING_BASE_URL || DEFAULT_BASE_URL);
  const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split('=')[1];
  const only = new Set((arg('only') ?? 'cookie,article,loop,index,legal,html').split(','));
  const articles = (arg('article') ?? DEFAULT_ARTICLES.join(',')).split(',');
  console.log(`Staging content verification against ${base}`);

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    if (only.has('cookie')) await checkCookie(base, context);
    if (only.has('article')) await checkArticles(base, context, articles);
    if (only.has('loop')) await checkLanguageLoop(base, browser, articles[0]);
    if (only.has('index')) await checkBlogIndex(base, browser);
    if (only.has('legal')) {
      for (const page of LEGAL_PAGES) {
        for (const language of ['he', 'en', 'ar']) await checkLegal(base, browser, language, page);
        await checkLegal(base, browser, 'he', page, { stall: true });
        await checkLegal(base, browser, 'en', page, { stall: true });
        await checkLegal(base, browser, 'he', page, { width: 320 });
      }
    }
    if (only.has('html')) await checkServedHtml(base, context);
    await context.close();
  } finally {
    await browser.close();
  }

  const failed = results.filter((entry) => !entry.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed of ${results.length} checks.`);
  if (failed.length > 0) {
    for (const entry of failed) console.log(`  FAILED [${entry.group}] ${entry.name}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(String(error?.message ?? error));
    process.exit(1);
  });
}
