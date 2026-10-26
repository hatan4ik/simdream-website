import { SimulatorPackage, FlightAddon, Booking, GiftVoucher, CorporateInquiry, FlightLog, UserProfile } from '@/types';
import { formatLocalYMD } from '@/lib/utils';

export const SIMULATOR_PACKAGES: SimulatorPackage[] = [
  {
    id: 'pkg-discovery-30',
    title: 'Basic Flight Session — Single Airport Takeoff & Landing',
    slug: 'discovery-30',
    category: 'recreational',
    durationMinutes: 20,
    priceIls: 250,
    priceUsd: 70,
    kantorovichVar: 'x3',
    yieldPerMinIls: 5.56,
    shortDesc: '20-minute basic flight session with a single-airport Takeoff & Landing exercise. Customize your mission with Cold & Dark (+20m), Classical EU Airports (+40m), Crosswind/IFR (+15m), or Extreme Approaches (+25m) in Step 2.',
    description: 'Step into our 1:1 scale Boeing 737 MAX cockpit for an accessible 20-minute entry flight session at a single airport of your choice (such as Ben Gurion LLBG). After a concise pre-flight controls briefing, you will line up on the active runway, advance the twin LEAP-1B throttles to takeoff thrust, rotate into the sky, fly a visual circuit, and execute a manual landing. Want a longer custom mission? Expand your flight time in Step 2 with Cold & Dark startup (+20m), Classical EU airports (+40m), Crosswind/IFR weather (+15m), or Extreme World Approaches (+25m)!',
    featured: false,
    badge: 'Basic 20m • ₪250',
    features: [
      '20 Minutes pilot-in-command flight time (Single Airport Takeoff & Landing exercise)',
      '1:1 Scale Boeing 737 MAX Cockpit & 220° 4K wrap-around visuals',
      'Pre-flight primary controls & safety briefing included',
      'Modular entry base — add Cold & Dark (+20m), EU Hubs (+40m), IFR (+15m), or Extreme Airports (+25m) in Step 2',
      '1 Guest/Observer seated in cockpit jumpseat',
      'Certified flight instructor as your First Officer',
      'Commemorative Flight Certificate',
    ],
    includesBriefing: true,
    instructorIncluded: true,
    guestSeats: 1,
  },
  {
    id: 'pkg-promo-45',
    title: 'Daytime Special Flight (45m Promo)',
    slug: 'daytime-promo-45',
    category: 'recreational',
    durationMinutes: 45,
    priceIls: 490,
    priceUsd: 135,
    daytimeOnly: true,
    kantorovichVar: 'x2',
    yieldPerMinIls: 8.17,
    shortDesc: 'Special daytime tariff (until 18:00). Extended 45-minute flight session with two landings and weather scenarios.',
    description: 'Designed for daytime flyers between 10:00 and 18:00. Enjoy 45 minutes of pure cockpit flight time (60-minute total slot including 15-minute technical turnaround), allowing you to complete a full takeoff, circuit navigation, and two approaches at international airports.',
    featured: false,
    badge: 'Daytime Promo (Until 18:00)',
    features: [
      '45 Minutes pilot-in-command flight time (+15m Prep = 60m Slot)',
      'Available strictly during daytime hours (10:00–18:00)',
      'Two full takeoffs and landings at airports of your choice',
      '220° Wrap-around 4K laser visual system',
      'Up to 2 observers in cockpit jumpseats',
      'Active airline instructor guidance throughout',
    ],
    includesBriefing: true,
    instructorIncluded: true,
    guestSeats: 2,
  },
  {
    id: 'pkg-captain-60',
    title: "Captain's Command Flight (60m)",
    slug: 'captains-command-60',
    category: 'recreational',
    durationMinutes: 60,
    priceIls: 690,
    priceUsd: 190,
    kantorovichVar: 'x1',
    yieldPerMinIls: 9.2,
    shortDesc: 'Includes Takeoff & Landing Exercise + 1 Full World Trio Theme (3 iconic airport landings of your choice), live weather challenges & up to 2 free cockpit guests.',
    description: 'Our #1 bestseller. Step into the Captain\'s seat for a complete 60-minute flight mission that combines a full Takeoff & Landing exercise with 1 World Airport Trio theme (3 iconic international landings of your choice — such as St. Maarten, Innsbruck Alps, or Hong Kong Kai Tak) plus custom weather/crosswind challenges and up to 2 family/friends in the cockpit jumpseats free of charge.',
    featured: true,
    badge: 'Most Popular • +1 Trio Included',
    features: [
      'Full 60 minutes Pilot-in-Command flight time (Takeoff & Landing Exercise + 1 World Trio)',
      'Includes 1 World Trio Route (fly 3 iconic airports in one session)',
      'Real-time customizable weather, sunset & crosswind challenges',
      'Autopilot, Flight Director & FMC navigation briefing included',
      'Up to 2 observers in cockpit jumpseats included FREE',
      'Signed Captain Flight Certificate & Logbook entry',
    ],
    includesBriefing: true,
    instructorIncluded: true,
    guestSeats: 2,
  },
  {
    id: 'pkg-ultimate-90',
    title: "Captains' Challenge & Multi-Trio Odyssey (90m)",
    slug: 'ultimate-aviator-90',
    category: 'recreational',
    durationMinutes: 90,
    priceIls: 850,
    primeTimePriceIls: 950,
    priceUsd: 235,
    kantorovichVar: 'x4',
    yieldPerMinIls: 9.05,
    shortDesc: 'Includes Takeoff & Landing Exercise + 2 World Trio Themes (up to 6 airports), Cold & Dark or V1 Engine-Out emergencies, and 1 or 2 pilots sharing the controls.',
    description: 'The ultimate 90-minute aviation adventure — ideal for one pilot seeking a deep multi-route mission OR two participants taking turns in the Captain\'s seat! Includes a full Takeoff & Landing exercise, up to 2 World Trio Airport Themes (4–6 dramatic landings worldwide), plus your choice of Cold & Dark startup or airline emergency scenarios (Engine-Out at V1, Windshear, ILS in fog). Dynamic tariff: ₪850 Daytime (until 18:00), ₪950 Evening/Weekend.',
    featured: false,
    badge: 'Best for 1–2 Pilots • +2 Trios',
    features: [
      '90 Minutes cockpit flight time (1 Pilot Deep-Dive OR 2 Pilots Sharing Controls)',
      'Includes Takeoff & Landing Exercise + Up to 2 World Airport Trio Themes (4–6 landings)',
      'Choice of Cold & Dark Cockpit Startup OR V1 Engine-Out emergency scenarios',
      'Daytime tariff ₪850 (until 18:00) | Evening & Weekend ₪950',
      'Severe weather, windshear & instrument approach training',
      'Up to 2 guests in jumpseats (can alternate flying at the controls)',
      'Complimentary 4K HD Cockpit Video Recording',
    ],
    includesBriefing: true,
    instructorIncluded: true,
    guestSeats: 2,
  },
  {
    id: 'pkg-pro-60',
    title: 'Airline Interview Prep 60 PRO',
    slug: 'airline-prep-60-pro',
    category: 'training',
    durationMinutes: 60,
    priceIls: 890,
    priceUsd: 245,
    kantorovichVar: 'pro',
    yieldPerMinIls: 11.87,
    shortDesc: 'Focused 60-minute PRO visual & IFR instrument flight training and airline simulator screening preparation.',
    description: 'Designed for licensed pilots (PPL/CPL/ATPL), cadets, and airline applicants. A focused 60-minute professional training block covering Raw Data manual flight (Flight Director OFF), precision ILS & RNAV approaches, holding patterns, and SOP callouts. The Sim Dream instructor can act as PNF/PM or cede the right seat to your personal flight instructor or crew partner.',
    featured: false,
    badge: 'PRO 60m • ₪890',
    features: [
      '60 Minutes dedicated PRO simulator training & assessment prep',
      'Raw Data manual flying (Flight Director OFF), steep turns & pitch/thrust tables',
      'Precision ILS, RNAV & Non-Precision instrument approaches',
      'Option for instructor to act as PM or cede seat to a 2nd crew member',
      'Real-time IOS instructor station position freezes & approach resets',
      'Comprehensive pre-flight briefing & post-session performance debrief',
    ],
    includesBriefing: true,
    instructorIncluded: true,
    guestSeats: 1,
  },
  {
    id: 'pkg-pro-90',
    title: 'Airline Interview Prep 90 PRO',
    slug: 'airline-prep-90-pro',
    category: 'training',
    durationMinutes: 90,
    priceIls: 1250,
    priceUsd: 345,
    kantorovichVar: 'pro',
    yieldPerMinIls: 11.9,
    shortDesc: 'Extended 90-minute PRO airline assessment checkride prep covering Raw Data, SID/STAR programming, and V1 Engine-Out profiles.',
    description: 'Our most popular PRO assessment package (90 minutes). Mirrors full European & Israeli airline simulator screening profiles (El Al, Israir, Arkia, Wizz Air, Ryanair). Includes full FMS/CDU setup, SID departure, Raw Data airwork, Single-Engine failure at V1/V2, single-engine ILS approach, go-around, and abnormal QRH checklist management.',
    featured: true,
    badge: 'PRO 90m • Most Popular PRO',
    features: [
      '90 Minutes intensive PRO airline assessment checkride simulation',
      'Full FMS/CDU initialization, performance calculation & SID/STAR flows',
      'Engine failure at V1 (V1 Cut), Single-Engine ILS & Go-Around procedures',
      'Raw Data manual flight, steep turns (45° bank) & stall recovery',
      'QRH abnormal checklist discipline & CRM workload management',
      'Detailed grading sheet & instructor debriefing report',
    ],
    includesBriefing: true,
    instructorIncluded: true,
    guestSeats: 1,
  },
  {
    id: 'pkg-assessment-prep-120',
    title: 'Airline Interview Prep 120 PRO',
    slug: 'airline-assessment-prep',
    category: 'training',
    durationMinutes: 120,
    priceIls: 1590,
    priceUsd: 435,
    kantorovichVar: 'pro',
    yieldPerMinIls: 10.6,
    shortDesc: 'Comprehensive 120-minute (2-Hour) masterclass for commercial pilots, cadets, and two-crew MCC/airline assessment candidates.',
    description: 'Rigorous 2-hour preparation for simulator evaluation checks with El Al, Arkia, Israir, Ryanair, Wizz Air, and international carriers. Conducted in accordance with EASA / FAA airline assessment profiles. Covers multiple complete checkride profiles, raw data manual flying, flight director off, steep turns, stalls, single-engine operations, non-precision and RNP-AR approaches, raw data ILS, and PF/PM role rotation.',
    featured: false,
    badge: 'PRO 120m • Full 2-Hr Block',
    features: [
      '120 Minutes dedicated simulator training (Full 2-Hour PRO Block)',
      'Conducted by active commercial airline captain',
      'Standard airline assessment profiles (Raw data, SE ILS, RNP-AR, Go-around)',
      'Full briefing & in-depth debriefing report',
      'Motorized autothrottle quadrant & dual-linked flight controls',
      'Exact B737 MAX flight dynamics matching Level-D sim',
      'Official training hour logbook sign-off',
    ],
    includesBriefing: true,
    instructorIncluded: true,
    guestSeats: 1,
  },
  {
    id: 'pkg-fear-of-flying-90',
    title: 'Fear of Flying Overcoming Course',
    slug: 'fear-of-flying-course',
    category: 'fear_of_flying',
    durationMinutes: 60,
    priceIls: 690,
    priceUsd: 190,
    kantorovichVar: 'x1',
    yieldPerMinIls: 9.2,
    shortDesc: 'A gentle, empowering 60-minute session with an experienced captain to demystify sounds, turbulence, and flight safety.',
    description: 'Overcome anxiety through knowledge and direct control. Includes a 15-minute pre-flight conversation and 45–60 minutes in the cockpit where an airline captain explains every noise, chime, and mechanical sensation on commercial flights, weather radar, and triple-redundant safety systems.',
    featured: false,
    badge: 'Life Changing',
    features: [
      'Private 1-on-1 session with patient airline captain (60m + 15m Prep)',
      'Clear explanations of turbulence, noises, and aerodynamics',
      'Demonstration of triple-redundant safety systems',
      'Gentle hands-on flight at your own comfortable pace',
      'Accompanying spouse, family member, or friend welcome',
      'Take-home flight anxiety workbook and relaxation audio',
    ],
    includesBriefing: true,
    instructorIncluded: true,
    guestSeats: 2,
  },
  {
    id: 'pkg-corporate-crm',
    title: 'Corporate CRM Leadership Workshop',
    slug: 'corporate-crm-leadership',
    category: 'corporate',
    durationMinutes: 240,
    priceIls: 4500,
    priceUsd: 1250,
    shortDesc: 'High-stakes leadership and team decision-making workshop adapted from commercial aviation Crew Resource Management.',
    description: 'Aviation transformed its safety record through Crew Resource Management (CRM)—a framework for communication, flattening steep authority gradients, and managing threats before they turn into disasters. Sim Dream brings this high-stakes training to corporate executive teams, startup founders, and managers in our 1:1 Boeing 737 MAX cockpit.',
    featured: false,
    badge: 'Executive Teams',
    features: [
      'Half-day or full-day immersive executive workshop (4 to 12 participants)',
      'Real cockpit crisis scenarios (Weather divert, fuel emergency, systems failure)',
      'Threat and Error Management (TEM) framework',
      'Flattening the authority gradient: speaking up under pressure',
      'Facilitated by veteran airline captains and organizational coaches',
      'Video debriefing of team decision-making in the cockpit',
      'Catering and conference room debriefing included',
    ],
    includesBriefing: true,
    instructorIncluded: true,
    guestSeats: 10,
  },
];

