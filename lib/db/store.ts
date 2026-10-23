import {
  Booking,
  CorporateInquiry,
  DailyEfficiencyReport,
  FlightAddon,
  FlightLog,
  FlightSlot,
  GiftVoucher,
  SimulatorPackage,
  UserProfile,
} from '@/types';
import {
  DEMO_BOOKINGS,
  DEMO_CORPORATE_INQUIRIES,
  DEMO_FLIGHT_LOGS,
  DEMO_USERS,
  DEMO_VOUCHERS,
  FLIGHT_ADDONS,
  SIMULATOR_PACKAGES,
} from './seed-data';
import { isSupabaseConfigured, supabase } from '../supabaseClient';
import { generateBookingReference, generateVoucherCode } from '../utils';
import {
  evaluateDailyEfficiency,
  generateKantorovichSlots,
  minutesToTime,
  timeToMinutes,
} from '../scheduler/kantorovich-engine';

// In-Memory store for development and offline mode
class SimDreamStore {
  private packages: SimulatorPackage[] = [...SIMULATOR_PACKAGES];
  private addons: FlightAddon[] = [...FLIGHT_ADDONS];
  private bookings: Booking[] = [...DEMO_BOOKINGS];
  private vouchers: GiftVoucher[] = [...DEMO_VOUCHERS];
  private inquiries: CorporateInquiry[] = [...DEMO_CORPORATE_INQUIRIES];
  private flightLogs: FlightLog[] = [...DEMO_FLIGHT_LOGS];
  private users: UserProfile[] = [...DEMO_USERS];

