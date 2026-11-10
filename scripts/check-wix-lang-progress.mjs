import fs from 'node:fs';

const KEY_FILE = '/tmp/wix-api-staging-key.txt';
const apiKey = fs.readFileSync(KEY_FILE, 'utf8').trim();
const SITE_ID = '317b0c6d-6608-499a-bb3c-b1c37650e460';

async function check() {
  const res = await fetch('https://www.wixapis.com/blog/v3/posts/query', {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'wix-site-id': SITE_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paging: { limit: 100 } }),
  });
  const data = await res.json();
  const posts = data.posts || [];
  const countsByLang = {};
  for (const p of posts) {
    countsByLang[p.language] = (countsByLang[p.language] || 0) + 1;
  }
  console.log(`Total published posts fetched (first 100): ${posts.length}`);
  console.log('Counts by language:', JSON.stringify(countsByLang));
  console.log(`Total count reported by API: ${data.totalCount || posts.length}`);
}

check().catch(console.error);

