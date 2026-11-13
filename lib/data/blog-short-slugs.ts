export const BLOG_SEO_LANGS = ['he', 'en', 'ru', 'fr', 'es', 'ar'] as const;
export type BlogSeoLang = (typeof BLOG_SEO_LANGS)[number];

export function isBlogSeoLang(value: string | undefined): value is BlogSeoLang {
  return Boolean(value && (BLOG_SEO_LANGS as readonly string[]).includes(value));
}

export const SHORT_SLUG_BY_TID: Readonly<Record<string, string>> = {
  '67660d2d-af7a-402d-b9db-408e73d5c114': 'aircraft-systems-guide',
  '56e1d93e-0260-499e-b5c7-9c8101e0660f': 'flight-simulator-recommendations',
  '1d47b886-a23f-43d9-86cc-54bf8ab2513a': 'does-autopilot-land-alone',
  '6d995604-797e-4f8c-95dd-ff754e62a916': 'couples-flight-simulator-date',
  '0666a13f-951d-4adc-9114-e3ec65ee4413': 'luxury-couples-flight-experience',
  '41e6bd14-60bc-4c65-801c-b3ed27e3095a': 'airline-interview-simulator-prep',
  '209fcf16-ee37-4083-80cb-d523a2cccfdf': 'fly-simulator-no-experience',
  '8797d36c-1388-423f-a895-e88449ae4481': 'challenging-airport-landings-guide',
  '3a3f8dc8-829b-41d8-abf4-8f9a4e879546': 'innsbruck-valley-approach-737',
  '7adfc050-c94a-4fa3-8708-f55a9189a5ab': 'how-to-buy-flight-voucher',
  'a9bb1a95-fec0-46fd-9856-02634e071efa': 'boeing-737-simulator-beginners',
  '42b0080d-d243-4804-a4ba-144ab3361890': 'birthday-gift-for-men-flight',
  'b8dd6018-a4fe-4690-bcc6-56831f4077cd': 'crosswind-landing-practice-737',
  '15e8cba2-59fd-4f67-b36c-f89d7e1f5927': 'unique-date-idea-tel-aviv',
  'ef8094b9-6a53-429d-ac9f-11b871ec99e2': 'flight-simulator-session-duration',
  'c1b4ad21-887e-49cf-a641-581279ad3c64': 'takeoff-and-landing-guide-737',
  '6da2737a-67b3-4ac1-9496-4915f176966b': 'experiential-flight-simulators-guide',
  '67b991c2-7129-4508-b1ae-9aa1f04bdedd': 'engine-failure-takeoff-737-guide',
  '27020990-0423-4b90-bbb3-416f1b5a8d50': 'paro-bhutan-approach-737-crew',
  '78a4cb75-66ac-403a-b579-ef55b5eb3ff1': 'captains-seat-cockpit-review',
  'b0b42345-3384-43bd-9c8f-c9e941b232ed': 'top-aviation-attractions-israel',
  'a49dd7a0-d32f-4f8f-842b-e48127243145': 'digital-flight-gift-voucher-guide',
  'deb39b6a-8318-4028-a745-258c30c965c8': 'choose-airport-flight-simulator',
  'deac8f01-5cbb-4319-ae1f-f9401fd344dc': 'original-partner-surprise-flight',
  '009d5751-cd9b-4fcf-a53d-fb6c9e5b7884': 'home-vs-pro-flight-simulator',
  '208f8a50-ccbd-446c-b4c6-a59e2d184a24': 'virtual-flight-world-destinations',
  'a19bfb22-d1cd-4573-b2bb-652d6344051d': 'overcome-fear-of-flying-methods',
  'f44fd599-5361-4d93-8af8-d812caa97482': 'flight-simulator-tel-aviv-guide',
  '6335c2b3-bfa4-4741-929c-5858819254c1': 'historic-airline-approaches-guide',
  '7f6c49a0-4ff7-4af0-8aa9-e17825ea58ab': 'corporate-team-building-flight-sim',
  'c20f3981-50b7-43ec-8d91-d8659c99c9f9': 'program-fmc-route-boeing-737',
  '0583330c-0ff1-4b88-82af-50a02043cd90': 'kai-tak-landing-simulator-turn',
  'b226e414-b95e-4e87-95fd-29c128048b81': 'family-flight-simulator-activity',
  'fac02d60-8c44-4fa2-aebf-c887605690fb': 'best-aviation-attractions-israel',
  'f5c4aeea-df4f-4c5c-b078-7aa64196daa0': 'why-read-flight-simulator-blogs',
  'fb83890d-b9e7-408a-bbc6-e8dfbaf27f1b': 'boeing-737-vs-airbus-differences',
  '5a956667-426a-468f-80cd-cd82e0664300': 'kai-tak-runway-13-approach-737',
  '2d627bd5-4b25-4c4a-819a-6007a76eb28e': 'choose-boeing-737-flight-package',
  '5c30eac5-7f62-465a-bf33-17c64484f4bc': 'airline-pilot-interview-tips',
};

