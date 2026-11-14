import { existsSync } from 'node:fs';
import { FILES, pathIn, readJson, writeJson } from './io';
import type { WixHttp } from './wix-http';

const API = 'https://www.wixapis.com';
const BASE = `${API}/automations-service/v2/automations`;
const MAX_PAGES = 50;

/**
 * The automations that can fire from what the booking and subscription imports do, and email or message
 * customers or the owner: anything triggered by Wix Bookings, Pricing Plans or site members. Orders were
 * imported through Import Order, which sends nothing, so order automations are left alone.
 */
const FAMILIES = ['wix_bookings-', 'wix_pricing_plans-', 'wix_sitemembers_app-', 'wix_members-'] as const;

export interface PausedAutomation {
  /** The id it had when it was paused. */
  id: string;
  name: string;
  triggerKey: string;
  origin?: string;
  state: 'planned' | 'paused' | 'locked' | 'failed';
  /** The id the paused automation has now: Wix can answer a preinstalled automation under an override with a new id. */
  pausedId?: string;
  note?: string;
}

export interface AutomationsSnapshot {
  pausedAt: string;
  siteId: string;
  entries: PausedAutomation[];
}

export interface PauseSummary {
  /** Active automations in the families above, as found on the site. */
  candidates: PausedAutomation[];
  /** Paused by this tool, now or in an earlier run. */
  paused: number;
  locked: PausedAutomation[];
  failed: PausedAutomation[];
}

interface Automation {
  id: string;
  name?: string;
  origin?: string;
  settings?: { disableStatusChange?: boolean; readonly?: boolean };
  configuration?: { status?: string; trigger?: { triggerKey?: string } };
  [field: string]: unknown;
}

interface Page {
  automations?: Automation[];
  pagingMetadata?: { cursors?: { next?: string } };
  metadata?: { cursors?: { next?: string } };
}

/** Every automation on the site. Follows the cursor wherever Wix puts it; reading only the first page looks complete and is not. */
async function listAutomations(http: WixHttp): Promise<Automation[]> {
  const all: Automation[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await http.request<Page>('POST', `${BASE}/query`, { query: { cursorPaging: { limit: 100, ...(cursor ? { cursor } : {}) } } });
    all.push(...(response.automations ?? []));
    const next = response.pagingMetadata?.cursors?.next ?? response.metadata?.cursors?.next;
    if (!next || next === cursor) return all;
    cursor = next;
  }
  throw new Error(`Still more automations after ${MAX_PAGES} pages; refusing to act on a partial list.`);
}

const getAutomation = async (http: WixHttp, id: string): Promise<Automation> => (await http.request<{ automation: Automation }>('GET', `${BASE}/${id}?fields=OVERRIDE_SCHEMA`)).automation;

const entryOf = (automation: Automation): PausedAutomation => ({
  id: automation.id,
  name: automation.name ?? automation.id,
  triggerKey: automation.configuration?.trigger?.triggerKey ?? '',
  origin: automation.origin,
  state: 'planned',
});

const inFamily = (automation: Automation): boolean => FAMILIES.some((family) => (automation.configuration?.trigger?.triggerKey ?? '').startsWith(family));
const isActive = (automation: Automation): boolean => automation.configuration?.status === 'ACTIVE';

/**
 * Turns off the active booking, plan and member automations on the staging site, so importing past bookings and
 * subscription orders cannot email customers or the owner. Follows Wix's documented deactivation: read the
 * automation, leave it alone if its app locked it, change only `configuration.status`, read it back (a
 * preinstalled automation can come back under a new id). The snapshot of what was active is written before the
 * first change, so the same automations can be switched back on. Dry run unless `apply`. With `all`, every active
 * automation on the site is paused, not only those in the families above (the emergency brake).
 */
