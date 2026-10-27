/**
 * Canonical Business & Facility Configuration for SimDream Israel
 * Synchronized with Google Business Profile (Place ID: ChIJAyYTsyJLHRURRrWPGuNnmn4)
 */

export const FACILITY_INFO = {
  brandName: 'SimDream Flight Center',
  legalNameHe: 'מערכות הדמיה סימולטורים (ישראל) סיםדרים בע״מ',
  legalNameEn: 'Simulation Systems (Israel) Sim Dream LTD',
  companyRegistrationNumber: '516651031',
  primaryDomain: 'https://www.simdream.co.il',
  alternateDomain: 'https://simdream.aero',
  placeId: 'ChIJAyYTsyJLHRURRrWPGuNnmn4',
  googleRating: 5.0,
  googleRatingCount: 390,
  googleMapsUrl: 'https://maps.app.goo.gl/DDvRhUhyPgnR8Pmc9',
  googleReviewsDirectUrl:
    'https://search.google.com/local/reviews?placeid=ChIJAyYTsyJLHRURRrWPGuNnmn4',
  googleDirectionsBaseUrl:
    'https://www.google.com/maps/dir/?api=1&destination=Gershon+Shatz+St+36,+Tel+Aviv-Yafo,+Israel&destination_place_id=ChIJAyYTsyJLHRURRrWPGuNnmn4',
  wazeNavigationUrl: 'https://waze.com/ul?ll=32.0687375,34.79071&navigate=yes',
  googleEmbedUrl:
    'https://www.google.com/maps?q=Gershon+Shatz+36,+Tel+Aviv-Yafo,+Israel&hl=en&z=16&output=embed',
  coordinates: {
    lat: 32.0687375,
    lng: 34.79071,
  },
  address: {
    streetEn: 'Gershon Shatz St 36',
    cityEn: 'Tel Aviv-Yafo, 6701772, Israel',
    neighborhoodEn: 'Montefiore Quarter (Near Yehudit Light Rail & HaShalom Train)',
    streetHe: 'גרשון ש"ץ 36',
    cityHe: 'תל אביב-יפו, 6701772',
  },
  contact: {
    phoneDisplay: '055-507-1307',
    phoneInternational: '+972-55-507-1307',
    phoneHref: 'tel:+972555071307',
    whatsappHref: 'https://wa.me/972555071307',
    email: 'desk@simdream.co.il',
    emailHref: 'mailto:desk@simdream.co.il',
  },
  social: {
    instagramUrl: 'https://www.instagram.com/simdream_israel/',
    facebookUrl: 'https://www.facebook.com/Sim-Dream-Israel-104268755679413',
  },
  requirements: {
    minimumAgeYears: 10,
    adultSupervisionAgeRange: '10–15',
    minBookingCustomerAgeYears: 18,
    arriveEarlyMinutes: 5,
    lateThresholdMinutes: 10,
    maxJumpseatGuests: 2,
    advanceBookingRequired: true,
  },
  hours: {
    sunThu: { open: '10:00', close: '23:00', openMin: 600, closeMin: 1380 },
    fri: { open: '09:00', close: '16:00', openMin: 540, closeMin: 960 },
    sat: { open: '19:00', close: '24:00', openMin: 1140, closeMin: 1440 },
  },
} as const;

export interface LiveFacilityStatus {
  isOpen: boolean;
  israelTimeFormatted: string;
  currentDayRange: string;
  statusHeadlineEn: string;
  statusSublineEn: string;
  statusHeadlineHe: string;
  statusSublineHe: string;
}

/**
 * Dynamically calculates whether SimDream Tel Aviv is currently OPEN or CLOSED
 * in Israel Standard/Daylight Time (Asia/Jerusalem) against the official schedule:
 * - Sun–Thu: 10:00 – 23:00
 * - Fri:     09:00 – 16:00
 * - Sat:     19:00 – 24:00
 */
