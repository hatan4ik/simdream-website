'use client';

import React, { useState, useEffect } from 'react';
import { Users, Building2, Mail, Phone, Calendar, CheckCircle2, MessageSquare, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CorporateInquiry, CorporateInquiryStatus } from '@/types';
import { formatDate } from '@/lib/utils';

export default function AdminWorkshopsPage() {
  const [inquiries, setInquiries] = useState<CorporateInquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workshops');
      if (res.ok) {
        const data = await res.json();
        setInquiries(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleStatusChange = async (id: string, newStatus: CorporateInquiryStatus) => {
    try {
      const res = await fetch('/api/workshops', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        setInquiries((prev) =>
          prev.map((inq) => (inq.id === id ? { ...inq, status: newStatus } : inq))
        );
      }
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Corporate CRM Workshop Pipeline</h1>
          <p className="text-xs text-slate-400 font-mono">
            Track executive team inquiries, leadership offsites, and simulation proposals
          </p>
        </div>

        <button
          onClick={fetchInquiries}
          className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Leads</span>
        </button>
      </div>

      <div className="space-y-4">
        {inquiries.length === 0 ? (
          <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/40 text-center text-slate-400 text-xs">
            No corporate inquiries received yet.
          </div>
        ) : (
          inquiries.map((lead) => (
            <div
              key={lead.id}
              className="p-6 rounded-xl border border-slate-800 bg-slate-900/70 space-y-4 font-mono text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{lead.companyName}</h3>
                    <p className="text-[11px] text-slate-400">
                      Contact: {lead.contactName} &bull; Received: {formatDate(lead.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[10px]">STATUS:</span>
                  <Badge
                    variant={
                      lead.status === 'confirmed'
                        ? 'emerald'
                        : lead.status === 'quoted'
                        ? 'sky'
                        : lead.status === 'contacted'
                        ? 'amber'
                        : 'slate'
                    }
                  >
                    {lead.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">COMMUNICATION</span>
                  <p className="text-white mt-0.5">{lead.email}</p>
                  <p className="text-slate-400">{lead.phone}</p>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">TEAM PROFILE</span>
                  <p className="text-white mt-0.5">{lead.teamSize} Participants</p>
                  <p className="text-slate-400">
                    Target: {lead.targetDate ? formatDate(lead.targetDate) : 'Flexible'}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">PRIMARY GOAL</span>
                  <p className="text-sky-300 mt-0.5 font-bold uppercase">{lead.primaryGoal.replace(/_/g, ' ')}</p>
                </div>
              </div>

              {lead.message && (
                <div className="p-3 rounded bg-slate-950 border border-slate-800/80 text-slate-400 text-[11px] italic">
                  &ldquo;{lead.message}&rdquo;
                </div>
              )}

              {/* Status Updater Actions */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
                <span className="text-slate-500 text-[10px]">Update Pipeline State:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(['new', 'contacted', 'quoted', 'confirmed'] as CorporateInquiryStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(lead.id, st)}
                      className={`px-2.5 py-1 rounded uppercase tracking-wider text-[10px] transition-colors ${
                        lead.status === st
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