export const SHORT_SLUG_BY_HE_SLUG: Readonly<Record<string, string>> = {
  'מדריך-ללימוד-מערכות-מטוס-בלי-ללכת-לאיבוד': 'aircraft-systems-guide',
  'המלצות-לסימולטור-טיסה-חוויות-בלתי-נשכחות': 'flight-simulator-recommendations',
  'האם-טייס-אוטומטי-נוחת-לבד-תשובה-מהקוקפיט-simdream': 'does-autopilot-land-alone',
  'פעילות-גיבוש-לזוג-שלא-מרגישה-כמו-עוד-דייט': 'couples-flight-simulator-date',
  'אטרקציה-זוגית-יוקרתית-שלא-שוכחים': 'luxury-couples-flight-experience',
  'הכנה-לראיון-חברת-תעופה-בלי-לאבד-גובה': 'airline-interview-simulator-prep',
  'האם-אפשר-להגיע-בלי-ידע-קודם-לטייס-סימולטור': 'fly-simulator-no-experience',
  'גישה-ונחיתה-בשדות-הכי-מאתגרים-בעולם-simdream': 'challenging-airport-landings-guide',
  'איך-לבצע-גישת-אינסברוק-בעמק-בבואינג-simdream': 'innsbruck-valley-approach-737',
  'איך-להזמין-שובר-טיסה-מתנה-בלי-לפספס': 'how-to-buy-flight-voucher',
  'סימולטור-בואינג-למתחילים-איך-מתחילים-נכון': 'boeing-737-simulator-beginners',
  'מתנת-יום-הולדת-לגבר-שבאמת-מרגשת': 'birthday-gift-for-men-flight',
  'איך-מתרגלים-נחיתת-רוח-צד-בסימולטור-בואינג-737-simdream': 'crosswind-landing-practice-737',
  'רעיון-לדייט-לא-שגרתי-שבאמת-יפתיע': 'unique-date-idea-tel-aviv',
  'כמה-זמן-נמשכת-חוויית-טיסה-בסימולטור': 'flight-simulator-session-duration',
  'מדריך-לתרגול-המראה-ונחיתה-בלי-לנחש': 'takeoff-and-landing-guide-737',
  'סימולטורים-חווייתיים-לתעופה-גלה-את-עולם-הסימולטורים-לטיסה': 'experiential-flight-simulators-guide',
  'כשל-מנוע-בהמראה-ואיך-מגיבים-נכון-בקוקפיט-737-simdream': 'engine-failure-takeoff-737-guide',
  'איך-נוחתים-בפרו-בהוטן-כמו-צוות-אמיתי': 'paro-bhutan-approach-737-crew',
  'חוות-דעת-על-חוויית-טייס-במושב-קפטן-אמיתי-simdream': 'captains-seat-cockpit-review',
  'האטרקציות-התעופתיות-המובילות-בישראל-אטרקציות-תעופה-מקומיות': 'top-aviation-attractions-israel',
  'מה-כולל-שובר-מתנה-דיגיטלי-לטיסת-סימולטור': 'digital-flight-gift-voucher-guide',
  'האם-ניתן-לבחור-שדה-תעופה-לטיסה-בסימולטור-simdream': 'choose-airport-flight-simulator',
  'הפתעות-מקוריות-לבן-זוג-שבאמת-זוכרים': 'original-partner-surprise-flight',
  'סימולטור-ביתי-מול-מקצועי-מה-באמת-מרגישים': 'home-vs-pro-flight-simulator',
  'טיסה-וירטואלית-ליעדים-בעולם-כך-זה-מרגיש': 'virtual-flight-world-destinations',
  'שיטות-להפגת-פחד-טיסה': 'overcome-fear-of-flying-methods',
  'חוויה-בתל-אביב-בסימולטור-טיסה-היתרונות-של-סימולטור-טיסה-בתל-אביב': 'flight-simulator-tel-aviv-guide',
  'מדריך-לגישות-היסטוריות-מפורסמות-בטיסת-נוסעים-simdream': 'historic-airline-approaches-guide',
  'טרנדים-באירועי-חברה-שמוציאים-את-הצוות-מהשגרה-simdream': 'corporate-team-building-flight-sim',
  'איך-מתכנתים-נתיב-בfmc-בסימולטור-בואינג-737-simdream': 'program-fmc-route-boeing-737',
  'נחיתת-קאי-טאק-בסימולטור-הפנייה-שלא-שוכחים-simdream': 'kai-tak-landing-simulator-turn',
  'פעילות-משפחתית-מיוחדת-שלא-שוכחים': 'family-flight-simulator-activity',
  'האטרקציות-התעופה-המובילות-בישראל': 'best-aviation-attractions-israel',
  'למה-כדאי-לקרוא-בלוגים-על-סימולטורים-חווית-טיסה-במיטבה': 'why-read-flight-simulator-blogs',
  'בואינג-737-לעומת-איירבוס-מה-באמת-שונה': 'boeing-737-vs-airbus-differences',
  'מדריך-גישת-קאי-טאק-נחיתת-737-על-מסלול-13-simdream': 'kai-tak-runway-13-approach-737',
  'איך-לבחור-חוויית-בואינג-737-שמתאימה-לכם': 'choose-boeing-737-flight-package',
  'איך-מתכוננים-לראיון-טייס-בצורה-חכמה': 'airline-pilot-interview-tips',
};

export const TID_BY_SHORT_SLUG: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(SHORT_SLUG_BY_TID).map(([tid, slug]) => [slug, tid])
);

export const ALL_SHORT_SLUGS: readonly string[] = Object.values(SHORT_SLUG_BY_TID);

/**
 * Resolves a shortSlug, translationId, or Hebrew corpus slug to the canonical shortSlug
 * without importing `blog-slug-map.json` or `blog-seo.json`.
 */
export function resolveShortSlug(slugOrId: string): string {
  const raw = slugOrId.trim();
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw).trim();
  } catch {
    decoded = raw;
  }
  const lower = decoded.toLowerCase();

  if (SHORT_SLUG_BY_TID[raw]) return SHORT_SLUG_BY_TID[raw]!;
  if (TID_BY_SHORT_SLUG[lower]) return lower;
  if (SHORT_SLUG_BY_HE_SLUG[decoded]) return SHORT_SLUG_BY_HE_SLUG[decoded]!;
  if (SHORT_SLUG_BY_HE_SLUG[lower]) return SHORT_SLUG_BY_HE_SLUG[lower]!;
  return decoded;
}