  // PACKAGES
  async getPackages(): Promise<SimulatorPackage[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('packages').select('*').eq('is_active', true);
      if (!error && data && data.length > 0) {
        return data as SimulatorPackage[];
      }
    }
    return this.packages;
  }

  async getPackageBySlug(slug: string): Promise<SimulatorPackage | undefined> {
    const packages = await this.getPackages();
    return packages.find((p) => p.slug === slug);
  }

  async getPackageById(id: string): Promise<SimulatorPackage | undefined> {
    const packages = await this.getPackages();
    return packages.find((p) => p.id === id);
  }

  // ADDONS
  getAddons(): FlightAddon[] {
    return this.addons;
  }

  // SLOTS (Kantorovich Linear Programming Smart Grid)
  getAvailableSlots(dateString: string, durationMinutes: number = 60): FlightSlot[] {
    return generateKantorovichSlots(dateString, durationMinutes, this.bookings);
  }

  getDurationAvailability(
    dateString: string
  ): Record<number, { availableCount: number; minPriceIls: number }> {
    const durations = [20, 30, 45, 60, 90, 120];
    const result: Record<number, { availableCount: number; minPriceIls: number }> = {};

    for (const d of durations) {
      const slotsForD = generateKantorovichSlots(dateString, d, this.bookings);
      const openSlots = slotsForD.filter((s) => s.available);
      const minPrice =
        openSlots.length > 0
          ? Math.min(...openSlots.map((s) => s.dynamicPriceIls || s.basePriceIls))
          : 0;
      result[d] = {
        availableCount: openSlots.length,
        minPriceIls: minPrice,
      };
    }

    return result;
  }

  getDailyEfficiencyReport(dateString: string): DailyEfficiencyReport {
    return evaluateDailyEfficiency(dateString, this.bookings);
  }

  // BOOKINGS
  async getBookings(): Promise<Booking[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return data as Booking[];
      }
    }
    return this.bookings;
  }

  async getBookingsByEmail(email: string): Promise<Booking[]> {
    const bookings = await this.getBookings();
    return bookings.filter((b) => b.pilotEmail.toLowerCase() === email.toLowerCase());
  }

  async getBookingByRef(ref: string): Promise<Booking | undefined> {
    const bookings = await this.getBookings();
    return bookings.find((b) => b.bookingReference.toLowerCase() === ref.toLowerCase());
  }

  async createBooking(data: Omit<Booking, 'id' | 'bookingReference' | 'createdAt'>): Promise<Booking> {
    const newBooking: Booking = {
      ...data,
      id: `book-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bookingReference: generateBookingReference(),
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('bookings').insert(newBooking);
    }

    this.bookings.unshift(newBooking);
    return newBooking;
  }

  async updateBookingStatus(id: string, status: Booking['status']): Promise<Booking | undefined> {
    const booking = this.bookings.find((b) => b.id === id);
    if (booking) {
      booking.status = status;
      if (isSupabaseConfigured && supabase) {
        await supabase.from('bookings').update({ status }).eq('id', id);
      }
    }
    return booking;
  }

  async updateBookingTime(id: string, startTime: string): Promise<Booking | undefined> {
    const booking = this.bookings.find((b) => b.id === id);
    if (booking) {
      const startMin = timeToMinutes(startTime);
      const endMin = startMin + (booking.durationMinutes || 60);
      booking.startTime = minutesToTime(startMin);
      booking.endTime = minutesToTime(endMin);
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('bookings')
          .update({ start_time: booking.startTime, end_time: booking.endTime })
          .eq('id', id);
      }
    }
    return booking;
  }

  // VOUCHERS
  async getVouchers(): Promise<GiftVoucher[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('gift_vouchers').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return data as GiftVoucher[];
      }
    }
    return this.vouchers;
  }

  async getVoucherByCode(code: string): Promise<GiftVoucher | undefined> {
    const cleanCode = code.trim().toUpperCase();
    const vouchers = await this.getVouchers();
    return vouchers.find((v) => v.code.toUpperCase() === cleanCode);
  }

  async createVoucher(data: Omit<GiftVoucher, 'id' | 'code' | 'createdAt' | 'isRedeemed'>): Promise<GiftVoucher> {
    const newVoucher: GiftVoucher = {
      ...data,
      id: `vouch-${Date.now()}`,
      code: generateVoucherCode(),
      isRedeemed: false,
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('gift_vouchers').insert(newVoucher);
    }

    this.vouchers.unshift(newVoucher);
    return newVoucher;
  }

  async redeemVoucher(code: string, amountToDeduct: number): Promise<{ success: boolean; newBalance: number; message: string }> {
    const voucher = await this.getVoucherByCode(code);
    if (!voucher) {
      return { success: false, newBalance: 0, message: 'Voucher code not found.' };
    }

    if (new Date(voucher.expiryDate).getTime() < Date.now()) {
      return { success: false, newBalance: 0, message: 'This voucher has expired.' };
    }

    if (voucher.currentBalanceIls <= 0 || voucher.isRedeemed) {
      return { success: false, newBalance: 0, message: 'This voucher has already been fully redeemed.' };
    }

    const actualDeduction = Math.min(voucher.currentBalanceIls, amountToDeduct);
    voucher.currentBalanceIls -= actualDeduction;

    if (voucher.currentBalanceIls === 0) {
      voucher.isRedeemed = true;
    }

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('gift_vouchers')
        .update({
          current_balance_ils: voucher.currentBalanceIls,
          is_redeemed: voucher.isRedeemed,
        })
        .eq('code', voucher.code);
    }

    return {
      success: true,
      newBalance: voucher.currentBalanceIls,
      message: `Successfully applied ₪${actualDeduction} discount. Remaining balance: ₪${voucher.currentBalanceIls}.`,
    };
  }

  // CORPORATE INQUIRIES
  async getCorporateInquiries(): Promise<CorporateInquiry[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('corporate_inquiries').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return data as CorporateInquiry[];
      }
    }
    return this.inquiries;
  }

  async createCorporateInquiry(data: Omit<CorporateInquiry, 'id' | 'createdAt' | 'status'>): Promise<CorporateInquiry> {
    const newInquiry: CorporateInquiry = {
      ...data,
      id: `corp-${Date.now()}`,
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('corporate_inquiries').insert(newInquiry);
    }

    this.inquiries.unshift(newInquiry);
    return newInquiry;
  }

  async updateInquiryStatus(id: string, status: CorporateInquiry['status']): Promise<CorporateInquiry | undefined> {
    const inquiry = this.inquiries.find((i) => i.id === id);
    if (inquiry) {
      inquiry.status = status;
      if (isSupabaseConfigured && supabase) {
        await supabase.from('corporate_inquiries').update({ status }).eq('id', id);
      }
    }
    return inquiry;
  }

  // FLIGHT LOGS
  async getFlightLogs(pilotEmail?: string): Promise<FlightLog[]> {
    if (pilotEmail) {
      return this.flightLogs.filter((l) => l.pilotEmail.toLowerCase() === pilotEmail.toLowerCase());
    }
    return this.flightLogs;
  }

  async addFlightLog(log: Omit<FlightLog, 'id'>): Promise<FlightLog> {
    const newLog: FlightLog = {
      ...log,
      id: `log-${Date.now()}`,
    };
    this.flightLogs.unshift(newLog);
    return newLog;
  }

  // USERS
  async getUser(email: string): Promise<UserProfile | undefined> {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  async getAllUsers(): Promise<UserProfile[]> {
    return this.users;
  }
}

// Global singleton instance (versioned so hot-reload picks up new 35-day seed data immediately across dev & prod)
const globalStore = global as unknown as { __simDreamStoreV9?: SimDreamStore };
export const store = globalStore.__simDreamStoreV9 || new SimDreamStore();
globalStore.__simDreamStoreV9 = store;

