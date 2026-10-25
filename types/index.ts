export type PackageCategory = 'recreational' | 'training' | 'corporate' | 'fear_of_flying';
export type FlightPackageDuration = 20 | 45 | 60 | 90 | 120 | 240;
export type PilotExperienceLevel = 'beginner' | 'enthusiast' | 'student_pilot' | 'atpl';
export type AddonIconName =
  | 'Zap'
  | 'CloudLightning'
  | 'Compass'
  | 'Globe'
  | 'Video'
  | 'BookOpen'
  | 'Users'
  | 'GraduationCap';
export type AddonCategory = 'procedure_weather' | 'route_trio' | 'media_guest';

export interface SimulatorPackage {
  id: string;
  title: string;
  slug: string;
  category: PackageCategory;
  durationMinutes: FlightPackageDuration;
  priceIls: number;
  primeTimePriceIls?: number;
  priceUsd: number;
  shortDesc: string;
  description: string;
  featured?: boolean;
  badge?: string;
  daytimeOnly?: boolean;
  kantorovichVar?: 'x1' | 'x2' | 'x3' | 'x4' | 'pro';
  yieldPerMinIls?: number;
  features: string[];
  includesBriefing: boolean;
  instructorIncluded: boolean;
  guestSeats: number;
}

export type SlotBlockPeriod = 'morning' | 'afternoon' | 'evening' | 'friday_closer' | 'saturday_prime';
export type SlotSmartRecommendation = 'optimal_150_pair' | 'friday_30m_closer' | 'zero_waste_fit' | 'daytime_promo_fit' | null;
export type SlotDisabledReason = 'booked' | 'orphan_gap' | 'daytime_only_promo' | 'friday_closer_30m_only' | 'exceeds_closing' | null;

export interface FlightSlot {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (Flight start)
  endTime: string; // HH:mm (Flight end = start + durationMinutes)
  reservedEndTime: string; // HH:mm (Total slot end = start + durationMinutes + 15m turnaround)
  durationMinutes: number; // Pure flight time
  totalReservedMinutes: number; // Flight time + 15m pause
  available: boolean;
  blockPeriod: SlotBlockPeriod;
  blockLabel: string; // e.g. "Block 1 (Morning 10:00–15:00)"
  isPrimeTime: boolean;
  dynamicPriceIls: number;
  basePriceIls: number;
  yieldPerMinIls: number;
  smartRecommendation?: SlotSmartRecommendation;
  recommendationNote?: string;
  disabledReason?: SlotDisabledReason;
  disabledNote?: string;
  suggestedAlternativeTime?: string;
  maxAvailableMinutes?: number; // Max pure flight minutes before next booking or closing
}

export interface GapCollisionAlert {
  id: string;
  gapStart: string;
  gapEnd: string;
  gapMinutes: number;
  lostRevenueIls: number;
  violatingBookingId?: string;
  violatingBookingRef?: string;
  recommendedShiftTime: string;
  message: string;
}

export interface DailyScheduleBlock {
  start: string;
  end: string;
  type: 'booked' | 'turnaround' | 'free_valid' | 'orphan_gap';
  minutes: number;
  booking?: Booking;
  label: string;
  recommendedShiftTime?: string;
}

export interface DailyEfficiencyReport {
  date: string;
  dayOfWeek: number;
  operatingWindow: string; // e.g. "10:00 - 23:00"
  totalFundMinutes: number; // 780 (Sun-Thu), 420 (Fri), 300 (Sat)
  bookedMinutes: number; // Pure flight + 15m turnaround
  pureFlightMinutes: number;
  turnaroundMinutes: number;
  freeValidMinutes: number;
  orphanGapMinutes: number; // Dead windows («хвосты»)
  efficiencyPercent: number;
  actualRevenueIls: number;
  projectedMaxRevenueIls: number;
  potentialLostRevenueIls: number;
  isZeroWasteCompliant: boolean;
  gapAlerts: GapCollisionAlert[];
  timelineBlocks: DailyScheduleBlock[];
}

export interface FlightAddon {
  id: string;
  name: string;
  description: string;
  priceIls: number;
  durationMinutes: number; // Additional cockpit minutes added by this mission module (0 for media/merch)
  category?: AddonCategory;
  icon: AddonIconName;
}

export interface MissionManifestAddonItem {
  addon: FlightAddon;
  durationMinutes: number;
  priceIls: number;
}

export interface MissionManifestCalculation {
  cleanPackageTitle: string;
  baseDurationMinutes: number;
  addonsDurationMinutes: number;
  totalDurationMinutes: number;
  startTime: string;
  effectiveEndTime: string;
  maxAvailableMinutes: number;
  basePriceIls: number;
  addonsPriceIls: number;
  subtotalIls: number;
  discountIls: number;
  totalIls: number;
  selectedAddonItems: MissionManifestAddonItem[];
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PaymentStatus = 'paid' | 'pending' | 'refunded';
export type PaymentMethod = 'stripe' | 'voucher' | 'desk';
export type VoucherPaymentStatus = 'pending' | 'paid' | 'refunded';

export interface Booking {
  id: string;
  bookingReference: string;
  /** Set only after a verified member purchases or claims a guest booking. */
  userId?: string;
  packageId: string;
  packageTitle: string;
  durationMinutes: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  pilotName: string;
  pilotEmail: string;
  pilotPhone: string;
  experienceLevel: PilotExperienceLevel;
  addons: string[];
  subtotalIls: number;
  discountIls: number;
  totalIls: number;
  voucherCode?: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  stripePaymentIntentId?: string;
  notes?: string;
  createdAt: string;
}

export interface GiftVoucher {
  id: string;
  code: string;
  initialValueIls: number;
  currentBalanceIls: number;
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  senderEmail: string;
  personalMessage: string;
  packageId?: string;
  packageTitle?: string;
  expiryDate: string;
  isRedeemed: boolean;
  paymentStatus: VoucherPaymentStatus;
  stripeCheckoutSessionId?: string;
  activatedAt?: string;
  createdAt: string;
}

export type CorporateGoal = 'leadership' | 'team_communication' | 'high_stress_decision_making' | 'vip_incentive';
export type CorporateInquiryStatus = 'new' | 'contacted' | 'quoted' | 'confirmed';

export interface CorporateInquiry {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  teamSize: number;
  targetDate?: string;
  primaryGoal: CorporateGoal;
  message?: string;
  status: CorporateInquiryStatus;
  createdAt: string;
}

export interface FlightLog {
  id: string;
  pilotEmail: string;
  flightDate: string;
  aircraftType: string;
  flightTimeHours: number;
  departureIcao: string;
  arrivalIcao: string;
  landingsCount: number;
  approachType: 'CAT_III_ILS' | 'RNP_AR' | 'VISUAL' | 'RNAV';
  weatherScenario: string;
  instructorSignature: string;
  notes: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'user' | 'admin';
  totalHours: number;
  totalFlights: number;
  pilotLicense?: string;
  createdAt: string;
}
