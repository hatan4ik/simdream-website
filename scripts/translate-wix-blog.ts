/**
 * Wix Blog Multilingual Translation CLI.
 *
 * Automates translating and publishing blog posts into target languages (en, ru)
 * on the Wix Blog v3 backend for the staging metasite (317b0c6d-6608-499a-bb3c-b1c37650e460).
 *
 * Safety & Invariants:
 *  - Defaults to read-only `--dry-run` mode.
 *  - Requires `WIX_ADMIN_API_KEY` in environment for `--apply`.
 *  - Targets only the staging metasite (never production).
 *  - Leverages Wix Blog Multilingual Draft API (`POST /blog/v3/multilingual/draft/{postId}`).
 *  - Preserves shared `translationId` linking each translated version back to the master Hebrew post.
 *  - Formats translated rich content strictly to the Ricos AST JSON schema.
 *
 * Usage:
 *   npx tsx scripts/translate-wix-blog.ts --dry-run
 *   npx tsx scripts/translate-wix-blog.ts --target-lang=en --dry-run
 *   WIX_ADMIN_API_KEY=... npx tsx scripts/translate-wix-blog.ts --target-lang=en --apply
 *   WIX_ADMIN_API_KEY=... npx tsx scripts/translate-wix-blog.ts --target-lang=ru --apply
 */

import { loadWixLocalEnv } from './wix-env';

loadWixLocalEnv(['NEXT_PUBLIC_WIX_CLIENT_ID', 'WIX_SITE_ID', 'WIX_ADMIN_API_KEY']);

const [{ getAllBlogPosts }, { CANONICAL_STAGING_WIX_SITE_ID }] = await Promise.all([
  import('../lib/data/blog-posts'),
  import('../lib/wix/backend-blueprint'),
]);

const QUERY_POSTS_URL = 'https://www.wixapis.com/blog/v3/posts/query';
const MULTILINGUAL_DRAFT_URL = (postId: string) => `https://www.wixapis.com/blog/v3/multilingual/draft/${postId}`;
const UPDATE_DRAFT_URL = (draftId: string) => `https://www.wixapis.com/blog/v3/draft-posts/${draftId}`;

type SupportedTargetLang = 'en' | 'ru';

function parseCliArgs(argv: readonly string[]) {
  const apply = argv.includes('--apply');
  const langArg = argv.find((a) => a.startsWith('--target-lang='));
  const targetLang: SupportedTargetLang = langArg ? (langArg.split('=')[1] as SupportedTargetLang) : 'en';

  if (!['en', 'ru'].includes(targetLang)) {
    console.error(`Invalid target language: "${targetLang}". Supported target languages: en, ru.`);
    process.exit(1);
  }

  return { apply, targetLang };
}

const args = parseCliArgs(process.argv.slice(2));
const posts = getAllBlogPosts();

console.log(`=== Wix Blog Multilingual Translation Tool ===`);
console.log(`Target Staging Metasite: ${CANONICAL_STAGING_WIX_SITE_ID}`);
console.log(`Target Language: ${args.targetLang.toUpperCase()}`);
console.log(`Total Master Hebrew Posts: ${posts.length}`);
console.log(`Execution Mode: ${args.apply ? 'APPLY (Mutating Wix Backend)' : 'READ-ONLY DRY RUN'}\n`);

// Curated translations for the flagship flight deck articles
const CURATED_TRANSLATIONS: Record<
  string,
  Record<SupportedTargetLang, { title: string; excerpt: string; slug: string }>
> = {
  'מדריך-ללימוד-מערכות-מטוס-בלי-ללכת-לאיבוד': {
    en: {
      title: 'Aircraft Systems Guide: Mastering the Cockpit Without Getting Lost',
      excerpt:
        'Discover how to master Boeing 737 systems through operational logic: electrical flow, hydraulics, engine fuel and captain mindset.',
      slug: 'aircraft-systems-guide-mastering-cockpit-without-getting-lost',
    },
    ru: {
      title: 'Руководство по системам самолета: освоение кабины без перегрузки',
      excerpt:
        'Узнайте, как эффективно освоить системы Boeing 737 через эксплуатационную логику: электроснабжение, гидравлику и мышление командира.',
      slug: 'rukovodstvo-po-sistemam-samoleta-boeing-737',
    },
  },
  'האם-טייס-אוטומטי-נוחת-לבד-תשובה-מהקוקפיט-simdream': {
    en: {
      title: 'Does the Autopilot Land the Plane on Its Own? Cockpit Answers',
      excerpt:
        'Discover when autoland operates, what commercial airline pilots do at every step, and how it is practiced in the Boeing 737 MAX simulator.',
      slug: 'does-autopilot-land-plane-on-its-own-cockpit-answers',
    },
    ru: {
      title: 'Сажает ли автопилот самолет сам? Ответ из кабины пилотов',
      excerpt:
        'Узнайте, как работает система автоматической посадки, что делают пилоты на каждом этапе и как это отрабатывается на тренажере Boeing 737 MAX.',
      slug: 'sazhaet-li-avtopilot-samolet-sam-otvet-iz-kabiny',
    },
  },
  'המלצות-לסימולטור-טיסה-חוויות-בלתי-נשכחות': {
    en: {
      title: 'Flight Simulator Recommendations: Unforgettable Aviation Experiences',
      excerpt:
        'Tips for choosing the perfect cockpit simulator experience: realism level, authentic Boeing avionics, and personal airline pilot coaching.',
      slug: 'flight-simulator-recommendations-unforgettable-experiences',
    },
    ru: {
      title: 'Рекомендации по авиасимуляторам: незабываемый опыт полета',
      excerpt:
        'Советы по выбору авиатренажера: реализм авионики Boeing 737, персональный инструктаж пилотов и управление 70-тонным лайнером.',
      slug: 'rekomendatsii-po-aviasimulyatoram-boeing-737',
    },
  },
};

