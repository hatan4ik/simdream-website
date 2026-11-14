/**
 * Copies the production CRM (contacts, labels and purchase history) to the SimDream-Staging
 * Wix site, deduplicating and merging duplicate contacts on the way.
 *
 *   npm run crm:migrate -- <command> [flags]
 *
 *   export            read production into local files (read-only; needs WIX_SOURCE_API_KEY, WIX_SOURCE_SITE_ID)
 *   export-related    also read bookings, form submissions, members, order payments and coupons (read-only; run after export)
 *   dedupe           offline: merge duplicate contacts, write the merge report and review sheet
 *   load              write to STAGING (dry run unless --apply; needs WIX_ADMIN_API_KEY)
 *   verify            read staging back and check it against the source
 *   rollback          remove what `load` wrote (dry run unless --apply)
 *   status            show what is on disk and in the load state, no network
 *   purge --yes       delete the local data directory (it holds real customer data)
 *
 * Full guide: tools/crm-migration/README.md
 */
import { rmSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { loadWixLocalEnv } from '../../scripts/wix-env';
import { CANONICAL_STAGING_WIX_SITE_ID } from '../../lib/wix/backend-blueprint';
import { runDedupeStage } from './dedupe-stage';
import { runExport } from './export';
import { pauseAutomations } from './automations';
import { planBookings, runBookingsImport, runBookingsRollback, verifyBookings, type SourceBooking } from './bookings';
import { runExportRelated } from './export-related';
import { FILES, pathIn, readJson, resolveDataDir } from './io';
import { emptyState, runLoad, type LoadStage, type LoadState } from './load';
import type { OrderVariant } from './order-mapper';
import { runRollback } from './rollback';
import { runVerify } from './verify';
import { redirectStaffEmails, restoreStaffEmails } from './staff';
import { createServices, proposeServiceMap, type ServiceMap, type StagingService } from './services';
import { createSourceHttp, createTargetHttp } from './wix-http';

loadWixLocalEnv(['WIX_SOURCE_API_KEY', 'WIX_SOURCE_SITE_ID', 'WIX_ADMIN_API_KEY']);

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    'data-dir': { type: 'string' },
    apply: { type: 'boolean', default: false },
    only: { type: 'string' },
    limit: { type: 'string' },
    'order-variant': { type: 'string' },
    'accept-mismatch': { type: 'boolean', default: false },
    'max-cluster': { type: 'string' },
    'interval-ms': { type: 'string' },
    yes: { type: 'boolean', default: false },
    all: { type: 'boolean', default: false },
    month: { type: 'string' },
    through: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
  },
});

const command = positionals[0];
const dir = resolveDataDir(values['data-dir']);
const log = (message: string) => console.log(message);
const number = (value: string | undefined, name: string): number | undefined => {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`--${name} must be a non-negative integer.`);
  return parsed;
};
const intervalMs = number(values['interval-ms'], 'interval-ms');