export const FLIGHT_ADDONS: FlightAddon[] = [
  {
    id: 'addon-cold-dark',
    name: 'Boeing 737 Cold & Dark Cockpit Startup',
    description: 'What you will do: Enter a completely dark, unpowered 737 MAX flight deck. Together with your instructor, you will switch on the main battery & ground power, fire up the Auxiliary Power Unit (APU), configure overhead air conditioning/bleed valves and fuel pumps, align the IRS navigation displays, and execute the real-world checklist to ignite both CFM LEAP-1B jet engines before taxi.',
    priceIls: 200,
    durationMinutes: 20,
    icon: 'Zap',
  },
  {
    id: 'addon-xwind-ifr',
    name: 'X-Wind / Live METAR / IFR Instrument Conditions',
    description: 'What it means: Instead of calm visual skies, you will fly using real-world live weather reports (METAR) under Instrument Flight Rules (IFR) inside dense cloud layers and storms. Master the rudder crab/de-crab technique against 30-knot gusting crosswinds (X-Wind) and guide the jet down to minimums using precision ILS instrument needles.',
    priceIls: 250,
    durationMinutes: 15,
    icon: 'CloudLightning',
  },
  {
    id: 'addon-extreme-airports',
    name: 'Extreme World Airports Trio — Paro (VQPR), Hong Kong Kai Tak (VHHX) & Innsbruck (LOWI)',
    description: 'What it means: Test your nerves on the world’s most dangerous Captain-only approaches where autopilot cannot land the plane. Weave visually between 18,000-ft Himalayan mountain walls into Paro, Bhutan (VQPR), execute the famous 47° low-altitude checkerboard turn at Hong Kong Kai Tak (VHHX), and thread the steep Alpine valley of Innsbruck (LOWI).',
    priceIls: 450,
    durationMinutes: 25,
    icon: 'Compass',
  },
  {
    id: 'addon-classical-eu',
    name: 'Classical EU Hubs Trio — London Heathrow (EGLL), Paris CDG (LFPG) & Amsterdam (EHAM)',
    description: 'Route & Sights: Expand your flight with a 40-minute European flagship tour across 3 iconic megahubs. Fly precision approaches over the Thames into London Heathrow (EGLL), parallel runways at Paris Charles de Gaulle (LFPG), and the polder runways below sea level at Amsterdam Schiphol (EHAM).',
    priceIls: 450,
    durationMinutes: 40,
    icon: 'Globe',
  },
  {
    id: 'addon-med-islands',
    name: 'Mediterranean Islands & Riviera Trio — Corfu (LGKR), Skiathos (LGSK) & Nice (LFMN)',
    description: 'Route & Sights: Sun-drenched coastal approaches! Skim over the monastery causeway onto Corfu’s water-bordered runway (LGKR), experience the famous plane-spotters beach threshold at Skiathos "European St. Maarten" (LGSK), and hand-fly the sweeping Riviera Visual curved turn past Monaco into Nice Côte d’Azur (LFMN).',
    priceIls: 450,
    durationMinutes: 40,
    icon: 'Globe',
  },
  {
    id: 'addon-us-megacities',
    name: 'American Megacities Skyline Trio — New York (KLGA), Washington (KDCA) & San Francisco (KSFO)',
    description: 'Route & Sights: Iconic US visual procedures! Bank past Manhattan, the Empire State Building & Statue of Liberty on LaGuardia’s Expressway Visual (KLGA Rwy 31), wind down the Potomac River past the Pentagon & Washington Monument (KDCA River Visual Rwy 19), and descend past the Golden Gate Bridge into San Francisco Bay (KSFO).',
    priceIls: 450,
    durationMinutes: 40,
    icon: 'Globe',
  },
  {
    id: 'addon-night-neon',
    name: 'City-Center & Night Neon Trio — London City (EGLC), Tokyo Haneda (RJTT) & Las Vegas (KLAS)',
    description: 'Route & Sights: Breathtaking sunset & night 4K cityscapes! Master the steep 5.5° glidepath right past Tower Bridge & Canary Wharf into London City (EGLC), fly over glittering Tokyo Tower & Rainbow Bridge into Haneda (RJTT), and land parallel to the glowing Las Vegas Strip, Sphere & Bellagio fountains (KLAS).',
    priceIls: 450,
    durationMinutes: 40,
    icon: 'Globe',
  },
  {
    id: 'addon-alpine-mountains',
    name: 'Alpine & Fjord Mountain Masters Trio — Queenstown (NZQN), Geneva (LSGG) & Salzburg (LOWS)',
    description: 'Route & Sights: Dramatic snow-capped 3D mountain navigation! Carve a curved RNP-AR path through New Zealand’s Remarkables peaks and Lake Wakatipu into Queenstown (NZQN), descend past Mont Blanc over Lake Geneva (LSGG), and execute a visual circling approach beneath the Untersberg cliffs at Salzburg (LOWS).',
    priceIls: 450,
    durationMinutes: 40,
    icon: 'Compass',
  },
  {
    id: 'addon-tropical-ocean',
    name: 'Tropical Caribbean & Ocean Runways Trio — St. Maarten (TNCM), Rio (SBRJ) & Maldives (VRMM)',
    description: 'Route & Sights: Turquoise reefs and ultra-short water strips! Skim 40 feet over Maho Beach sunbathers at St. Maarten (TNCM Rwy 10), bank past Christ the Redeemer & Sugarloaf Mountain onto Rio Santos Dumont’s 4,341-ft bay runway (SBRJ), and land on a coral atoll strip in the Indian Ocean at Malé, Maldives (VRMM).',
    priceIls: 450,
    durationMinutes: 40,
    icon: 'Globe',
  },
  {
    id: 'addon-middle-east-legends',
    name: 'Aviation Legends & Iconic Hubs Trio — Dubai (OMDB), Gibraltar Rock (LXGB) & Larnaca (LCLK)',
    description: 'Route & Sights: Soar past the Burj Khalifa and Palm Jumeirah into Dubai International (OMDB), battle mechanical wind rotors around the 1,400-ft Rock of Gibraltar onto a runway intersected by a live city avenue (LXGB), and fly the classic Eastern Med coastal approach into Larnaca, Cyprus (LCLK).',
    priceIls: 450,
    durationMinutes: 40,
    icon: 'Globe',
  },
  {
    id: 'addon-hd-video',
    name: '4K Cockpit Multi-Cam Video Recording',
    description: 'High-definition 4-camera video recording of your entire flight, cockpit instruments, and cockpit audio delivered on a custom Sim Dream USB flash drive.',
    priceIls: 120,
    durationMinutes: 0,
    icon: 'Video',
  },
  {
    id: 'addon-logbook',
    name: 'Official Sim Dream Pilot Logbook',
    description: 'Bound commemorative flight logbook signed and stamped by your Captain instructor with official session coordinates, flight hours, and simulator specs.',
    priceIls: 75,
    durationMinutes: 0,
    icon: 'BookOpen',
  },
  {
    id: 'addon-extra-seat',
    name: 'Extra Cockpit Jumpseat Passenger',
    description: 'Invite an additional friend, partner, or family member to sit in the cockpit observer jumpseats and share the full flight experience with headsets.',
    priceIls: 90,
    durationMinutes: 0,
    icon: 'Users',
  },
];