export async function pauseAutomations(http: WixHttp, dir: string, options: { apply: boolean; all?: boolean }, log: (message: string) => void = () => undefined): Promise<PauseSummary> {
  const file = pathIn(dir, FILES.pausedAutomations);
  const previous = existsSync(file) ? readJson<AutomationsSnapshot>(file) : undefined;
  const found = (await listAutomations(http)).filter((automation) => (options.all || inFamily(automation)) && isActive(automation)).map(entryOf);
  if (!options.apply) return { candidates: found, paused: previous?.entries.filter((entry) => entry.state === 'paused').length ?? 0, locked: [], failed: [] };

  // Already-paused entries are kept as they are; anything found active (including earlier failures) is tried again.
  const entries = new Map<string, PausedAutomation>((previous?.entries ?? []).filter((entry) => entry.state === 'paused').map((entry) => [entry.id, entry] as const));
  for (const entry of found) entries.set(entry.id, entry);
  const snapshot: AutomationsSnapshot = { pausedAt: previous?.pausedAt ?? new Date().toISOString(), siteId: http.siteId, entries: [...entries.values()] };
  writeJson(file, snapshot);

  for (const entry of snapshot.entries.filter((candidate) => candidate.state === 'planned')) {
    try {
      const current = await getAutomation(http, entry.id);
      if (current.settings?.disableStatusChange || current.settings?.readonly) {
        entry.state = 'locked';
        entry.note = 'the owning app does not allow its status to change';
      } else {
        const response = await http.request<{ automation: Automation }>('PATCH', `${BASE}/${entry.id}`, {
          automation: { ...current, configuration: { ...current.configuration, status: 'INACTIVE' } },
        });
        const nowId = response.automation?.id ?? entry.id;
        const readBack = await getAutomation(http, nowId);
        entry.pausedId = nowId;
        if (readBack.configuration?.status === 'INACTIVE') entry.state = 'paused';
        else {
          entry.state = 'failed';
          entry.note = `read-back shows it is still ${readBack.configuration?.status ?? 'unknown'}`;
        }
      }
    } catch (error) {
      entry.state = 'failed';
      entry.note = error instanceof Error ? error.message.slice(0, 200) : String(error);
    }
    writeJson(file, snapshot);
    log(`  ${entry.state}: ${entry.name}`);
  }
  // A locked or failed entry was never switched off, so it is not something to switch back on.
  return {
    candidates: found,
    paused: snapshot.entries.filter((entry) => entry.state === 'paused').length,
    locked: snapshot.entries.filter((entry) => entry.state === 'locked'),
    failed: snapshot.entries.filter((entry) => entry.state === 'failed'),
  };
}

/**
 * The check that runs before anything is written that could trigger an email: every automation on the site must be
 * off, except those the pause recorded as locked by their owning app (they cannot be changed through the API; each
 * is named in the snapshot and none fires from creating an order or a booking). It reads the whole list every time,
 * so an automation someone switched back on, or one the pause missed, stops the import before the first write.
 */
export async function assertAutomationsQuiet(http: WixHttp, dir: string): Promise<{ active: number; acknowledgedLocked: number }> {
  const file = pathIn(dir, FILES.pausedAutomations);
  const snapshot = existsSync(file) ? readJson<AutomationsSnapshot>(file) : undefined;
  const acknowledged = new Set((snapshot?.entries ?? []).filter((entry) => entry.state === 'locked').flatMap((entry) => [entry.id, entry.pausedId].filter((id): id is string => Boolean(id))));
  const active = (await listAutomations(http)).filter(isActive);
  const unexpected = active.filter((automation) => !acknowledged.has(automation.id));
  if (unexpected.length > 0) {
    const names = unexpected.slice(0, 10).map((automation) => `${automation.name ?? automation.id} (${automation.configuration?.trigger?.triggerKey ?? 'no trigger'})`);
    throw new Error(
      `Refusing to write: ${unexpected.length} automation(s) are active that the pause did not cover, and one could email a customer: ${names.join('; ')}` +
        `${unexpected.length > 10 ? '; …' : ''}. Run: npm run crm:migrate -- automations pause --all --apply`,
    );
  }
  return { active: active.length, acknowledgedLocked: active.length };
}
