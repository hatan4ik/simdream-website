/**
 * Protected Wix Headless Disaster-Recovery & Provisioning CLI.
 *
 * Defaults strictly to READ-ONLY `--dry-run` mode: queries the live Wix site
 * with the anonymous visitor token, compares all 9 Bookings services, the
 * shared simulator resource pool, the 4 Pricing Plans, and the 7 Gift Card
 * design variants against `WIX_BACKEND_BLUEPRINT`, and prints the diff.
 *
 * Multi-Lock Protection against accidental backend recreation:
 *   1. Read-only default (`--dry-run` unless `--apply` is passed).
 *   2. Forbidden site denylist (blocks retired site `4c5e1c7a-163c-48ce-8278-cdc42e4deed4`).
 *   3. Already-Provisioned Circuit Breaker: if the target site is already 100%
 *      aligned (`alreadyFullyProvisioned === true`), `--apply` is hard-blocked
 *      so an existing backend can NEVER be recreated or duplicated by mistake.
 *   4. Requires `--confirm-site-id=<exact-WIX_SITE_ID>`.
 *   5. Requires `WIX_PROVISION_ALLOW_APPLY=true` and `WIX_ADMIN_API_KEY` in env.
 *
 * Usage:
 *   npm run wix:provision
 *   npm run wix:provision -- --dry-run
 */
import { loadWixLocalEnv } from './wix-env';

const PLAN_ENV_KEYS = [
  'WIX_PLAN_ID_FOUNDATIONS_5X60',
  'WIX_PLAN_ID_ADVANCED_5X90',
  'WIX_PLAN_ID_ATPL_10X60',
  'WIX_PLAN_ID_AIRLINE_10X90',
] as const;

loadWixLocalEnv(['NEXT_PUBLIC_WIX_CLIENT_ID', 'WIX_SITE_ID', ...PLAN_ENV_KEYS]);

const [
  { getWixSiteId, isWixConfigured },
  { listWixServices },
  { listWixPlans },
  { listWixGiftCardProducts },
  {
    WIX_BACKEND_BLUEPRINT,
    planWixBackendProvisioning,
    evaluateWixProvisionSafetyGate,
    buildWixServiceCreatePayload,
    buildWixPricingPlanCreatePayload,
    buildWixGiftCardProductPayload,
  },
] = await Promise.all([
  import('../lib/wix/config'),
  import('../lib/wix/bookings'),
  import('../lib/wix/plans'),
  import('../lib/wix/gift-cards'),
  import('../lib/wix/backend-blueprint'),
]);

function parseCliArgs(argv: readonly string[]): {
  apply: boolean;
  confirmSiteId: string | null;
  json: boolean;
} {
  let apply = false;
  let confirmSiteId: string | null = null;
  let json = false;

  for (const arg of argv) {
    if (arg === '--apply') apply = true;
    else if (arg === '--dry-run') apply = false;
    else if (arg === '--json') json = true;
    else if (arg.startsWith('--confirm-site-id=')) {
      confirmSiteId = arg.slice('--confirm-site-id='.length).trim() || null;
    }
  }

  return { apply, confirmSiteId, json };
}

