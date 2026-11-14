import type { WixHttp } from './wix-http';

const API = 'https://www.wixapis.com';

export interface StagingService {
  id: string;
  name: string;
  scheduleId: string;
}

export interface ServiceMapEntry {
  /** The production service's title. */
  title: string;
  /** The staging service it is recorded under. */
  stagingName: string;
  serviceId?: string;
  scheduleId?: string;
}

/** Production service id → the staging service its bookings are recorded under. */
export type ServiceMap = Record<string, ServiceMapEntry>;

interface BookingLike {
  startDate?: string;
  endDate?: string;
  bookedEntity?: { title?: string; slot?: { serviceId?: string } };
}

/**
 * Which staging service a production title belongs to, by what the title says. The right side is the start of the
 * staging service's name. A title no rule covers, or a rule whose staging service does not exist, is created on
 * staging under its own production title, so the calendar reads the same as production.
 */
const RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/Airline Interview Prep 60/i, 'Airline Interview Prep 60 PRO'],
  [/Airline Interview Prep 90/i, 'Airline Interview Prep 90 PRO'],
  [/Airline Interview Prep 120/i, 'Airline Interview Prep 120 PRO'],
  [/פחד טיסה/, 'Fear of Flying'],
  [/סדנת הנהלה/, 'Corporate CRM'],
  [/^30 דקות/, 'Discovery Flight'],
  [/^45 דקות/, 'Daytime Special Flight'],
  [/^קברניט לשעה$|^60 דקות|^דקות 60/, "Captain's Command Flight"],
  [/^90 דקות|^דקות 90|אתגר הקברניטים/, "Captains' Challenge"],
];

const commonest = <T extends string | number>(values: readonly T[]): T | undefined => {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
};

export interface ServiceToCreate {
  key: string;
  name: string;
  minutes: number;
  /** Other production services with the same title, which share this one staging service. */
  alsoKeys?: string[];
}

export function proposeServiceMap(bookings: readonly BookingLike[], staging: readonly StagingService[]): { map: ServiceMap; toCreate: ServiceToCreate[] } {
  const byService = new Map<string, BookingLike[]>();
  for (const booking of bookings) {
    const key = booking.bookedEntity?.slot?.serviceId;
    if (key) byService.set(key, [...(byService.get(key) ?? []), booking]);
  }
  const map: ServiceMap = {};
  const toCreate: ServiceToCreate[] = [];
  for (const [key, group] of byService) {
    const title = commonest(group.map((booking) => booking.bookedEntity?.title ?? '').filter(Boolean)) ?? key;
    // A staging service that already carries the production title (made by an earlier run, or the same name on both sites) is reused.
    const prefix = RULES.find(([pattern]) => pattern.test(title))?.[1];
    const match = staging.find((service) => service.name === title) ?? (prefix ? staging.find((service) => service.name.toLowerCase().startsWith(prefix.toLowerCase())) : undefined);
    if (match) {
      map[key] = { title, stagingName: match.name, serviceId: match.id, scheduleId: match.scheduleId };
      continue;
    }
    const minutes = commonest(group.map((booking) => Math.round((Date.parse(booking.endDate ?? '') - Date.parse(booking.startDate ?? '')) / 60000)).filter((value) => value > 0)) ?? 60;
    map[key] = { title, stagingName: title };
    const sameTitle = toCreate.find((service) => service.name === title);
    if (sameTitle) sameTitle.alsoKeys = [...(sameTitle.alsoKeys ?? []), key];
    else toCreate.push({ key, name: title, minutes });
  }
  return { map, toCreate };
}

/**
 * Creates the services staging lacks, as history only: hidden, not bookable online, no category and no fee, so
 * nothing on the live site or in the booking flow can offer them. A refused service stops the run with Wix's reason.
 */
export async function createServices(http: WixHttp, toCreate: readonly ServiceToCreate[], staffResourceId: string): Promise<Record<string, { serviceId: string; scheduleId: string }>> {
  if (toCreate.length === 0) return {};
  const response = await http.request<{ results?: Array<{ itemMetadata?: { originalIndex?: number; success?: boolean; error?: { code?: string; description?: string } }; item?: { id?: string; schedule?: { id?: string } } }> }>('POST', `${API}/bookings/v2/bulk/services/create`, {
    returnEntity: true,
    services: toCreate.map((service) => ({
      name: service.name,
      type: 'APPOINTMENT',
      defaultCapacity: 1,
      hidden: true,
      onlineBooking: { enabled: false },
      staffMemberIds: [staffResourceId],
      schedule: { availabilityConstraints: { sessionDurations: [service.minutes] } },
      payment: { rateType: 'NO_FEE', options: { inPerson: true } }, // Wix requires a payment option even for a free service
    })),
  });
  const created: Record<string, { serviceId: string; scheduleId: string }> = {};
  for (const result of response.results ?? []) {
    const service = toCreate[result.itemMetadata?.originalIndex ?? -1];
    if (!service) continue;
    if (!result.itemMetadata?.success || !result.item?.id || !result.item.schedule?.id) {
      throw new Error(`Wix refused the service "${service.name}": ${result.itemMetadata?.error?.code ?? 'no id returned'} ${result.itemMetadata?.error?.description ?? ''}`.trim());
    }
    for (const key of [service.key, ...(service.alsoKeys ?? [])]) created[key] = { serviceId: result.item.id, scheduleId: result.item.schedule.id };
  }
  return created;
}
