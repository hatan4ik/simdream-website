/**
 * Read-only Wix Headless cutover preflight.
 *
 * It verifies the public visitor connection, SimDream-to-Wix Bookings catalog
 * parity and Pricing Plans resolvability. It never creates, changes or deletes
 * a Wix record, never prints credentials, and never enables a checkout path.
 *
 *   npm run wix:readiness
 */
import { loadWixLocalEnv } from './wix-env';

const PLAN_ENV_KEYS = [
  'WIX_PLAN_ID_FOUNDATIONS_5X60',
  'WIX_PLAN_ID_ADVANCED_5X90',
  'WIX_PLAN_ID_ATPL_10X60',
  'WIX_PLAN_ID_AIRLINE_10X90',
] as const;

loadWixLocalEnv(['NEXT_PUBLIC_WIX_CLIENT_ID', 'WIX_SITE_ID', ...PLAN_ENV_KEYS]);

// The Wix catalog module reads its optional plan-id mapping at module load.
// Import it only after .env.local has been read, so this command behaves the
// same with shell-provided and locally configured non-secret identifiers.
const [
  { SUBSCRIPTION_PASSES },
  { listWixServices, reconcileCatalog },
  { isWixConfigured },
  { unmappedPackageIds },
  { resolveWixPlanId },
  { assessWixReadiness },
] = await Promise.all([
  import('../lib/data/subscription-passes'),
  import('../lib/wix/bookings'),
  import('../lib/wix/config'),
  import('../lib/wix/catalog'),
  import('../lib/wix/plans'),
  import('../lib/wix/readiness'),
]);

if (!isWixConfigured()) {
  console.error('Wix readiness: NEXT_PUBLIC_WIX_CLIENT_ID is not configured. No Wix request was made.');
  process.exit(1);
}

try {
  const services = await listWixServices();
  const expectedSubscriptionPassIds = SUBSCRIPTION_PASSES.map((pass) => pass.id);
  const resolvedSubscriptionPassIds = [] as typeof expectedSubscriptionPassIds;
  for (const passId of expectedSubscriptionPassIds) {
    if (await resolveWixPlanId(passId)) resolvedSubscriptionPassIds.push(passId);
  }

  const report = assessWixReadiness({
    wixConfigured: true,
    unmappedPackageIds: unmappedPackageIds(),
    catalogMismatches: reconcileCatalog(services),
    expectedSubscriptionPassIds,
    resolvedSubscriptionPassIds,
  });

  console.log(`Wix readiness: ${services.length} Bookings services read; ${report.blockers.length} blocker(s).`);
  console.log(`  catalog aligned: ${report.catalogAligned ? 'yes' : 'no'}`);
  console.log(`  shadow reads may be enabled: ${report.canRunShadowReads ? 'yes' : 'no'}`);
  console.log(`  Bookings pilot may start: ${report.canPilotWixBookings ? 'yes' : 'no'}`);
  console.log(`  subscription checkout may route: ${report.canRouteSubscriptionCheckout ? 'yes' : 'no'}`);

  for (const blocker of report.blockers) console.error(`  BLOCKER [${blocker.code}]: ${blocker.message}`);

  if (report.blockers.length > 0) {
    console.error('\nNo Wix payment, redirect or booking writer was enabled. See docs/WIX_HEADLESS_CUTOVER_RUNBOOK.md.');
    process.exit(1);
  }
} catch {
  console.error('Wix readiness: public Wix read failed. Check the Headless client configuration and retry.');
  process.exit(1);
}