async function wixAdminPost(
  url: string,
  siteId: string,
  adminApiKey: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: adminApiKey,
      'wix-site-id': siteId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Wix Admin API ${res.status} on ${url}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

async function wixAdminPatch(
  url: string,
  siteId: string,
  adminApiKey: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: adminApiKey,
      'wix-site-id': siteId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Wix Admin API ${res.status} on ${url}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

const args = parseCliArgs(process.argv.slice(2));
const targetSiteId = getWixSiteId();

if (!isWixConfigured()) {
  console.error(
    'Wix provision: NEXT_PUBLIC_WIX_CLIENT_ID is not configured. No Wix request was made.'
  );
  process.exit(1);
}

const [services, plans, giftCardProducts] = await Promise.all([
  listWixServices(),
  listWixPlans(),
  listWixGiftCardProducts(),
]);

const plan = planWixBackendProvisioning({
  services,
  plans,
  giftCardProducts,
});

const gate = evaluateWixProvisionSafetyGate({
  apply: args.apply,
  targetSiteId,
  confirmSiteId: args.confirmSiteId,
  envAllowApply: process.env.WIX_PROVISION_ALLOW_APPLY,
  adminApiKey: process.env.WIX_ADMIN_API_KEY,
  plan,
});

if (args.json) {
  console.log(
    JSON.stringify(
      {
        mode: args.apply ? 'apply' : 'dry-run',
        targetSiteId,
        safetyGate: gate,
        plan,
      },
      null,
      2
    )
  );
} else {
  console.log(
    `Wix Backend Blueprint Reconciliation (${args.apply ? 'APPLY REQUESTED' : 'READ-ONLY DRY RUN'})`
  );
  console.log(`  target site id: ${targetSiteId ?? 'unset'}`);
  console.log(
    `  shared simulator resource pool: ${
      plan.sharedCapacityResourceAligned
        ? `aligned (${plan.sharedCapacityResourceTypeIds.join(', ')})`
        : 'MISSING / UNALIGNED'
    }`
  );
  console.log(
    `  summary: ${plan.summary.inSyncCount} in_sync, ${plan.summary.createCount} create, ${plan.summary.updateCount} update`
  );
  console.log(
    `  already 100% provisioned: ${plan.alreadyFullyProvisioned ? 'YES (protected)' : 'NO'}`
  );

  for (const item of [...plan.services, ...plan.pricingPlans, ...plan.giftCardVariants]) {
    const badge =
      item.action === 'in_sync'
        ? '[IN_SYNC]'
        : item.action === 'create'
          ? '[CREATE] '
          : '[UPDATE] ';
    console.log(`    ${badge} ${item.domain} :: ${item.localId} -> ${item.reason}`);
  }

  console.log(`\nSafety Gate Decision: ${gate.allowedToMutate ? 'ALLOWED' : `BLOCKED [${gate.blockerCode}]`}`);
  console.log(`  ${gate.reason}`);
}

if (!args.apply) {
  process.exit(0);
}

if (!gate.allowedToMutate || !targetSiteId) {
  console.error(
    `\nABORTED: Provisioning write blocked by safety gate (${gate.blockerCode ?? 'unknown'}). Zero mutations were sent to Wix.`
  );
  process.exit(1);
}

const adminApiKey = (process.env.WIX_ADMIN_API_KEY ?? '').trim();
const sharedResourceTypeId = plan.sharedCapacityResourceTypeIds[0];

if (!sharedResourceTypeId) {
  console.error(
    '\nABORTED: No shared Boeing 737 simulator resource type ID found on target site. Create or specify the shared resource type before creating services.'
  );
  process.exit(1);
}

for (const item of plan.services) {
  if (item.action !== 'create') continue;
  const spec = WIX_BACKEND_BLUEPRINT.bookingsServices.find((s) => s.packageId === item.localId);
  if (!spec) continue;
  const payload = buildWixServiceCreatePayload(spec, sharedResourceTypeId);
  const created = await wixAdminPost(
    'https://www.wixapis.com/_api/bookings/v2/services',
    targetSiteId,
    adminApiKey,
    payload
  );
  console.log(`Created Wix Bookings service for ${spec.packageId}:`, created);
}

for (const item of plan.pricingPlans) {
  if (item.action !== 'create') continue;
  const spec = WIX_BACKEND_BLUEPRINT.pricingPlans.find((p) => p.passId === item.localId);
  if (!spec) continue;
  const payload = buildWixPricingPlanCreatePayload(spec);
  const created = await wixAdminPost(
    'https://www.wixapis.com/pricing-plans/v3/plans',
    targetSiteId,
    adminApiKey,
    payload
  );
  console.log(`Created Wix Pricing Plan for ${spec.passId}:`, created);
}

const needsGiftCardPatch = plan.giftCardVariants.some((v) => v.action !== 'in_sync');
if (needsGiftCardPatch) {
  const existingProduct = giftCardProducts[0];
  const payload = buildWixGiftCardProductPayload(existingProduct);
  const productId = existingProduct?.id ?? WIX_BACKEND_BLUEPRINT.giftCardProduct.productId;
  const updated = await wixAdminPatch(
    `https://www.wixapis.com/gift-cards/v1/gift-card-products/${productId}`,
    targetSiteId,
    adminApiKey,
    payload
  );
  console.log(`Updated Wix Gift Card product ${productId}:`, updated);
}