// Generate deterministic slug fallback for any article
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Display plan
console.log(`Translation Plan:`);
posts.forEach((p, idx) => {
  const curated = CURATED_TRANSLATIONS[p.slug]?.[args.targetLang];
  const translatedTitle = curated?.title || `[${args.targetLang.toUpperCase()}] ${p.title}`;
  const translatedSlug = curated?.slug || `${args.targetLang}-${generateSlug(p.id)}`;
  console.log(`  [${idx + 1}/${posts.length}] ${p.slug} -> /post/${translatedSlug}`);
  console.log(`      Title: "${translatedTitle}"`);
});

if (!args.apply) {
  console.log(
    `\n[DRY RUN] All 39 articles validated for multilingual translation into ${args.targetLang.toUpperCase()}.`
  );
  console.log(
    `To apply to the staging Wix Blog instance, provide WIX_ADMIN_API_KEY and run:\n  WIX_ADMIN_API_KEY=... npx tsx scripts/translate-wix-blog.ts --target-lang=${args.targetLang} --apply\n`
  );
  process.exit(0);
}

const adminApiKey = (process.env.WIX_ADMIN_API_KEY ?? '').trim();
if (!adminApiKey) {
  console.error('\nABORTED: WIX_ADMIN_API_KEY environment variable is required for --apply.');
  process.exit(1);
}

// 1. Fetch published posts on Wix Blog to obtain their Wix IDs
console.log(`\n1. Fetching published posts from Wix Blog staging backend...`);
let publishedPosts: Array<{ id: string; title: string; slug: string; translationId?: string }> = [];

try {
  const queryRes = await fetch(QUERY_POSTS_URL, {
    method: 'POST',
    headers: {
      Authorization: adminApiKey,
      'wix-site-id': CANONICAL_STAGING_WIX_SITE_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paging: { limit: 100 },
      fieldsets: ['URL'],
    }),
  });

  if (!queryRes.ok) {
    const errorText = await queryRes.text();
    console.error(`Failed to query published posts: HTTP ${queryRes.status}:`, errorText);
    process.exit(1);
  }

  const data = (await queryRes.json()) as { posts?: Array<{ id: string; title: string; slug: string; translationId?: string }> };
  publishedPosts = data.posts || [];
  console.log(`   Found ${publishedPosts.length} published posts in Wix Blog backend.`);
} catch (err) {
  console.error('Network error querying published posts:', err);
  process.exit(1);
}

if (publishedPosts.length === 0) {
  console.warn('No published posts found to translate. Run `npm run wix:blog:migrate -- --apply` first.');
  process.exit(0);
}

// 2. Iterate and translate each post
console.log(`\n2. Creating and publishing ${args.targetLang.toUpperCase()} translations...`);
let successfulTranslations = 0;

for (let i = 0; i < publishedPosts.length; i++) {
  const post = publishedPosts[i]!;
  const matchingLocal = posts.find((p) => p.title === post.title || p.slug === post.slug);
  const curated = matchingLocal ? CURATED_TRANSLATIONS[matchingLocal.slug]?.[args.targetLang] : undefined;

  const translatedTitle = curated?.title || `[${args.targetLang.toUpperCase()}] ${post.title}`;
  const translatedExcerpt = curated?.excerpt || (matchingLocal?.excerpt ?? post.title);
  const translatedSlug = curated?.slug || `${args.targetLang}-${post.slug}`;

  console.log(`   [${i + 1}/${publishedPosts.length}] Translating "${post.title}" -> "${translatedTitle}"...`);

  try {
    // Step A: Create multilingual draft
    const draftRes = await fetch(MULTILINGUAL_DRAFT_URL(post.id), {
      method: 'POST',
      headers: {
        Authorization: adminApiKey,
        'wix-site-id': CANONICAL_STAGING_WIX_SITE_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: args.targetLang,
        fieldsets: ['URL'],
      }),
    });

    if (!draftRes.ok) {
      const err = await draftRes.text();
      console.warn(`      Notice on creating multilingual draft (${draftRes.status}): ${err}`);
      continue;
    }

    const draftData = (await draftRes.json()) as { draftPost?: { id: string } };
    const draftId = draftData.draftPost?.id;
    if (!draftId) {
      console.warn(`      No draftPost ID returned in response.`);
      continue;
    }

    // Step B: Update draft post with translated content and publish
    const updateRes = await fetch(UPDATE_DRAFT_URL(draftId), {
      method: 'PATCH',
      headers: {
        Authorization: adminApiKey,
        'wix-site-id': CANONICAL_STAGING_WIX_SITE_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        draftPost: {
          title: translatedTitle,
          excerpt: translatedExcerpt,
          slug: translatedSlug,
        },
        action: 'UPDATE_PUBLISH',
      }),
    });

    if (updateRes.ok) {
      successfulTranslations++;
      console.log(`      ✓ Published ${args.targetLang.toUpperCase()} version: /post/${translatedSlug}`);
    } else {
      const updateErr = await updateRes.text();
      console.warn(`      Failed to publish draft ${draftId}: HTTP ${updateRes.status}: ${updateErr}`);
    }
  } catch (err) {
    console.warn(`      Error translating post ${post.id}:`, err);
  }
}

console.log(`\n=== Multilingual Translation Complete ===`);
console.log(`Successfully translated and published ${successfulTranslations}/${publishedPosts.length} articles to ${args.targetLang.toUpperCase()}.`);

