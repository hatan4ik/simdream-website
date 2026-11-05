/**
 * Proves the Next.js repo can reach the Wix Headless backend as a visitor:
 * lists the Bookings services, reconciles them with the local catalog, and
 * fetches tomorrow's bookable slots for the 60-minute Captain's Command flight.
 *
 *   npm run wix:smoke
 *
 * Reads NEXT_PUBLIC_WIX_CLIENT_ID (and WIX_SITE_ID) from the environment or
 * .env.local. Prints no secrets: both ids are public identifiers.
 */
import { loadWixLocalEnv } from './wix-env';

loadWixLocalEnv(['NEXT_PUBLIC_WIX_CLIENT_ID', 'WIX_SITE_ID']);

const { isWixConfigured, getWixClientId, getWixSiteId, WIX_TIME_ZONE } = await import('../lib/wix/config');
const { listWixServices, listWixAvailability, reconcileCatalog, sharedWixResourceTypeIds } = await import('../lib/wix/bookings');
const { WIX_SERVICE_IDS, unmappedPackageIds } = await import('../lib/wix/catalog');

if (!isWixConfigured()) {
  console.error('NEXT_PUBLIC_WIX_CLIENT_ID is not set (environment or .env.local).');
  process.exit(2);
}

console.log(`Wix client id … ${getWixClientId()!.slice(0, 8)}…  site ${getWixSiteId() ?? '(unset)'}`);

const services = await listWixServices();
console.log(`\n${services.length} Bookings services on the headless site:`);
for (const service of services) {
  const minutes = service.schedule?.availabilityConstraints?.sessionDurations?.join('/') ?? '?';
  const price = service.payment?.fixed?.price?.value ?? service.payment?.rateType ?? '?';
  console.log(`  ${service.id}  ${String(minutes).padStart(3)}m  ₪${String(price).padStart(5)}  ${service.name}`);
}

const mismatches = reconcileCatalog(services);
const unmapped = unmappedPackageIds();
const sharedCapacityResourceTypeIds = sharedWixResourceTypeIds(services, Object.values(WIX_SERVICE_IDS));
console.log(`\nCatalog reconciliation: ${Object.keys(WIX_SERVICE_IDS).length} mapped, ${unmapped.length} unmapped, ${mismatches.length} mismatches`);
for (const m of mismatches) console.log(`  ✗ ${m.packageId} ${m.field}: expected ${m.expected}, got ${m.actual}`);
for (const id of unmapped) console.log(`  ✗ no Wix service for ${id}`);
console.log(
  `Shared simulator capacity pool: ${sharedCapacityResourceTypeIds.length > 0 ? `yes (${sharedCapacityResourceTypeIds.join(', ')})` : 'no'}`
);

const tomorrow = ymdInZone(WIX_TIME_ZONE, 1);
const serviceId = WIX_SERVICE_IDS['pkg-captain-60'];
const { timeSlots, timeZone } = await listWixAvailability({
  serviceId,
  fromLocalDate: `${tomorrow}T00:00:00`,
  toLocalDate: `${tomorrow}T23:59:00`,
});
console.log(`\nBookable 60m slots on ${tomorrow} (${timeZone}): ${timeSlots.length}`);
console.log(
  '  ' +
    (timeSlots
      .slice(0, 12)
      .map((slot) => slot.localStartDate.slice(11, 16))
      .join('  ') || '(none — staff working hours decide this; see Wix Dashboard → Bookings → Staff)')
);

process.exit(mismatches.length || unmapped.length || sharedCapacityResourceTypeIds.length === 0 ? 1 : 0);

function ymdInZone(timeZone: string, daysAhead: number): string {
  const date = new Date(Date.now() + daysAhead * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
