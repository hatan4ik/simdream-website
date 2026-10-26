'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Phone,
  Mail,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Booking, BookingStatus } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: BookingStatus) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
        );
      }
    } catch (err) {
      alert('Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = bookings.filter((b) => {
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    const matchesSearch =
      b.bookingReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.pilotName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.pilotEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Flight Manifest & Bookings</h1>
          <p className="text-xs text-slate-400 font-mono">
            Manage commercial simulator reservations, passenger manifests, and clearances
          </p>
        </div>

        <button
          onClick={fetchBookings}
          className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by reference, pilot name, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-800 px-9 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-stretch sm:self-auto text-xs font-mono">
          {['all', 'confirmed', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors ${
                filterStatus === status
                  ? 'bg-sky-700 text-white font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">CLEARANCE REF</th>
                <th className="py-3 px-4">PILOT IN COMMAND</th>
                <th className="py-3 px-4">MISSION / PACKAGE</th>
                <th className="py-3 px-4">FLIGHT DATE & SLOT</th>
                <th className="py-3 px-4">PAID</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right">DISPATCH ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-4 font-bold text-sky-400">{b.bookingReference}</td>
                  <td className="py-4 px-4">
                    <p className="font-bold text-white">{b.pilotName}</p>
                    <p className="text-[10px] text-slate-400">{b.pilotEmail}</p>
                    <p className="text-[10px] text-slate-400">{b.pilotPhone}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-semibold text-white">{b.packageTitle}</p>
                    <span className="text-[10px] text-slate-400">{b.durationMinutes} min</span>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-white font-semibold">{formatDate(b.bookingDate)}</p>
                    <p className="text-sky-300">{b.startTime} - {b.endTime}</p>
                  </td>
                  <td className="py-4 px-4 font-bold text-emerald-400">
                    {formatCurrency(b.totalIls)}
                  </td>
                  <td className="py-4 px-4">
                    <Badge
                      variant={
                        b.status === 'confirmed'
                          ? 'sky'
                          : b.status === 'completed'
                          ? 'emerald'
                          : 'red'
                      }
                    >
                      {b.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {b.status === 'confirmed' && (
                        <button
                          disabled={updatingId === b.id}
                          onClick={() => handleUpdateStatus(b.id, 'completed')}
                          title="Mark Flight Completed"
                          className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors text-[10px]"
                        >
                          Mark Completed
                        </button>
                      )}
                      {b.status !== 'cancelled' && (
                        <button
                          disabled={updatingId === b.id}
                          onClick={() => handleUpdateStatus(b.id, 'cancelled')}
                          title="Cancel Reservation"
                          className="px-2.5 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors text-[10px]"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

