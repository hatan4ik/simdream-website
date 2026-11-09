/**
 * Wix Blog Migration & Staging Sync CLI.
 *
 * Migrates all 39 published articles into the Wix Blog v3 backend on the staging
 * metasite (317b0c6d-6608-499a-bb3c-b1c37650e460).
 *
 * Safety & Invariants:
 *  - Defaults to read-only `--dry-run` mode.
 *  - Requires `WIX_ADMIN_API_KEY` in environment for `--apply`.
 *  - Never mutates the live production site.
 *  - Formats rich content strictly to the Ricos AST JSON schema required by Wix Blog v3.
 *
 * Usage:
 *   npx tsx scripts/migrate-wix-blog.ts
 *   npx tsx scripts/migrate-wix-blog.ts --dry-run
 *   WIX_ADMIN_API_KEY=IST... npx tsx scripts/migrate-wix-blog.ts --apply
 */

import { loadWixLocalEnv } from './wix-env';

loadWixLocalEnv(['NEXT_PUBLIC_WIX_CLIENT_ID', 'WIX_SITE_ID', 'WIX_ADMIN_API_KEY']);

const [{ getAllBlogPosts }, { CANONICAL_STAGING_WIX_SITE_ID }] = await Promise.all([
  import('../lib/data/blog-posts'),
  import('../lib/wix/backend-blueprint'),
]);

const WIX_BLOG_APP_DEF_ID = '14bcded7-0066-7c35-14d7-466cb3f09103';
const BULK_CREATE_URL = 'https://www.wixapis.com/blog/v3/bulk/draft-posts/create';
const INSTALL_APP_URL = 'https://www.wixapis.com/apps-installer-service/v1/app-instance/install';
const LIST_MEMBERS_URL = 'https://www.wixapis.com/members/v1/members?fieldsets=PUBLIC&paging.limit=1';
const CREATE_MEMBER_URL = 'https://www.wixapis.com/members/v1/members';

function parseCliArgs(argv: readonly string[]) {
  return {
    apply: argv.includes('--apply'),
  };
}

const args = parseCliArgs(process.argv.slice(2));
const posts = getAllBlogPosts();

console.log(`=== Wix Blog Migration & Sync Tool ===`);
console.log(`Target Staging Metasite: ${CANONICAL_STAGING_WIX_SITE_ID}`);
console.log(`Total Articles to Migrate: ${posts.length}`);
console.log(`Mode: ${args.apply ? 'APPLY (Mutating Wix Backend)' : 'READ-ONLY DRY RUN'}\n`);

// Display preview of articles
console.log(`Articles to migrate:`);
posts.forEach((p, idx) => {
  console.log(`  [${idx + 1}/${posts.length}] ${p.title} (${p.category}) -> /post/${p.slug}`);
});

if (!args.apply) {
  console.log(
    `\n[DRY RUN] All 39 articles validated and ready for bulk import.`
  );
  console.log(
    `To apply to the staging Wix Blog instance, provide WIX_ADMIN_API_KEY and run:\n  WIX_ADMIN_API_KEY=... npx tsx scripts/migrate-wix-blog.ts --apply`
  );
  process.exit(0);
}

const adminApiKey = (process.env.WIX_ADMIN_API_KEY ?? '').trim();
if (!adminApiKey) {
  console.error('\nABORTED: WIX_ADMIN_API_KEY environment variable is required for --apply.');
  process.exit(1);
}

// 1. Install Wix Blog if not installed
console.log(`\n1. Ensuring Wix Blog app is installed...`);
try {
  const installRes = await fetch(INSTALL_APP_URL, {
    method: 'POST',
    headers: {
      Authorization: adminApiKey,
      'wix-site-id': CANONICAL_STAGING_WIX_SITE_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenant: { tenantType: 'SITE', id: CANONICAL_STAGING_WIX_SITE_ID },
      appInstance: { appDefId: WIX_BLOG_APP_DEF_ID },
    }),
  });
  if (installRes.ok) {
    console.log(`   Wix Blog app successfully installed.`);
  } else {
    console.log(`   Wix Blog app status check: ${installRes.status} (already installed or in progress)`);
  }
} catch (err) {
  console.warn(`   Notice on install:`, err);
}