const SAMPLE_PILOTS: Array<{
  name: string;
  email: string;
  phone: string;
  level: Booking['experienceLevel'];
}> = [
  { name: 'Nathanel S.', email: 'pilot@simdream.co.il', phone: '+972-54-123-4567', level: 'enthusiast' },
  { name: 'Sarah Levi', email: 'sarah.levi@gmail.com', phone: '+972-52-987-6543', level: 'beginner' },
  { name: 'Dan Cohen', email: 'dan.cohen.pilot@gmail.com', phone: '+972-50-555-1234', level: 'student_pilot' },
  { name: 'Omer Mizrahi', email: 'omer.m@elal-va.org', phone: '+972-54-778-2211', level: 'atpl' },
  { name: 'Maya Friedman', email: 'maya.f@tlvtech.co.il', phone: '+972-52-334-9900', level: 'beginner' },
  { name: 'Itay Rosenberg', email: 'itay.rosen@gmail.com', phone: '+972-50-881-4422', level: 'enthusiast' },
  { name: 'Noam Shapira', email: 'noam.shapira@icloud.com', phone: '+972-58-412-7733', level: 'student_pilot' },
  { name: 'Tamar Katz', email: 'tamar.katz@herzliya.co.il', phone: '+972-54-609-1188', level: 'beginner' },
  { name: 'Eyal Ben-David', email: 'eyal.bd@iaf-alumni.org', phone: '+972-52-711-6050', level: 'atpl' },
  { name: 'Lior Avraham', email: 'lior.avraham@gmail.com', phone: '+972-50-902-3314', level: 'enthusiast' },
];

