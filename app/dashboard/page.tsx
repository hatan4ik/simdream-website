'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  Calendar,
  Clock,
  Plane,
  CheckCircle2,
  FileText,
  Download,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth/auth-context';
import { Booking, FlightLog } from '@/types';
import { DEMO_FLIGHT_LOGS } from '@/lib/db/seed-data';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [logs, setLogs] = useState<FlightLog[]>(DEMO_FLIGHT_LOGS);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUserData() {
      try {
        const res = await fetch(`/api/bookings?email=${encodeURIComponent(user?.email || 'pilot@simdream.co.il')}`);
        if (res.ok) {
          const data = await res.json();
          setBookings(data);
        }
      } catch (err) {
        console.error('Failed to load user bookings', err);
      } finally {
        setLoading(false);
      }
    }
    loadUserData();
  }, [user]);

  const upcomingBookings = bookings.filter((b) => b.status === 'confirmed');

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-sky-400 uppercase font-semibold">
            BEN GURION (LLBG) &bull; BOEING 737 MAX LOGBOOK
          </span>
          <h1 className="text-2xl font-black text-white mt-1">
            Welcome Back, {user?.fullName || 'Captain'}
          </h1>
          <p className="text-xs text-slate-400">
            Current Flight Hours: <strong className="text-white">2.5 Hours</strong> &bull; License Tier: <span className="text-sky-400">Enthusiast Aviator</span>
          </p>
        </div>

        <Link href="/book">
          <Button size="sm" className="font-bold whitespace-nowrap">
            <Plane className="w-4 h-4 -rotate-45" />
            <span>Book Next Mission</span>
          </Button>
        </Link>
      </div>

      {/* Flight Hours Odometer Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Simulator Hours</span>
          <p className="text-2xl font-black text-sky-400 font-mono">2.5 hrs</p>
          <p className="text-[10px] text-slate-500">Dual-control flight time</p>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Missions Flown</span>
          <p className="text-2xl font-black text-white font-mono">2</p>
          <p className="text-[10px] text-slate-500">100% Completed flights</p>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Landings</span>
          <p className="text-2xl font-black text-emerald-400 font-mono">3</p>
          <p className="text-[10px] text-slate-500">2 Visual, 1 CAT III ILS</p>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Hub Base</span>
          <p className="text-2xl font-black text-amber-400 font-mono">LLBG</p>
          <p className="text-[10px] text-slate-500">Tel Aviv Ben Gurion</p>
        </Card>
      </div>

      {/* Upcoming Reserved Flights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-400" />
            <span>Upcoming Flight Deck Reservations</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            {upcomingBookings.length} Active {upcomingBookings.length === 1 ? 'Flight' : 'Flights'}
          </span>
        </div>

        {upcomingBookings.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <p className="text-slate-400 text-sm">You have no upcoming flight simulator reservations.</p>
            <Link href="/book">
              <Button size="sm">Book a Cockpit Slot</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingBookings.map((b) => (
              <div
                key={b.id}
                className="p-5 rounded-xl border border-sky-500/30 bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="sky">CONFIRMED CLEARANCE</Badge>
                    <span className="text-xs font-mono text-sky-400 font-bold">{b.bookingReference}</span>
                  </div>
                  <h3 className="text-base font-bold text-white">{b.packageTitle}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>Date: {formatDate(b.bookingDate)}</span>
                    <span>&bull;</span>
                    <span>Slot: {b.startTime} - {b.endTime} IST</span>
                    <span>&bull;</span>
                    <span>Duration: {b.durationMinutes} min</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/book/success?ref=${b.bookingReference}`}>
                    <Button variant="secondary" size="sm">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Boarding Pass</span>
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verified Flight Hours Logbook Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" />
            <span>Pilot Flight Logbook Entries</span>
          </h2>
          <Badge variant="emerald">AUTHENTIC AIRLINER LOGS</Badge>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">DATE</th>
                  <th className="py-3 px-4">AIRCRAFT</th>
                  <th className="py-3 px-4">ROUTE</th>
                  <th className="py-3 px-4">TIME</th>
                  <th className="py-3 px-4">APPROACH</th>
                  <th className="py-3 px-4">INSTRUCTOR SIGNOFF</th>
                  <th className="py-3 px-4">CERTIFICATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">{log.flightDate}</td>
                    <td className="py-3.5 px-4 text-sky-400 font-bold">{log.aircraftType}</td>
                    <td className="py-3.5 px-4">
                      {log.departureIcao} &rarr; {log.arrivalIcao}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">{log.flightTimeHours} hrs</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {log.approachType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 italic">{log.instructorSignature}</td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => alert(`Certificate verified for mission: ${log.departureIcao} to ${log.arrivalIcao} (${log.aircraftType}) on ${log.flightDate}. Signed by: ${log.instructorSignature}`)}
                        className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