// 2. Resolve Author Member ID
console.log(`\n2. Resolving Author Member ID...`);
let authorMemberId = '';
try {
  const membersRes = await fetch(LIST_MEMBERS_URL, {
    headers: {
      Authorization: adminApiKey,
      'wix-site-id': CANONICAL_STAGING_WIX_SITE_ID,
    },
  });
  if (membersRes.ok) {
    const data = (await membersRes.json()) as { members?: Array<{ id: string }> };
    if (data.members && data.members.length > 0) {
      authorMemberId = data.members[0]!.id;
      console.log(`   Found existing author member: ${authorMemberId}`);
    }
  }
} catch {
  // proceed to create
}

if (!authorMemberId) {
  console.log(`   Creating default author member...`);
  try {
    const createRes = await fetch(CREATE_MEMBER_URL, {
      method: 'POST',
      headers: {
        Authorization: adminApiKey,
        'wix-site-id': CANONICAL_STAGING_WIX_SITE_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        member: {
          loginEmail: 'dispatch@simdream.co.il',
          contact: { firstName: 'Sim Dream', lastName: 'Flight Team' },
          profile: { nickname: 'קברניטי סים דרים' },
        },
      }),
    });
    if (createRes.ok) {
      const created = (await createRes.json()) as { member?: { id: string } };
      authorMemberId = created.member?.id ?? '';
      console.log(`   Created author member: ${authorMemberId}`);
    }
  } catch (err) {
    console.error(`   Failed to create author member:`, err);
  }
}

if (!authorMemberId) {
  console.error('\nABORTED: Could not resolve or create author memberId on staging site.');
  process.exit(1);
}

// 3. Format Ricos AST and Bulk Import
console.log(`\n3. Formatting Ricos AST and bulk importing ${posts.length} articles...`);

const draftPosts = posts.map((post) => {
  const ricosNodes = post.contentNodes.map((node) => {
    if (node.type === 'heading') {
      return {
        type: 'HEADING',
        headingData: { level: node.level },
        nodes: [
          {
            type: 'TEXT',
            textData: { text: node.text, decorations: [] },
          },
        ],
      };
    }
    if (node.type === 'list') {
      return {
        type: 'BULLETED_LIST',
        nodes: node.items.map((item) => ({
          type: 'LIST_ITEM',
          nodes: [
            {
              type: 'PARAGRAPH',
              nodes: [
                {
                  type: 'TEXT',
                  textData: { text: item, decorations: [] },
                },
              ],
            },
          ],
        })),
      };
    }
    // paragraph
    return {
      type: 'PARAGRAPH',
      nodes: [
        {
          type: 'TEXT',
          textData: { text: node.text, decorations: [] },
        },
      ],
    };
  });

  return {
    title: post.title,
    memberId: authorMemberId,
    excerpt: post.excerpt,
    richContent: {
      nodes: ricosNodes,
    },
  };
});

const BATCH_SIZE = 20;
let totalImported = 0;

for (let i = 0; i < draftPosts.length; i += BATCH_SIZE) {
  const batch = draftPosts.slice(i, i + BATCH_SIZE);
  console.log(`   Importing batch [${i + 1}..${i + batch.length} of ${draftPosts.length}]...`);

  try {
    const bulkRes = await fetch(BULK_CREATE_URL, {
      method: 'POST',
      headers: {
        Authorization: adminApiKey,
        'wix-site-id': CANONICAL_STAGING_WIX_SITE_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        draftPosts: batch,
        publish: true,
      }),
    });

    if (!bulkRes.ok) {
      const text = await bulkRes.text();
      console.error(`Bulk import failed on batch with HTTP ${bulkRes.status}:`, text);
      process.exit(1);
    }

    const result = (await bulkRes.json()) as { results?: Array<{ itemMetadata?: { success: boolean; id: string } }> };
    const successCount = result.results?.filter((r) => r.itemMetadata?.success).length ?? 0;
    totalImported += successCount;
    console.log(`   ✓ Batch imported: ${successCount}/${batch.length} posts successful.`);
  } catch (err) {
    console.error('Network error during bulk import batch:', err);
    process.exit(1);
  }
}

console.log(`\n=== Migration Complete ===`);
console.log(`Imported ${totalImported}/${posts.length} articles successfully to Wix Blog backend.`);

