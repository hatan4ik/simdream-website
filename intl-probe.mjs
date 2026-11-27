// Compares the Intl strings the booking calendar renders, between this Node (the SSR runtime locally) and each browser engine.
import { chromium, firefox, webkit } from 'playwright';
const probe = () => {
  const L = { en: 'en-GB', he: 'he-IL', ru: 'ru-RU', fr: 'fr-FR', ar: 'ar-IL', es: 'es-ES', de: 'de-DE' };
  const out = {};
  for (const [lang, locale] of Object.entries(L)) {
    const f = (o) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...o });
    const days = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2023, 0, 1 + i, 12)));
    const months = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2026, i, 15, 12)));
    const d = new Date(Date.UTC(2026, 10, 28, 12));
    out[lang] = {
      weekdayShort: days.map((x) => f({ weekday: 'short' }).format(x)).join('|'),
      monthShort: months.map((x) => f({ month: 'short' }).format(x)).join('|'),
      monthLongYear: months.map((x) => f({ month: 'long', year: 'numeric' }).format(x)).join('|'),
      fullDate: f({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(d),
      dayLabel: f({ weekday: 'short', day: 'numeric', month: 'short' }).format(d),
      dayNumber: [1, 9, 28].map((n) => new Intl.NumberFormat(locale, { useGrouping: false }).format(n)).join('|'),
    };
  }
  out.currency = [690, 1285].map((n) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)).join('|');
  return out;
};
const server = probe();
const esc = (s) => JSON.stringify(s).replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
for (const [name, type] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
  const browser = await type.launch();
  const page = await browser.newPage();
  const got = await page.evaluate(`(${probe.toString()})()`);
  let diffs = 0;
  for (const key of Object.keys(server)) {
    const a = server[key], b = got[key];
    if (typeof a === 'string') { if (a !== b) { diffs++; console.log(name, key, '\n   server ', esc(a), '\n   browser', esc(b)); } continue; }
    for (const field of Object.keys(a)) if (a[field] !== b[field]) { diffs++; console.log(name, key, field, '\n   server ', esc(a[field]), '\n   browser', esc(b[field])); }
  }
  console.log(`${name}: ${diffs} differing fields (ICU ${await page.evaluate('Intl.DateTimeFormat().resolvedOptions().locale')})`);
  await browser.close();
}
console.log('node', process.version, 'icu', process.versions.icu, 'cldr', process.versions.cldr);