interface SeedSlotTemplate {
  pkgId: string;
  pkgTitle: string;
  duration: number;
  startTime: string;
  endTime: string;
  priceIls: number;
  notes: string;
}

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Demo booking reference in the real capability format (SD-737- plus 16 characters), so
 * the public lookup accepts seeded bookings. Deterministic per sequence number for stable
 * demos and tests; real bookings use cryptographic randomness (generateBookingReference).
 */
function seedBookingReference(seq: number): string {
  let state = Math.imul(seq, 2654435761) >>> 0;
  let token = '';
  for (let i = 0; i < 16; i++) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    token += REFERENCE_ALPHABET[state >>> 27];
  }
  return `SD-737-${token}`;
}

function generateMonthAheadBookings(): Booking[] {
  const generated: Booking[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let seq = 101;

  for (let dayOffset = 0; dayOffset <= 35; dayOffset++) {
    // Calendar arithmetic: adding 24h steps would repeat or skip a day across a DST change.
    const targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset);
    const dateStr = formatLocalYMD(targetDate);
    const dow = targetDate.getDay(); // 0=Sun .. 5=Fri, 6=Sat

    let templates: SeedSlotTemplate[] = [];

    if (dow === 5) {
      // FRIDAY (09:00 - 16:00, 420m fund)
      if (dayOffset % 2 === 0) {
        templates = [
          {
            pkgId: 'pkg-captain-60',
            pkgTitle: "Captain's Command Flight (60m)",
            duration: 60,
            startTime: '09:00',
            endTime: '10:00',
            priceIls: 690,
            notes: 'Friday morning 75m base slot (09:00–10:15). Leaves 15:15 30m closer open.',
          },
          {
            pkgId: 'pkg-captain-60',
            pkgTitle: "Captain's Command Flight (60m)",
            duration: 60,
            startTime: '10:15',
            endTime: '11:15',
            priceIls: 690,
            notes: 'Friday mid-morning 75m base slot (10:15–11:30).',
          },
          {
            pkgId: 'pkg-captain-60',
            pkgTitle: "Captain's Command Flight (60m)",
            duration: 60,
            startTime: '12:45',
            endTime: '13:45',
            priceIls: 690,
            notes: 'Friday midday 75m base slot (12:45–14:00).',
          },
        ];
      } else {
        templates = [
          {
            pkgId: 'pkg-discovery-30',
            pkgTitle: 'Boeing 737 MAX Basic Flight — Single Airport Takeoff & Landing (20m)',
            duration: 20,
            startTime: '09:00',
            endTime: '09:20',
            priceIls: 200,
            notes: 'Friday 09:00–09:45 (45m block). Triggers 09:45 Smart 150m Match for 90m!',
          },
          {
            pkgId: 'pkg-assessment-prep-120',
            pkgTitle: 'Airline Interview Prep 120 PRO',
            duration: 120,
            startTime: '11:30',
            endTime: '13:30',
            priceIls: 1590,
            notes: 'Friday 150m double block (11:30–14:00).',
          },
        ];
      }
    } else if (dow === 6) {
      // SATURDAY (19:00 - 24:00, 300m 100% Prime-Time)
      if (dayOffset % 2 === 0) {
        templates = [
          {
            pkgId: 'pkg-discovery-30',
            pkgTitle: 'Boeing 737 MAX Basic Flight — Single Airport Takeoff & Landing (20m)',
            duration: 20,
            startTime: '19:00',
            endTime: '19:20',
            priceIls: 200,
            notes: 'Saturday Prime 19:00–19:45 (45m). Leaves 19:45–21:30 (105m) for 90m Smart Pairing!',
          },
          {
            pkgId: 'pkg-captain-60',
            pkgTitle: "Captain's Command Flight (60m)",
            duration: 60,
            startTime: '21:30',
            endTime: '22:30',
            priceIls: 690,
            notes: 'Saturday Prime Block 2 (21:30–22:45).',
          },
        ];
      } else {
        templates = [
          {
            pkgId: 'pkg-captain-60',
            pkgTitle: "Captain's Command Flight (60m)",
            duration: 60,
            startTime: '19:00',
            endTime: '20:00',
            priceIls: 690,
            notes: 'Saturday Prime 19:00–20:15. Leaves 20:15 (60m) and full 21:30–24:00 (150m) open!',
          },
        ];
      }
    } else {
      // SUNDAY - THURSDAY (10:00 - 23:00, 780m fund)
      const pattern = dayOffset % 4;
      if (dayOffset === 1 || pattern === 1) {
        // Pattern 1 (Includes Tomorrow!): Morning 60m + Afternoon 45m Promo + Evening 18:00 20m (Triggers 18:45 Smart 90m Match!)
        templates = [
          {
            pkgId: 'pkg-captain-60',
            pkgTitle: "Captain's Command Flight (60m)",
            duration: 60,
            startTime: '10:00',
            endTime: '11:00',
            priceIls: 690,
            notes: 'Morning base slot 10:00–11:15 (incl. 15m prep).',
          },
          {
            pkgId: 'pkg-promo-45',
            pkgTitle: 'Daytime Special Flight (45m Promo)',
            duration: 45,
            startTime: '15:00',
            endTime: '15:45',
            priceIls: 490,
            notes: 'Afternoon Dynamic Block (15:00–16:00). Leaves 16:00 & 17:00 open for 45m Promo.',
          },
          {
            pkgId: 'pkg-discovery-30',
            pkgTitle: 'Boeing 737 MAX Basic Flight — Single Airport Takeoff & Landing (20m)',
            duration: 20,
            startTime: '18:00',
            endTime: '18:20',
            priceIls: 200,
            notes: 'Occupies 18:00–18:45 (incl. briefing/prep), leaving 18:45–20:30 (105m) for Smart 90m Pairing!',
          },
        ];
      } else if (pattern === 2) {
        // Pattern 2: Busy Day with 120m PRO & Evening 90m + 20m Smart Pair opportunity
        templates = [
          {
            pkgId: 'pkg-captain-60',
            pkgTitle: "Captain's Command Flight (60m)",
            duration: 60,
            startTime: '10:00',
            endTime: '11:00',
            priceIls: 690,
            notes: 'Morning slot 10:00–11:15.',
          },
          {
            pkgId: 'pkg-assessment-prep-120',
            pkgTitle: 'Airline Interview Prep 120 PRO',
            duration: 120,
            startTime: '12:30',
            endTime: '14:30',
            priceIls: 1590,
            notes: 'Occupies full 12:30–15:00 150m constructor block.',
          },
          {
            pkgId: 'pkg-ultimate-90',
            pkgTitle: "Captains' Challenge & Extreme Scenarios (90m)",
            duration: 90,
            startTime: '18:00',
            endTime: '19:30',
            priceIls: 950,
            notes: 'Prime-Time 90m (18:00–19:45). Leaves 19:45–20:30 (45m) open for 20m Smart Pairing!',
          },
          {
            pkgId: 'pkg-captain-60',
            pkgTitle: "Captain's Command Flight (60m)",
            duration: 60,
            startTime: '20:30',
            endTime: '21:30',
            priceIls: 690,
            notes: 'Prime-Time evening slot 20:30–21:45.',
          },
        ];
      } else if (pattern === 3) {
        // Pattern 3: Morning 90m (leaving 11:45 for 20m pair) + Afternoon 20m sprint + Evening 60m
        templates = [
          {
            pkgId: 'pkg-ultimate-90',
            pkgTitle: "Captains' Challenge & Extreme Scenarios (90m)",
            duration: 90,
            startTime: '10:00',
            endTime: '11:30',
            priceIls: 850,
            notes: 'Daytime 90m (10:00–11:45). Leaves 11:45–12:30 (45m) open for 20m Smart Pairing!',
          },
          {
            pkgId: 'pkg-discovery-30',
            pkgTitle: 'Boeing 737 MAX Basic Flight — Single Airport Takeoff & Landing (20m)',
            duration: 20,
            startTime: '15:00',
            endTime: '15:20',
            priceIls: 200,
            notes: 'Afternoon 20m slot (15:00–15:45).',
          },
          {
            pkgId: 'pkg-fear-of-flying-90',
            pkgTitle: 'Fear of Flying Overcoming Course',
            duration: 60,
            startTime: '19:15',
            endTime: '20:15',
            priceIls: 690,
            notes: 'Evening session 19:15–20:30.',
          },
        ];
      } else {
        // Pattern 0: Moderate Day with Morning 60m, Afternoon 45m Promo, and Late Evening 120m PRO
        templates = [
          {
            pkgId: 'pkg-captain-60',
            pkgTitle: "Captain's Command Flight (60m)",
            duration: 60,
            startTime: '11:15',
            endTime: '12:15',
            priceIls: 690,
            notes: 'Morning slot 11:15–12:30.',
          },
          {
            pkgId: 'pkg-promo-45',
            pkgTitle: 'Daytime Special Flight (45m Promo)',
            duration: 45,
            startTime: '16:00',
            endTime: '16:45',
            priceIls: 490,
            notes: 'Afternoon Dynamic 45m Promo (16:00–17:00).',
          },
          {
            pkgId: 'pkg-assessment-prep-120',
            pkgTitle: 'Airline Interview Prep 120 PRO',
            duration: 120,
            startTime: '20:30',
            endTime: '22:30',
            priceIls: 1590,
            notes: 'Evening 150m double block (20:30–23:00).',
          },
        ];
      }
    }

    templates.forEach((tpl, idx) => {
      const pilot = SAMPLE_PILOTS[(seq + idx) % SAMPLE_PILOTS.length];
      generated.push({
        id: `book-${seq}`,
        bookingReference: seedBookingReference(seq),
        packageId: tpl.pkgId,
        packageTitle: tpl.pkgTitle,
        durationMinutes: tpl.duration,
        bookingDate: dateStr,
        startTime: tpl.startTime,
        endTime: tpl.endTime,
        pilotName: pilot.name,
        pilotEmail: pilot.email,
        pilotPhone: pilot.phone,
        experienceLevel: pilot.level,
        addons: seq % 3 === 0 ? ['addon-hd-video'] : [],
        subtotalIls: tpl.priceIls,
        discountIls: 0,
        totalIls: tpl.priceIls,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'stripe',
        stripePaymentIntentId: `pi_test_simdream_${seq}`,
        notes: tpl.notes,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      });
      seq++;
    });
  }

  return generated;
}