function fail(message: string): never {
  console.error(`\nABORTED: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  switch (command) {
    case 'export': {
      const http = createSourceHttp({
        apiKey: process.env.WIX_SOURCE_API_KEY ?? '',
        siteId: process.env.WIX_SOURCE_SITE_ID ?? '',
        minIntervalMs: intervalMs,
      });
      console.log(`Exporting from source site ${http.siteId} (read-only) into ${dir}`);
      const manifest = await runExport(http, dir, log);
      console.log(`\nExported ${manifest.counts.contacts} contacts, ${manifest.counts.orders} orders, ${manifest.counts.planOrders} plan orders, ${manifest.counts.labels} labels.`);
      for (const warning of manifest.warnings) console.log(`  warning: ${warning}`);
      console.log('Next: npm run crm:migrate -- dedupe');
      if (!manifest.complete) process.exit(1);
      return;
    }

    case 'export-related': {
      const http = createSourceHttp({
        apiKey: process.env.WIX_SOURCE_API_KEY ?? '',
        siteId: process.env.WIX_SOURCE_SITE_ID ?? '',
        minIntervalMs: intervalMs,
      });
      console.log(`Exporting related records from source site ${http.siteId} (read-only) into ${dir}`);
      const manifest = await runExportRelated(http, dir, log);
      const { counts } = manifest;
      console.log(`\nExported ${counts.bookings} bookings, ${counts.formSubmissions} form submissions (${counts.forms} forms), ${counts.members} members, payments and refunds of ${counts.orderTransactions} orders, ${counts.coupons} coupons.`);
      for (const warning of manifest.warnings) console.log(`  warning: ${warning}`);
      for (const gap of manifest.notExported) console.log(`  not exported: ${gap.what}: ${gap.reason}`);
      if (!manifest.complete) process.exit(1);
      return;
    }

    case 'automations': {
      if (positionals[1] !== 'pause') fail('Usage: automations pause [--all] [--apply]   (restore is not built yet)');
      const apply = values.apply;
      const http = createTargetHttp({ apiKey: apply ? (process.env.WIX_ADMIN_API_KEY ?? '') : 'dry-run', minIntervalMs: intervalMs });
      console.log(`Staging ${CANONICAL_STAGING_WIX_SITE_ID}: ${apply ? 'PAUSING' : 'dry run, nothing changes'} ${values.all ? 'every active automation' : 'booking, plan and member automations'}`);
      const summary = await pauseAutomations(http, dir, { apply, all: values.all }, log);
      console.log(`\n${summary.candidates.length} active candidate(s); paused ${summary.paused}, locked ${summary.locked.length}, failed ${summary.failed.length}`);
      for (const entry of [...summary.locked, ...summary.failed]) console.log(`  ${entry.state}: ${entry.name}: ${entry.note ?? ''}`);
      if (apply) console.log(`Snapshot for the restore: ${pathIn(dir, FILES.pausedAutomations)}`);
      return;
    }

    case 'staff': {
      const sub = positionals[1];
      if (sub !== 'redirect' && sub !== 'restore') fail('Usage: staff redirect --to someone@example.com [--apply]   |   staff restore [--apply]');
      const apply = values.apply;
      const http = createTargetHttp({ apiKey: process.env.WIX_ADMIN_API_KEY ?? '', minIntervalMs: intervalMs });
      if (sub === 'restore') {
        const result = await restoreStaffEmails(http, dir, { apply }, log);
        console.log(apply ? `Restored ${result.restored} staff email(s); ${result.failed.length} failed.` : 'Dry run. Add --apply to restore the original staff emails.');
        return;
      }
      if (!values.to) fail('--to <email> is required.');
      const result = await redirectStaffEmails(http, dir, values.to!, { apply }, log);
      console.log(`${apply ? 'Pointed' : 'Would point'} ${apply ? result.changed : result.candidates.length} staff email(s) at ${values.to}; ${result.failed.length} failed.`);
      for (const entry of result.candidates) console.log(`  ${entry.name}`);
      for (const entry of result.failed) console.log(`  FAILED ${entry.name}: ${entry.note ?? ''}`);
      if (apply) console.log(`Original addresses saved (private): ${pathIn(dir, FILES.staffEmails)}`);
      else console.log('Dry run. Add --apply.');
      return;
    }

    case 'bookings': {
      const sub = positionals[1];
      if (!['services', 'plan', 'import', 'verify', 'rollback'].includes(sub ?? '')) fail('Usage: bookings <services|plan|import|verify|rollback> [--apply] [--month YYYY-MM] [--limit N]');
      const apply = values.apply;
      const live = apply || sub === 'services' || sub === 'verify';
      const http = createTargetHttp({ apiKey: live ? (process.env.WIX_ADMIN_API_KEY ?? '') : 'dry-run', minIntervalMs: intervalMs });
      const through = values.through;
      if (sub === 'services') {
        const { readNdjson } = await import('./io');
        const everyBooking = readNdjson<{ booking?: SourceBooking } & SourceBooking>(pathIn(dir, FILES.bookings)).map((row) => row.booking ?? row);
        // Only services of bookings that would really be imported need a staging home: not tests, not unfinished checkouts.
        const placeholder: ServiceMap = Object.fromEntries(everyBooking.map((booking) => [booking.bookedEntity?.slot?.serviceId ?? '', { title: '', stagingName: '', serviceId: 'x', scheduleId: 'x' }]));
        const loadState = readJson<{ contacts?: Record<string, string> }>(pathIn(dir, FILES.loadState), {});
        const candidates = planBookings({
          bookings: everyBooking,
          contactToPerson: readJson<Record<string, string>>(pathIn(dir, FILES.contactMap), {}),
          copiedContacts: loadState.contacts ?? {},
          excludedContactIds: readJson<{ contactIds?: string[] }>(pathIn(dir, FILES.excluded), {}).contactIds ?? [],
          serviceMap: placeholder,
          from: values.from ?? '2024-08-01',
          through: through ?? new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
        }).entries.map((entry) => entry.booking);
        const bookings = candidates;
        const listed = await http.request<{ services?: Array<{ id: string; name?: string; schedule?: { id?: string } }> }>('POST', 'https://www.wixapis.com/bookings/v2/services/query', { query: { paging: { limit: 100 } } });
        const staging: StagingService[] = (listed.services ?? []).filter((service) => service.name && service.schedule?.id).map((service) => ({ id: service.id, name: service.name!, scheduleId: service.schedule!.id! }));
        const { map, toCreate } = proposeServiceMap(bookings, staging);
        const existing = readJson<ServiceMap>(pathIn(dir, FILES.serviceMap), {});
        for (const [key, entry] of Object.entries(map)) if (existing[key]?.serviceId && !entry.serviceId) Object.assign(entry, existing[key]);
        const stillToCreate = toCreate.filter((service) => !map[service.key]?.serviceId);
        console.log(`${Object.keys(map).length} production service(s): ${Object.keys(map).length - stillToCreate.length} have a staging service, ${stillToCreate.length} to create (hidden, not bookable online):`);
        for (const service of stillToCreate) console.log(`  create "${service.name}" (${service.minutes} min)${service.alsoKeys?.length ? `, shared by ${service.alsoKeys.length + 1} production services` : ''}`);
        if (!apply) {
          console.log('\nDry run. Add --apply to create them and write the service map.');
          return;
        }
        if (stillToCreate.length > 0) {
          const staff = await http.request<{ staffMembers?: Array<{ name?: string; resourceId?: string }> }>('POST', 'https://www.wixapis.com/bookings/v1/staff-members/query', { query: { paging: { limit: 100 } } });
          const host = (staff.staffMembers ?? []).find((member) => member.name === 'SimDream Flight Operations') ?? staff.staffMembers?.[0];
          if (!host?.resourceId) fail('No staff member on staging to attach the new services to.');
          const created = await createServices(http, stillToCreate, host.resourceId);
          for (const [key, ids] of Object.entries(created)) Object.assign(map[key]!, ids);
        }
        const { writeJson } = await import('./io');
        writeJson(pathIn(dir, FILES.serviceMap), map);
        console.log(`\nService map written: ${pathIn(dir, FILES.serviceMap)}`);
        return;
      }
      if (sub === 'verify') {
        const report = await verifyBookings(http, dir);
        for (const check of report.checks) console.log(`${check.ok ? '✓' : '✗'} ${check.name}: ${check.detail}`);
        process.exit(report.ok ? 0 : 1);
      }
      if (sub === 'rollback') {
        const summary = await runBookingsRollback(http, dir, apply, log);
        console.log(`${apply ? 'Cancelled' : 'Would cancel'}: ${apply ? summary.removed : summary.planned} imported booking(s)`);
        for (const warning of summary.warnings.slice(0, 5)) console.log(`warning: ${warning}`);
        if (!apply) console.log('Add --apply to cancel.');
        return;
      }
      const summary = await runBookingsImport(http, dir, { apply: sub === 'import' && apply, month: values.month, limit: number(values.limit, 'limit'), through }, log);
      console.log(`\n${summary.mode === 'apply' ? 'Imported' : 'Would import'}: ${summary.planned} booking(s) in this run${summary.mode === 'apply' ? `; imported in total ${summary.imported}, failed ${summary.failed}` : ''}`);
      console.log('Left out, with the reason:');
      for (const [reason, count] of Object.entries(summary.skipped).sort((a, b) => b[1] - a[1])) console.log(`  ${String(count).padStart(5)}  ${reason}`);
      console.log('Per month: ' + Object.keys(summary.perMonth).sort().map((month) => `${month}:${summary.perMonth[month]}`).join('  '));
      if (summary.stopped) fail(summary.stopped);
      return;
    }

    case 'dedupe': {
      const report = runDedupeStage(dir, { maxClusterSize: number(values['max-cluster'], 'max-cluster') });
      console.log(`\n${report.contactsIn} contacts -> ${report.peopleOut} people`);
      console.log(`  merged automatically : ${report.mergedGroups} group(s), absorbing ${report.contactsAbsorbed} duplicate contact(s)`);
      console.log(`  held for review      : ${report.reviewGroups} group(s) covering ${report.reviewContacts} contact(s)  -> ${pathIn(dir, FILES.reviewCsv)}`);
      console.log(`  no identity at all   : ${report.contactsWithoutIdentity} contact(s) (nothing to match or create from)`);
      console.log(`  orders               : ${report.ordersIn} total, ${report.orphanOrders} whose buyer is not in the contact list`);
      console.log(`  email subscribers    : ${report.subscribedPeople} people had opted in; consent cannot be copied, they arrive as "not set"`);
      if (report.excluded) {
        console.log(`  left out by you      : ${report.excluded.contacts} contact(s) and ${report.excluded.orders} order(s) for ${report.excluded.emails.join(', ')}  (overrides.json "excludeEmails"; nothing was deleted anywhere)`);
      }
      if (report.forms) {
        const forms = report.forms;
        console.log(`  birthday forms       : ${forms.birthdaysChanged} birthday(s) replaced by the newest form answer, ${forms.birthdaysFilledIn} filled in  -> ${pathIn(dir, FILES.birthdayChanges)}`);
        console.log(`                         ${forms.submissionsAboutOthers} answer(s) are about someone other than their contact: ${forms.newPeople} new people made, ${forms.submissionsAboutOthersKept} left in the archive`);
        if (forms.invalidDates > 0 || forms.submissionsWithoutPerson > 0) console.log(`                         skipped: ${forms.invalidDates} invalid date(s), ${forms.submissionsWithoutPerson} without a contact`);
      }
      console.log(`\nReview ${FILES.mergeReport} and ${FILES.reviewCsv}. To force or forbid a merge, create ${FILES.overrides}:`);
      console.log('  { "forceMerge": [["idA","idB"]], "neverMerge": [["idC","idD"]] }   then run dedupe again.');
      console.log('Next: npm run crm:migrate -- load        (dry run)');
      return;
    }

    case 'load': {
      const only = values.only as LoadStage | undefined;
      if (only && !['contacts', 'labels', 'orders'].includes(only)) fail('--only must be contacts, labels or orders.');
      const variant = values['order-variant'] as OrderVariant | undefined;
      if (variant && !['full', 'core'].includes(variant)) fail('--order-variant must be full or core.');
      const apply = values.apply;
      const http = createTargetHttp({ apiKey: apply ? (process.env.WIX_ADMIN_API_KEY ?? '') : 'dry-run', minIntervalMs: intervalMs });
      console.log(`Target: SimDream-Staging ${CANONICAL_STAGING_WIX_SITE_ID}`);
      console.log(apply ? 'Mode: APPLY (writing to the staging Wix site)\n' : 'Mode: DRY RUN (nothing is sent to Wix)\n');
      const summary = await runLoad(http, dir, { apply, only, limit: number(values.limit, 'limit'), orderVariant: variant, acceptMismatch: values['accept-mismatch'], month: values.month, guardAutomations: true }, log);
      console.log(`\nContacts : ${summary.contacts.planned} to create, ${summary.contacts.withoutIdentity} without identity (skipped)` + (apply ? `; created ${summary.contacts.created}, matched existing ${summary.contacts.adopted}, failed ${summary.contacts.failed}` : ''));
      console.log(`Labels   : ${summary.labels.planned}` + (apply ? `; created ${summary.labels.created}, contacts labelled ${summary.labels.assigned}` : ''));
      console.log(`Orders   : ${summary.orders.planned} to import` + (apply ? `; imported so far ${summary.orders.imported} (${summary.orders.adjusted} with the coupon changed, ${summary.orders.core} with documented fields only), failed ${summary.orders.failed}` : ''));
      if (summary.orders.maxNumber !== null) console.log(`Highest order number to import: ${summary.orders.maxNumber} (set the staging order-number counter above it before real orders are taken)`);
      for (const warning of summary.warnings) console.log(`warning: ${warning}`);
      if (summary.stopped) fail(summary.stopped);
      if (!apply) console.log('\nTo write: npm run crm:migrate -- load --apply --limit 5     (small probe first), then without --limit.');
      else console.log('\nNext: npm run crm:migrate -- verify');
      if (apply && (summary.contacts.failed > 0 || summary.orders.failed > 0)) process.exit(1);
      return;
    }

    case 'verify': {
      const http = createTargetHttp({ apiKey: process.env.WIX_ADMIN_API_KEY ?? '', minIntervalMs: intervalMs });
      const report = await runVerify(http, dir, log);
      for (const check of report.checks) console.log(`${check.ok ? '✓' : '✗'} ${check.name}: ${check.detail}`);
      process.exit(report.ok ? 0 : 1);
    }

    case 'rollback': {
      const apply = values.apply;
      const http = createTargetHttp({ apiKey: apply ? (process.env.WIX_ADMIN_API_KEY ?? '') : 'dry-run', minIntervalMs: intervalMs });
      const summary = await runRollback(http, dir, apply, log, { ordersOnly: values.only === 'orders' });
      console.log(`${summary.mode === 'apply' ? 'Removed' : 'Would remove'}: ${apply ? summary.orders.removed : summary.orders.planned} imported order(s), ${apply ? summary.contacts.removed : summary.contacts.planned} contact(s); ${summary.contacts.keptBecauseTheyExistedBefore} pre-existing contact(s) are never touched.`);
      for (const warning of summary.warnings) console.log(`warning: ${warning}`);
      if (!apply) console.log('Add --apply to delete.');
      return;
    }

    case 'status': {
      const state: LoadState = { ...emptyState(), ...readJson<Partial<LoadState>>(pathIn(dir, FILES.loadState), {}) };
      console.log(`Data directory: ${dir}`);
      console.log(`Load state: ${Object.keys(state.contacts).length} contacts (${state.adopted.length} matched existing, ${state.minimal.length} identity-only), ${Object.keys(state.orders).length} orders (${Object.keys(state.adjustedOrders).length} with the coupon changed, ${state.coreOrders.length} documented-fields-only), ${state.labelsDone.length} labels done`);
      console.log(`Failures: ${Object.keys(state.contactFailures).length} contact, ${Object.keys(state.orderFailures).length} order`);
      for (const [id, reason] of Object.entries(state.contactFailures).slice(0, 5)) console.log(`  contact ${id}: ${reason}`);
      for (const [id, reason] of Object.entries(state.orderFailures).slice(0, 5)) console.log(`  order ${id}: ${reason}`);
      return;
    }

    case 'purge': {
      if (!values.yes) fail(`purge deletes ${dir}, which holds real customer data. Re-run with --yes to confirm.`);
      rmSync(dir, { recursive: true, force: true });
      console.log(`Deleted ${dir}`);
      return;
    }

    default:
      console.log(['Usage: npm run crm:migrate -- <export|export-related|dedupe|load|verify|rollback|automations|bookings|status|purge> [flags]', 'See tools/crm-migration/README.md'].join('\n'));
      process.exit(command ? 1 : 0);
  }
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
