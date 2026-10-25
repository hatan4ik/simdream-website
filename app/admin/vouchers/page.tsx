'use client';

import React, { useState, useEffect } from 'react';
import { Gift, Search, CheckCircle2, AlertCircle, RefreshCw, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { GiftVoucher } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<GiftVoucher[]>([]);
  const [searchCode, setSearchCode] = useState<string>('');
  const [verifiedVoucher, setVerifiedVoucher] = useState<GiftVoucher | null>(null);
  const [deductAmount, setDeductAmount] = useState<string>('');
  const [lookupError, setLookupError] = useState<string>('');
  const [redeemSuccess, setRedeemSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vouchers');
      if (res.ok) {
        const data = await res.json();
        setVouchers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const handleLookup = async (codeToSearch?: string) => {
    const code = (codeToSearch || searchCode).trim();
    if (!code) return;

    setLookupError('');
    setRedeemSuccess('');
    try {
      // The authenticated inventory response already contains full counter
      // details; avoid placing a bearer voucher code in a URL or another call.
      const voucher = vouchers.find((item) => item.code.toUpperCase() === code.toUpperCase());
      if (!voucher) throw new Error('Voucher not found. Refresh the inventory and try again.');
      setVerifiedVoucher(voucher);
      setDeductAmount(String(voucher.currentBalanceIls));
    } catch (err: unknown) {
      setVerifiedVoucher(null);
      setLookupError(err instanceof Error ? err.message : 'Voucher not found.');
    }
  };

  const handleRedeem = async () => {
    if (!verifiedVoucher || !deductAmount) return;

    const amountNum = parseFloat(deductAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount to deduct.');
      return;
    }

    try {
      const res = await fetch('/api/vouchers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: verifiedVoucher.code,
          amount: amountNum,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to redeem voucher');

      setRedeemSuccess(result.message);
      setVerifiedVoucher((prev) =>
        prev
          ? {
              ...prev,
              currentBalanceIls: result.newBalance,
              isRedeemed: result.newBalance === 0,
            }
          : null
      );
      fetchVouchers();
    } catch (err: any) {
      alert(err.message || 'Redemption failed');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Voucher Redemption Terminal</h1>
          <p className="text-xs text-slate-400 font-mono">
            Validate, inspect, and deduct walk-in gift vouchers at the front flight operations counter
          </p>
        </div>

        <button
          onClick={fetchVouchers}
          className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Vouchers</span>
        </button>
      </div>

      {/* Terminal Lookup Form */}
      <Card className="p-6 space-y-6 max-w-2xl border-purple-500/30 bg-slate-900/90 shadow-2xl">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-white">Counter Scanner & Validator</h2>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Scan or enter the full voucher code"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-purple-500"
          />
          <Button onClick={() => handleLookup()} className="bg-purple-600 hover:bg-purple-500 font-bold">
            <Search className="w-4 h-4" />
            <span>Verify</span>
          </Button>
        </div>

        {lookupError && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{lookupError}</span>
          </div>
        )}

        {redeemSuccess && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{redeemSuccess}</span>
          </div>
        )}

        {/* Verified Voucher Card */}
        {verifiedVoucher && (
          <div className="p-5 rounded-xl border border-purple-500/40 bg-slate-950/80 space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-purple-400 font-bold text-sm">{verifiedVoucher.code}</span>
              <Badge variant={verifiedVoucher.isRedeemed ? 'red' : 'emerald'}>
                {verifiedVoucher.isRedeemed ? 'Fully Redeemed' : 'Valid & Active'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500 text-[10px] uppercase">PASSENGER NAME</span>
                <p className="text-white font-bold">{verifiedVoucher.recipientName}</p>
                <p className="text-slate-400 text-[11px]">{verifiedVoucher.recipientEmail}</p>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] uppercase">GIFTED BY</span>
                <p className="text-white font-bold">{verifiedVoucher.senderName}</p>
                <p className="text-slate-400 text-[11px]">{verifiedVoucher.senderEmail}</p>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] uppercase">REMAINING BALANCE</span>
                <p className="text-emerald-400 font-bold text-base">
                  {formatCurrency(verifiedVoucher.currentBalanceIls)}
                </p>
                <span className="text-[10px] text-slate-500">
                  Initial: {formatCurrency(verifiedVoucher.initialValueIls)}
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] uppercase">EXPIRY DATE</span>
                <p className="text-white font-bold">{formatDate(verifiedVoucher.expiryDate)}</p>
              </div>
            </div>

            {verifiedVoucher.personalMessage && (
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 italic text-slate-300 text-[11px]">
                &ldquo;{verifiedVoucher.personalMessage}&rdquo;
              </div>
            )}

            {/* Counter Deduction Controls */}
            {!verifiedVoucher.isRedeemed && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-slate-400 text-[10px] uppercase font-bold">
                  Deduct from Voucher Balance:
                </span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={deductAmount}
                    onChange={(e) => setDeductAmount(e.target.value)}
                    max={verifiedVoucher.currentBalanceIls}
                    className="flex-1 rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white font-mono"
                  />
                  <Button
                    onClick={handleRedeem}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    Deduct & Redeem
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* All System Vouchers Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">All Issued Gift Vouchers</h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">CODE</th>
                  <th className="py-3 px-4">RECIPIENT</th>
                  <th className="py-3 px-4">PURCHASED BY</th>
                  <th className="py-3 px-4">INITIAL VALUE</th>
                  <th className="py-3 px-4">BALANCE</th>
                  <th className="py-3 px-4">EXPIRES</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-purple-400">{v.code}</td>
                    <td className="py-3.5 px-4 font-bold text-white">{v.recipientName}</td>
                    <td className="py-3.5 px-4 text-slate-400">{v.senderName}</td>
                    <td className="py-3.5 px-4">{formatCurrency(v.initialValueIls)}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-400">
                      {formatCurrency(v.currentBalanceIls)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{formatDate(v.expiryDate)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSearchCode(v.code);
                          handleLookup(v.code);
                        }}
                        className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors text-[10px]"
                      >
                        Inspect
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