export const DEMO_BOOKINGS: Booking[] = generateMonthAheadBookings();

export const DEMO_VOUCHERS: GiftVoucher[] = [
  {
    id: 'vouch-01',
    code: 'SD-VOUCH-DF7QK3MN8R2V6X9LPA',
    initialValueIls: 500,
    currentBalanceIls: 400,
    recipientName: 'David Ben-Ami',
    recipientEmail: 'david@example.com',
    senderName: 'Michal Ben-Ami',
    senderEmail: 'michal@example.com',
    personalMessage: 'Happy 40th Birthday David! Time to fly your favorite Boeing 737 MAX!',
    expiryDate: new Date(Date.now() + 86400000 * 365).toISOString(),
    isRedeemed: false,
    paymentStatus: 'paid',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vouch-02',
    code: 'SD-VOUCH-H5TZR8K2V9M3Q7LNXB',
    initialValueIls: 890,
    currentBalanceIls: 890,
    recipientName: 'Aviad Stern',
    recipientEmail: 'aviad@example.com',
    senderName: 'Tech Innovations LTD',
    senderEmail: 'hr@techinnovations.co.il',
    personalMessage: 'Outstanding achievement award - enjoy your Captain command flight!',
    packageId: 'pkg-captain-60',
    packageTitle: "Captain's Command Flight",
    expiryDate: new Date(Date.now() + 86400000 * 365).toISOString(),
    isRedeemed: false,
    paymentStatus: 'paid',
    createdAt: new Date().toISOString(),
  },
];