export function getLiveFacilityStatus(now: Date = new Date()): LiveFacilityStatus {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jerusalem',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const weekdayStr = parts.find((p) => p.type === 'weekday')?.value || 'Sun';
    const hourStr = parts.find((p) => p.type === 'hour')?.value || '12';
    const minuteStr = parts.find((p) => p.type === 'minute')?.value || '00';

    const hour = parseInt(hourStr, 10) % 24;
    const minute = parseInt(minuteStr, 10);
    const currentMin = hour * 60 + minute;
    const israelTimeFormatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const dow = dayMap[weekdayStr] ?? 0;

    let openMin = 600;
    let closeMin = 1380;
    let openLabel = '10:00';
    let closeLabel = '23:00';

    if (dow === 5) {
      openMin = 540;
      closeMin = 960;
      openLabel = '09:00';
      closeLabel = '16:00';
    } else if (dow === 6) {
      openMin = 1140;
      closeMin = 1440;
      openLabel = '19:00';
      closeLabel = '24:00';
    }

    const isOpen = currentMin >= openMin && currentMin < closeMin;
    const currentDayRange = `${openLabel} – ${closeLabel}`;

    if (isOpen) {
      const remainingMin = closeMin - currentMin;
      const remHours = Math.floor(remainingMin / 60);
      const remMins = remainingMin % 60;
      const remTextEn = remHours > 0 ? `${remHours}h ${remMins}m` : `${remMins}m`;
      const remTextHe = remHours > 0 ? `${remHours} שע׳ ו-${remMins} דק׳` : `${remMins} דק׳`;

      return {
        isOpen: true,
        israelTimeFormatted,
        currentDayRange,
        statusHeadlineEn: `OPEN NOW • Today ${currentDayRange}`,
        statusSublineEn: `Tel Aviv Time: ${israelTimeFormatted} IST (Closes in ${remTextEn})`,
        statusHeadlineHe: `פתוח כעת • היום ${currentDayRange}`,
        statusSublineHe: `שעון תל אביב: ${israelTimeFormatted} (נסגר בעוד ${remTextHe})`,
      };
    }

    // Determine next opening window
    let nextOpenEn = `Today at ${openLabel}`;
    let nextOpenHe = `היום ב-${openLabel}`;

    if (currentMin >= closeMin) {
      if (dow === 4) {
        // Thursday night -> Friday 09:00
        nextOpenEn = 'Friday at 09:00';
        nextOpenHe = 'יום שישי ב-09:00';
      } else if (dow === 5) {
        // Friday afternoon -> Saturday 19:00
        nextOpenEn = 'Saturday at 19:00';
        nextOpenHe = 'מוצ״ש ב-19:00';
      } else {
        nextOpenEn = 'Tomorrow at 10:00';
        nextOpenHe = 'מחר ב-10:00';
      }
    }

    return {
      isOpen: false,
      israelTimeFormatted,
      currentDayRange,
      statusHeadlineEn: `CURRENTLY CLOSED • Opens ${nextOpenEn}`,
      statusSublineEn: `Tel Aviv Time: ${israelTimeFormatted} IST • Advance Booking Open 24/7`,
      statusHeadlineHe: `סגור כעת • נפתח ${nextOpenHe}`,
      statusSublineHe: `שעון תל אביב: ${israelTimeFormatted} • הזמנה אונליין פתוחה 24/7`,
    };
  } catch {
    return {
      isOpen: true,
      israelTimeFormatted: '12:00',
      currentDayRange: '10:00 – 23:00',
      statusHeadlineEn: 'OPEN & OPERATIONAL • Advance Booking Required',
      statusSublineEn: 'Sun–Thu 10:00–23:00 • Fri 09:00–16:00 • Sat 19:00–24:00',
      statusHeadlineHe: 'פתוח ופעיל • בתיאום והזמנה מראש',
      statusSublineHe: 'א׳–ה׳ 10:00–23:00 • ו׳ 09:00–16:00 • ש׳ 19:00–24:00',
    };
  }
}

export interface RouteOriginPreset {
  id: string;
  labelEn: string;
  labelHe: string;
  query: string;
  lat: number;
  lng: number;
  transitStepsEn: string;
  transitStepsHe: string;
  drivingStepsEn: string;
  drivingStepsHe: string;
  walkingMinutes?: number;
  transitMinutes: number;
  drivingMinutes: number;
  distanceKm: number;
}

