'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Radio,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  Settings,
  RefreshCw,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Booking, CorporateInquiry, DailyEfficiencyReport } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

function parseMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

export default function AdminOverviewPage() {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [inquiries, setInquiries] = useState<CorporateInquiry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(tomorrow);
  const [efficiency, setEfficiency] = useState<DailyEfficiencyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

  const loadData = async (targetDate = selectedDate) => {
    setLoading(true);
    try {
      const [bookingsRes, inquiriesRes, slotsRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/workshops'),
        fetch(`/api/slots?date=${targetDate}&duration=60&includeEfficiency=true`),
      ]);

      if (bookingsRes.ok) {
        const bData = await bookingsRes.json();
        setBookings(bData);
      }
      if (inquiriesRes.ok) {
        const iData = await inquiriesRes.json();
        setInquiries(iData);
      }
      if (slotsRes.ok) {
        const sData = await slotsRes.json();
        if (sData?.efficiency) {
          setEfficiency(sData.efficiency);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  // Handle shifting a booking time in Admin (to test or resolve Gap Collisions)
  const handleShiftBookingTime = async (bookingId: string, newStartTime: string) => {
    setReschedulingId(bookingId);
    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bookingId, startTime: newStartTime }),
      });
      if (res.ok) {
        await loadData(selectedDate);
      }
    } catch (err) {
      console.error('Failed to reschedule booking', err);
    } finally {
      setReschedulingId(null);
    }
  };

  const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalIls || 0), 0);
  const activeBookingsCount = bookings.filter((b) => b.status === 'confirmed').length;
  const newLeadsCount = inquiries.filter((i) => i.status === 'new').length;
  const dateBookings = bookings.filter(
    (b) => b.bookingDate === selectedDate && b.status !== 'cancelled'
  );

  return (
    <div className="space-y-8">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs font-mono">
            <span>TOTAL REVENUE</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="text-[10px] text-slate-500 font-mono">Across all missions & vouchers</p>
        </Card>

        <Card className="space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs font-mono">
            <span>ACTIVE BOOKINGS</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-sky-400 font-mono">{activeBookingsCount}</p>
          <p className="text-[10px] text-slate-500 font-mono">Scheduled & confirmed flights</p>
        </Card>

        <Card className="space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs font-mono">
            <span>LP TARGET YIELD</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 font-mono">
            {efficiency ? formatCurrency(efficiency.projectedMaxRevenueIls) : '₪7,320'}
          </p>
          <p className="text-[10px] text-slate-500 font-mono">
            Kantorovich Daily Max ({efficiency?.totalFundMinutes || 780}m fund)
          </p>
        </Card>

        <Card className="space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs font-mono">
            <span>NEW CRM LEADS</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400 font-mono">{newLeadsCount}</p>
          <p className="text-[10px] text-slate-500 font-mono">Pending corporate quotes</p>
        </Card>
      </div>

      {/* KANTOROVICH DAILY EFFICIENCY BAR & GAP COLLISION MONITOR */}
      {efficiency && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-5 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="sky">KANTOROVICH EFFICIENCY BAR</Badge>
                <span className="text-xs font-mono text-slate-400">
                  {efficiency.operatingWindow}
                </span>
              </div>
              <h2 className="text-lg font-black text-white font-mono">
                Занято: {efficiency.bookedMinutes} / {efficiency.totalFundMinutes} мин (КПД фонда:{' '}
                {efficiency.efficiencyPercent}%) | Потери («хвосты»):{' '}
                <span
                  className={
                    efficiency.orphanGapMinutes > 0 ? 'text-red-400' : 'text-emerald-400'
                  }
                >
                  {efficiency.orphanGapMinutes} мин
                </span>{' '}
                | Выручка дня: {formatCurrency(efficiency.actualRevenueIls)} (Прогноз LP:{' '}
                {formatCurrency(efficiency.projectedMaxRevenueIls)})
              </h2>
            </div>

            <div className="flex items-center gap-3 self-start">
              <label className="text-xs font-mono text-slate-400">Dispatch Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* 24H Visual Block Ribbon */}
          {(() => {
            const parts = efficiency.operatingWindow.split('–').map((s) => s.trim());
            const openTimeStr = parts[0] || '10:00';
            const closeTimeStr = parts[1] || '23:00';
            const openMin = parseMinutes(openTimeStr);
            const closeMin = parseMinutes(closeTimeStr);
            const span = Math.max(1, closeMin - openMin);
            return (
              <div className="space-y-2" dir="ltr">
                <div className="relative h-11 w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                  {efficiency.timelineBlocks.map((block, idx) => {
                    const sM = parseMinutes(block.start);
                    const eM = parseMinutes(block.end);
                    const leftPct = Math.max(0, ((sM - openMin) / span) * 100);
                    const widthPct = Math.min(100 - leftPct, ((eM - sM) / span) * 100);

                    if (block.type === 'free_valid') {
                      return (
                        <div
                          key={`open-${idx}`}
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          className="absolute top-0 bottom-0 flex items-center justify-center text-[9px] font-mono text-slate-600 border-r border-slate-900"
                          title={block.label}
                        >
                          {block.minutes >= 75 ? `${block.minutes}m open` : ''}
                        </div>
                      );
                    }

                    const style =
                      block.type === 'booked'
                        ? 'bg-sky-500/70 border-r border-sky-300 text-slate-950 font-black'
                        : block.type === 'turnaround'
                        ? 'bg-amber-500/60 border-r border-amber-300 text-slate-950 font-bold'
                        : 'bg-red-500/80 border-2 border-red-300 text-white font-black animate-pulse';

                    return (
                      <div
                        key={`blk-${idx}`}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        title={`${block.label} (${block.start}–${block.end})`}
                        className={`absolute top-0 bottom-0 flex items-center justify-center text-[10px] font-mono overflow-hidden px-1 ${style}`}
                      >
                        {block.minutes >= 30 ? `${block.start}–${block.end}` : '+15m'}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>{openTimeStr} (Open)</span>
                  <span>T_reserved = T_play + 15m Turnaround Buffer</span>
                  <span>{closeTimeStr} (Close)</span>
                </div>
              </div>
            );
          })()}

          {/* RED GAP COLLISION ALERTS (Section 4 of devux_devui.md) */}
          {efficiency.gapAlerts.length > 0 ? (
            <div className="space-y-3">
              {efficiency.gapAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-xl bg-red-950/50 border-2 border-red-500/60 text-red-200 space-y-2 shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black uppercase text-red-300">
                            GAP COLLISION DETECTED ({alert.gapStart}–{alert.gapEnd} |{' '}
                            {alert.gapMinutes}m dead tail | -₪{alert.lostRevenueIls})
                          </span>
                        </div>
                        <p className="text-xs font-mono text-white">
                          Внимание: перенос этого слота создаст непродаваемое окно в{' '}
                          {alert.gapMinutes} минут ({alert.gapStart}–{alert.gapEnd}). Рекомендуемое
                          время: {alert.recommendedShiftTime}.
                        </p>
                        <p className="text-[11px] font-mono text-red-300/90">{alert.message}</p>
                      </div>
                    </div>

                    {alert.violatingBookingId && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          handleShiftBookingTime(
                            alert.violatingBookingId!,
                            alert.recommendedShiftTime
                          )
                        }
                        className="shrink-0 font-mono text-xs"
                      >
                        <span>Auto-Snap to {alert.recommendedShiftTime}</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Zero-Waste Rule Active: 0 wasted tail minutes («хвосты»: 0 мин). All open intervals
                are 100% tileable by standard tariffs.
              </span>
              <span className="text-[11px] text-emerald-400 font-bold">Z → max</span>
            </div>
          )}
        </div>
      )}

      {/* Simulator 1 Subsystem Health Ribbon */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white">SIMULATOR 1 (B737-MAX8) TELEMETRY:</span>
          </div>

          <div className="flex flex-wrap gap-4 text-slate-400">
            <span className="flex items-center gap-1">
              <span className="text-emerald-400">✓</span> 220° 4K Projectors (Online)
            </span>
            <span className="flex items-center gap-1">
              <span className="text-emerald-400">✓</span> Control Loading Servos (Calibrated)
            </span>
            <span className="flex items-center gap-1">
              <span className="text-emerald-400">✓</span> Avionics Core Server (v3.28 Active)
            </span>
            <span className="flex items-center gap-1">
              <span className="text-emerald-400">✓</span> AIRAC Cycle: 2609 (Current)
            </span>
          </div>
        </div>
      </div>

      {/* Dispatch Schedule & Recent Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Dispatch Manifest & Interactive Slot Rescheduler */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg font-bold text-white">
                Flight Dispatch Manifest & Gap Collision Tester ({formatDate(selectedDate)})
              </h2>
            </div>
            <button
              onClick={() => loadData(selectedDate)}
              className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            {dateBookings.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-mono">
                No flights booked on {formatDate(selectedDate)} yet. Full{' '}
                {efficiency?.totalFundMinutes}m time fund open.
              </div>
            ) : (
              <div className="divide-y divide-slate-800 text-xs">
                {dateBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 hover:bg-slate-800/30 transition-colors flex flex-col gap-3 font-mono"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sky-400 font-bold">{booking.bookingReference}</span>
                          <Badge
                            variant={
                              booking.status === 'confirmed'
                                ? 'sky'
                                : booking.status === 'completed'
                                ? 'emerald'
                                : 'amber'
                            }
                          >
                            {booking.status}
                          </Badge>
                          <span className="text-[11px] text-slate-400">
                            ({booking.durationMinutes}m flight + 15m pause ={' '}
                            {booking.durationMinutes + 15}m block)
                          </span>
                        </div>
                        <p className="text-white font-bold">{booking.packageTitle}</p>
                        <p className="text-slate-400">
                          Pilot: <strong className="text-slate-200">{booking.pilotName}</strong> (
                          {booking.pilotPhone})
                        </p>
                      </div>

                      <div className="text-left sm:text-right space-y-1">
                        <p className="text-sky-300 font-bold" dir="ltr">
                          {booking.startTime} – {booking.endTime} (+15m tech reset)
                        </p>
                        <p className="text-slate-400">{formatDate(booking.bookingDate)}</p>
                        <p className="text-emerald-400 font-bold">
                          {formatCurrency(booking.totalIls)}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Admin Slot Mover (Demonstrates Section 4 Gap Collision Warning & Auto-Snap) */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-sky-400" />
                        Admin Manual Slot Shift (Test Gap Collision / Auto-Snap):
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {booking.durationMinutes === 30 ? (
                          <>
                            <button
                              type="button"
                              disabled={reschedulingId === booking.id}
                              onClick={() => handleShiftBookingTime(booking.id, '18:00')}
                              className={`px-2.5 py-1 rounded text-[11px] border transition-all ${
                                booking.startTime === '18:00'
                                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 font-bold'
                                  : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-emerald-400'
                              }`}
                            >
                              18:00 (Optimal 150m Pair)
                            </button>
                            <button
                              type="button"
                              disabled={reschedulingId === booking.id}
                              onClick={() => handleShiftBookingTime(booking.id, '19:00')}
                              className={`px-2.5 py-1 rounded text-[11px] border transition-all ${
                                booking.startTime === '19:00'
                                  ? 'border-red-400 bg-red-500/20 text-red-300 font-bold'
                                  : 'border-slate-700 bg-slate-950 text-amber-300 hover:border-red-400'
                              }`}
                            >
                              19:00 (Simulate 60m Evening Gap)
                            </button>
                            <button
                              type="button"
                              disabled={reschedulingId === booking.id}
                              onClick={() => handleShiftBookingTime(booking.id, '19:15')}
                              className={`px-2.5 py-1 rounded text-[11px] border transition-all ${
                                booking.startTime === '19:15'
                                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 font-bold'
                                  : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-emerald-400'
                              }`}
                            >
                              19:15 (Optimal Snap)
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={reschedulingId === booking.id}
                              onClick={() => handleShiftBookingTime(booking.id, '10:00')}
                              className={`px-2.5 py-1 rounded text-[11px] border transition-all ${
                                booking.startTime === '10:00'
                                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 font-bold'
                                  : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-emerald-400'
                              }`}
                            >
                              10:00 (Optimal Base)
                            </button>
                            <button
                              type="button"
                              disabled={reschedulingId === booking.id}
                              onClick={() => handleShiftBookingTime(booking.id, '10:30')}
                              className={`px-2.5 py-1 rounded text-[11px] border transition-all ${
                                booking.startTime === '10:30'
                                  ? 'border-red-400 bg-red-500/20 text-red-300 font-bold'
                                  : 'border-slate-700 bg-slate-950 text-amber-300 hover:border-red-400'
                              }`}
                            >
                              10:30 (Simulate 30m Orphan Gap)
                            </button>
                            <button
                              type="button"
                              disabled={reschedulingId === booking.id}
                              onClick={() => handleShiftBookingTime(booking.id, '11:15')}
                              className={`px-2.5 py-1 rounded text-[11px] border transition-all ${
                                booking.startTime === '11:15'
                                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 font-bold'
                                  : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-emerald-400'
                              }`}
                            >
                              11:15 (Optimal Step)
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Operational Controls */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <span>Operational Controls</span>
          </h2>

          <Card className="space-y-4 text-xs font-mono">
            <div className="space-y-2">
              <span className="text-slate-400 uppercase">Kantorovich LP Engine Rules:</span>
              <ul className="space-y-1.5 text-[11px] text-slate-400">
                <li>• 30m Flight (45m block): ₪450 (₪10.00/m)</li>
                <li>• 60m Flight (75m block): ₪690 (₪9.20/m)</li>
                <li>• 90m Prime (105m block): ₪950 (₪9.05/m)</li>
                <li>• 45m Promo (60m block): ₪490 (&lt;18:00 only)</li>
                <li>• 150m Substitution: 30m (45m) + 90m (105m) = 150m</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="text-slate-400 uppercase">Emergency Schedule Block:</span>
              <p className="text-[11px] text-slate-500">
                Block simulator availability for scheduled maintenance or avionics calibration.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  alert('Maintenance slot blocked on Simulator 1 for 150 minutes (2 base blocks).')
                }
                className="w-full text-amber-400 border-amber-500/40 hover:bg-amber-950/20"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Block 150m Maintenance Window</span>
              </Button>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <Link href="/admin/bookings">
                <Button size="sm" className="w-full font-bold">
                  <span>Manage All Bookings &rarr;</span>
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