export const DEMO_CORPORATE_INQUIRIES: CorporateInquiry[] = [
  {
    id: 'corp-01',
    companyName: 'Wiz Cybersecurity',
    contactName: 'Yoni Shaked',
    email: 'yoni@wiz.io',
    phone: '+972-54-444-9988',
    teamSize: 10,
    targetDate: '2026-10-15',
    primaryGoal: 'high_stress_decision_making',
    message: 'We want to bring our VP Engineering and Director leadership team for a CRM decision-making session under simulated crises.',
    status: 'quoted',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'corp-02',
    companyName: 'Check Point Software',
    contactName: 'Noa Arad',
    email: 'noa.arad@checkpoint.com',
    phone: '+972-52-111-2233',
    teamSize: 8,
    targetDate: '2026-11-04',
    primaryGoal: 'leadership',
    message: 'Annual team offsite. Interested in psychological safety and cockpit hierarchy gradient training.',
    status: 'new',
    createdAt: new Date().toISOString(),
  },
];

export const DEMO_FLIGHT_LOGS: FlightLog[] = [
  {
    id: 'log-01',
    pilotEmail: 'pilot@simdream.co.il',
    flightDate: '2026-08-20',
    aircraftType: 'B737-MAX8',
    flightTimeHours: 1.5,
    departureIcao: 'LLBG',
    arrivalIcao: 'LCLK',
    landingsCount: 1,
    approachType: 'CAT_III_ILS',
    weatherScenario: 'Wind 280/18G25, Visibility 300m in dense fog, RVR 350m.',
    instructorSignature: 'Capt. Eitan Ronen (ATPL #2891)',
    notes: 'Flawless raw data ILS capture. Executed missed approach procedure at 200ft minima before second successful landing.',
  },
  {
    id: 'log-02',
    pilotEmail: 'pilot@simdream.co.il',
    flightDate: '2026-07-14',
    aircraftType: 'B737-MAX8',
    flightTimeHours: 1.0,
    departureIcao: 'LOWI',
    arrivalIcao: 'LOWI',
    landingsCount: 2,
    approachType: 'VISUAL',
    weatherScenario: 'Alpine valley turbulence, low cloud ceiling.',
    instructorSignature: 'Capt. Maya Alon (ATPL #3140)',
    notes: 'Innsbruck Runway 26 valley approach. Controlled bank angle and stabilized speed on final turn.',
  },
];

export const DEMO_USERS: UserProfile[] = [
  {
    id: 'usr-pilot-01',
    email: 'pilot@simdream.co.il',
    fullName: 'Nathanel S.',
    phone: '+972-54-123-4567',
    role: 'user',
    totalHours: 2.5,
    totalFlights: 2,
    pilotLicense: 'Enthusiast / Sim Pilot',
    createdAt: '2026-01-10T12:00:00Z',
  },
  {
    id: 'usr-admin-01',
    email: 'admin@simdream.co.il',
    fullName: 'Sim Dream Dispatcher',
    phone: '+972-3-987-6543',
    role: 'admin',
    totalHours: 420.0,
    totalFlights: 310,
    pilotLicense: 'Chief Instructor / ATPL',
    createdAt: '2025-06-01T08:00:00Z',
  },
];