/**
 * Dynamic Google Maps Route Presets & Algorithmic Haversine/Transit Estimator
 * for arriving at Gershon Shatz St 36, Tel Aviv-Yafo
 */
export const ROUTE_ORIGIN_PRESETS: RouteOriginPreset[] = [
  {
    id: 'yehudit-lrt',
    labelEn: 'Yehudit Light Rail Station (Red Line)',
    labelHe: 'תחנת הרכבת הקלה יהודית (הקו האדום)',
    query: 'Yehudit Station, Tel Aviv-Yafo',
    lat: 32.0702,
    lng: 34.7891,
    walkingMinutes: 4,
    transitMinutes: 4,
    drivingMinutes: 2,
    distanceKm: 0.35,
    transitStepsEn:
      'Exit Yehudit underground station (Red Line) toward Yitzhak Sadeh / HaMasger → Walk south-east along Montefiore streets into Gershon Shatz St 36 (~350m, 4 min walk).',
    transitStepsHe:
      'צאו מתחנת הרכבת הקלה "יהודית" (הקו האדום) לכיוון המסגר / יצחק שדה ← הליכה קצרה של כ-350 מטר (4 דקות) לתוך שכונת מונטיפיורי עד רחוב גרשון ש"ץ 36.',
    drivingStepsEn:
      'From Begin Rd / Yehudit Blvd turn onto Yitzhak Sadeh St → Turn into Gershon Shatz St 36. Street parking (Blue & White) or private paid lots available.',
    drivingStepsHe:
      'מדרך בגין פנו לרחוב יצחק שדה ← כניסה לרחוב גרשון ש"ץ 36. חניה בכחול-לבן ברחוב או בחניונים פרטיים בתשלום בסביבה.',
  },
  {
    id: 'hashalom-train',
    labelEn: 'Tel Aviv HaShalom Train Station (Israel Railways)',
    labelHe: 'תחנת רכבת השלום תל אביב (רכבת ישראל)',
    query: 'Tel Aviv HaShalom Railway Station',
    lat: 32.0734,
    lng: 34.7932,
    walkingMinutes: 9,
    transitMinutes: 6,
    drivingMinutes: 4,
    distanceKm: 0.75,
    transitStepsEn:
      'Exit HaShalom Train Station (Azrieli) west toward Begin Rd → Walk 8–10 minutes south via Derech Menachem Begin & Yitzhak Sadeh St (or hop 1 stop on Red Line Light Rail to Yehudit Station) → Arrive at Gershon Shatz St 36.',
    transitStepsHe:
      'צאו מתחנת רכבת השלום (עזריאלי) מערבה לכיוון דרך בגין ← הליכה נוחה של 8–10 דקות דרומה דרך יצחק שדה (או תחנה אחת ברכבת הקלה לתחנת יהודית) ← הגעה לגרשון ש"ץ 36.',
    drivingStepsEn:
      'Head south on Derech Menachem Begin from Azrieli Junction → Turn left onto Yitzhak Sadeh St → Turn onto Gershon Shatz St 36.',
    drivingStepsHe:
      'מצומת עזריאלי סעו דרומה על דרך מנחם בגין ← פנו שמאלה לרחוב יצחק שדה ← כניסה לרחוב גרשון ש"ץ 36.',
  },
  {
    id: 'ben-gurion-llbg',
    labelEn: 'Ben Gurion Airport (TLV / LLBG)',
    labelHe: 'נמל התעופה בן גוריון (נתב״ג)',
    query: 'Ben Gurion Airport, Israel',
    lat: 32.0055,
    lng: 34.8854,
    transitMinutes: 22,
    drivingMinutes: 18,
    distanceKm: 14.5,
    transitStepsEn:
      'Take Israel Railways from Ben Gurion Airport Station directly to Tel Aviv HaShalom Station (12 min train ride) → Walk 9 minutes via Yitzhak Sadeh St to Gershon Shatz St 36.',
    transitStepsHe:
      'קחו רכבת ישירה מתחנת נתב״ג לתחנת תל אביב השלום (12 דקות נסיעה) ← משם 9 דקות הליכה דרך רחוב יצחק שדה אל גרשון ש"ץ 36.',
    drivingStepsEn:
      'Take Route 1 West (Tel Aviv Highway) to Ayalon North (Route 20) → Exit at La Guardia / HaShalom toward Yitzhak Sadeh St → Turn into Gershon Shatz St 36. Paid street parking or private parking lots nearby.',
    drivingStepsHe:
      'צאו מכביש 1 מערב לאיילון צפון (כביש 20) ← צאו במחלף לה גווארדיה / השלום לכיוון רחוב יצחק שדה ← פנו לגרשון ש"ץ 36. חניה בכחול-לבן או בחניונים פרטיים בתשלום.',
  },
  {
    id: 'herzliya-north',
    labelEn: 'Herzliya / North Tel Aviv',
    labelHe: 'הרצליה / צפון תל אביב',
    query: 'Herzliya, Israel',
    lat: 32.1624,
    lng: 34.8447,
    transitMinutes: 24,
    drivingMinutes: 20,
    distanceKm: 12.8,
    transitStepsEn:
      'Take Israel Railways south to Tel Aviv HaShalom Station OR Red Line Light Rail to Yehudit Station → Short walk to Gershon Shatz St 36.',
    transitStepsHe:
      'רכבת ישראל דרומה לתחנת השלום או הקו האדום של הרכבת הקלה לתחנת יהודית ← הליכה קצרה לגרשון ש"ץ 36.',
    drivingStepsEn:
      'Take Ayalon South (Route 20) → Exit at HaShalom → Continue to Yitzhak Sadeh St and turn into Gershon Shatz St 36.',
    drivingStepsHe:
      'סעו באיילון דרום (כביש 20) ← צאו במחלף השלום ← המשיכו לרחוב יצחק שדה ופנו לגרשון ש"ץ 36.',
  },
  {
    id: 'rishon-south',
    labelEn: 'Rishon LeZion / Bat Yam / South',
    labelHe: 'ראשון לציון / בת ים / דרום',
    query: 'Rishon LeZion, Israel',
    lat: 31.973,
    lng: 34.7925,
    transitMinutes: 26,
    drivingMinutes: 19,
    distanceKm: 11.4,
    transitStepsEn:
      'Ride the Red Line Light Rail directly to Yehudit Station (4 min walk to Gershon Shatz 36) OR Israel Railways to Tel Aviv HaShalom Station.',
    transitStepsHe:
      'סעו ישירות בקו האדום של הרכבת הקלה עד תחנת "יהודית" (4 דקות הליכה לגרשון ש"ץ 36) או ברכבת ישראל לתחנת השלום.',
    drivingStepsEn:
      'Take Ayalon North (Route 20) → Exit at La Guardia / Yitzhak Sadeh St → Turn into Gershon Shatz St 36.',
    drivingStepsHe:
      'סעו באיילון צפון (כביש 20) ← צאו במחלף לה גווארדיה / יצחק שדה ← פנו לרחוב גרשון ש"ץ 36.',
  },
];

/**
 * Haversine distance & ETA algorithm from user's live GPS coordinates to Gershon Shatz 36
 */
export function calculateDynamicRouteFromCoords(lat: number, lng: number) {
  const R = 6371; // Earth radius km
  const dLat = ((FACILITY_INFO.coordinates.lat - lat) * Math.PI) / 180;
  const dLng = ((FACILITY_INFO.coordinates.lng - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat * Math.PI) / 180) *
      Math.cos((FACILITY_INFO.coordinates.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineKm = R * c;
  // Road network tortuosity factor (~1.32x urban grid)
  const roadDistanceKm = Math.max(0.2, Math.round(straightLineKm * 1.32 * 10) / 10);

  const walkingMinutes = Math.max(2, Math.round((roadDistanceKm / 4.8) * 60));
  const drivingMinutes = Math.max(3, Math.round((roadDistanceKm / 28) * 60 + 4));
  const transitMinutes = Math.max(5, Math.round((roadDistanceKm / 22) * 60 + 5));

  return {
    roadDistanceKm,
    walkingMinutes,
    drivingMinutes,
    transitMinutes,
  };
}
