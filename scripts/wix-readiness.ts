/**
 * Read-only Wix Headless cutover preflight.
 *
 * It verifies the public visitor connection, SimDream-to-Wix Bookings catalog
 * parity and Pricing Plans resolvability. It never creates, changes or deletes
 * a Wix record, never prints credentials, and never enables a checkout path.
 * It also prints which component binds Wix bookings to the local scheduling
 * grid, worked out from the environment alone.
 *
 *   npm run wix:readiness
 */
import { loadWixLocalEnv } from './wix-env';

const PLAN_ENV_KEYS = [
  'WIX_PLAN_ID_FOUNDATIONS_5X60',
  'WIX_PLAN_ID_ADVANCED_5X90',
  'WIX_PLAN_ID_ATPL_10X60',
  'WIX_PLAN_ID_AIRLINE_10X90',
  'WIX_PLAN_ID_PRO_3X90',
  'WIX_PLAN_ID_PRO_5X60',
] as const;

// Read for the scheduling-grid line only: their presence is checked, their values never printed.
const GRID_ENFORCEMENT_ENV_KEYS = [
  'WIX_AVAILABILITY_ADAPTER_ENABLED',
  'WIX_BIRTHDAY_PRICING_PROVIDER_ENABLED',
  'WIX_BIRTHDAY_CLAIM_FIELD_ID',
  'WIX_BIRTHDAY_CLAIM_SECRET',
  'WIX_BIRTHDAY_PRICING_PROVIDER_APP_ID',
  'WIX_BIRTHDAY_PRICING_PROVIDER_PUBLIC_KEY',
] as const;

loadWixLocalEnv(['NEXT_PUBLIC_WIX_CLIENT_ID', 'WIX_SITE_ID', ...PLAN_ENV_KEYS, ...GRID_ENFORCEMENT_ENV_KEYS]);

// The Wix catalog module reads its optional plan-id mapping at module load.
// Import it only after .env.local has been read, so this command behaves the
// same with shell-provided and locally configured non-secret identifiers.
const [
  { SUBSCRIPTION_PASSES },
  { listWixServices, reconcileCatalog, sharedWixResourceTypeIds },
  { isWixAvailabilityAdapterEnabled, isWixConfigured },
  { unmappedPackageIds, WIX_SERVICE_IDS },
  { resolveWixPlanId },
  { listWixGiftCardProducts, reconcileGiftCardProduct },
  { assessWixReadiness },
  { wixGridEnforcement, wixGridEnforcementReport },
] = await Promise.all([
  import('../lib/data/subscription-passes'),
  import('../lib/wix/bookings'),
  import('../lib/wix/config'),
  import('../lib/wix/catalog'),
  import('../lib/wix/plans'),
  import('../lib/wix/gift-cards'),
  import('../lib/wix/readiness'),
  import('../lib/wix/booking-grid-enforcement'),
]);

// Who binds Wix-created bookings to the local grid, from this environment alone: no Wix request,
// and informational only, so it never changes the exit code (docs/WIX_BIRTHDAY_PRICING_PROVIDER.md).
const gridEnforcement = wixGridEnforcementReport({
  enforcement: wixGridEnforcement(),
  availabilityAdapterEnabled: isWixAvailabilityAdapterEnabled(),
});
console.log(gridEnforcement.line);
if (gridEnforcement.warning) console.warn(gridEnforcement.warning);

if (!isWixConfigured()) {
  console.error('Wix readiness: NEXT_PUBLIC_WIX_CLIENT_ID is not configured. No Wix request was made.');
  process.exit(1);
}

try {
  const [services, giftCardProducts] = await Promise.all([
    listWixServices(),
    listWixGiftCardProducts(),
  ]);
  const expectedSubscriptionPassIds = SUBSCRIPTION_PASSES.map((pass) => pass.id);
  const resolvedSubscriptionPassIds = [] as typeof expectedSubscriptionPassIds;
  for (const passId of expectedSubscriptionPassIds) {
    if (await resolveWixPlanId(passId)) resolvedSubscriptionPassIds.push(passId);
  }

  const report = assessWixReadiness({
    wixConfigured: true,
    unmappedPackageIds: unmappedPackageIds(),
    catalogMismatches: reconcileCatalog(services),
    sharedCapacityResourceTypeIds: sharedWixResourceTypeIds(services, Object.values(WIX_SERVICE_IDS)),
    expectedSubscriptionPassIds,
    resolvedSubscriptionPassIds,
    giftCardMismatches: reconcileGiftCardProduct(giftCardProducts),
  });

  console.log(`Wix readiness: ${services.length} Bookings services read; ${report.blockers.length} blocker(s).`);
  console.log(`  catalog aligned: ${report.catalogAligned ? 'yes' : 'no'}`);
  console.log(`  shared simulator capacity pool: ${report.capacityPoolAligned ? 'yes' : 'no'}`);
  console.log(`  gift card variants aligned: ${report.giftCardsAligned ? 'yes' : 'no'}`);
  console.log(`  shadow reads may be enabled: ${report.canRunShadowReads ? 'yes' : 'no'}`);
  console.log(`  Bookings pilot may start: ${report.canPilotWixBookings ? 'yes' : 'no'}`);
  console.log(`  subscription checkout may route: ${report.canRouteSubscriptionCheckout ? 'yes' : 'no'}`);
  console.log(`  gift card checkout may route: ${report.canRouteGiftCardCheckout ? 'yes' : 'no'}`);

  for (const blocker of report.blockers) console.error(`  BLOCKER [${blocker.code}]: ${blocker.message}`);

  if (report.blockers.length > 0) {
    console.error('\nNo Wix payment, redirect or booking writer was enabled. See docs/WIX_HEADLESS_CUTOVER_RUNBOOK.md.');
    process.exit(1);
  }
} catch {
  console.error('Wix readiness: public Wix read failed. Check the Headless client configuration and retry.');
  process.exit(1);
}
