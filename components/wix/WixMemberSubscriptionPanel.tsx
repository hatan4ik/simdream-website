'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, LogIn, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import type { Language, LocalizedRecord } from '@/lib/i18n/translations';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth/auth-context';
import { getWixMemberClient, isWixBrowserClientConfigured } from '@/lib/wix/member-client';
import { wixSubscriptionBookingPackageForPlan, type WixSubscriptionBookingPackageId } from '@/lib/wix/subscription-redemption';

interface MemberCopy {
  eyebrow: string;
  title: string;
  signedOut: string;
  signedIn: string;
  signIn: string;
  signOut: string;
  loading: string;
  noActive: string;
  active: string;
  redeem: string;
  signInFailed: string;
}

const COPY: LocalizedRecord<MemberCopy> = {
  en: {
    eyebrow: 'WIX MEMBERS',
    title: 'Your flight track deck',
    signedOut: 'Sign in or create a Wix member account before buying a flight track or booking one of its flights.',
    signedIn: 'Your active SimDream flight tracks are shown below. Membership is required to buy a track and to book its flights.',
    signIn: 'Sign in or create account',
    signOut: 'Sign out',
    loading: 'Loading your flight tracks…',
    noActive: 'No active flight tracks yet.',
    active: 'Active',
    redeem: 'Book an included flight',
    signInFailed: 'We could not open Wix member sign-in. Please try again.',
  },
  he: {
    eyebrow: 'חברי WIX',
    title: 'לוח הטיסות של המסלול שלכם',
    signedOut: 'יש להתחבר או ליצור חשבון חבר Wix לפני רכישת מסלול טיסה או תיאום טיסה הכלולה בו.',
    signedIn: 'מסלולי הטיסה הפעילים שלכם ב־SimDream מופיעים למטה. נדרשת חברות לרכישת מסלול ולתיאום הטיסות שבו.',
    signIn: 'התחברות או יצירת חשבון',
    signOut: 'התנתקות',
    loading: 'טוענים את מסלולי הטיסה שלכם…',
    noActive: 'עדיין אין מסלולי טיסה פעילים.',
    active: 'פעיל',
    redeem: 'תיאום טיסה הכלולה במסלול',
    signInFailed: 'לא ניתן היה לפתוח את התחברות חברי Wix. נסו שוב.',
  },
  ru: {
    eyebrow: 'УЧАСТНИКИ WIX',
    title: 'Ваш кабинет лётной программы',
    signedOut: 'Войдите или создайте аккаунт Wix перед покупкой лётной программы или бронированием её полётов.',
    signedIn: 'Ниже показаны ваши активные лётные программы SimDream. Учётная запись нужна для покупки программы и бронирования её полётов.',
    signIn: 'Войти или создать аккаунт',
    signOut: 'Выйти',
    loading: 'Загружаем ваши лётные программы…',
    noActive: 'Активных лётных программ пока нет.',
    active: 'Активна',
    redeem: 'Забронировать включённый полёт',
    signInFailed: 'Не удалось открыть вход Wix. Попробуйте ещё раз.',
  },
  fr: {
    eyebrow: 'MEMBRES WIX',
    title: 'Votre espace parcours de vol',
    signedOut: 'Connectez-vous ou créez un compte membre Wix avant d’acheter un parcours de vol ou de réserver l’un de ses vols.',
    signedIn: 'Vos parcours de vol SimDream actifs sont affichés ci-dessous. Un compte membre est requis pour acheter un parcours et réserver ses vols.',
    signIn: 'Se connecter ou créer un compte',
    signOut: 'Se déconnecter',
    loading: 'Chargement de vos parcours de vol…',
    noActive: 'Aucun parcours de vol actif pour le moment.',
    active: 'Actif',
    redeem: 'Réserver un vol inclus',
    signInFailed: 'Impossible d’ouvrir la connexion Wix. Veuillez réessayer.',
  },
  ar: {
    eyebrow: 'أعضاء WIX',
    title: 'لوحة مسار الطيران الخاصة بكم',
    signedOut: 'سجّلوا الدخول أو أنشئوا حساب عضو Wix قبل شراء مسار طيران أو حجز إحدى رحلاته.',
    signedIn: 'تظهر مسارات طيران SimDream النشطة أدناه. العضوية مطلوبة لشراء المسار وحجز رحلاته.',
    signIn: 'تسجيل الدخول أو إنشاء حساب',
    signOut: 'تسجيل الخروج',
    loading: 'جارٍ تحميل مسارات الطيران الخاصة بكم…',
    noActive: 'لا توجد مسارات طيران نشطة بعد.',
    active: 'نشط',
    redeem: 'حجز رحلة مشمولة',
    signInFailed: 'تعذر فتح تسجيل دخول Wix. يرجى المحاولة مرة أخرى.',
  },
};

interface SubscriptionOrder {
  id: string;
  name: string;
  bookingPackageId: WixSubscriptionBookingPackageId | null;
}

interface WixMemberSubscriptionPanelProps {
  language: Language;
}

function isActiveOrder(status: string): boolean {
  return status === 'ACTIVE';
}

export function WixMemberSubscriptionPanel({ language }: WixMemberSubscriptionPanelProps) {
  const copy = COPY[language] ?? COPY.en;
  const { user, isLoading: authLoading, logout, startWixMemberSignIn } = useAuth();
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wixMemberEnabled = isWixBrowserClientConfigured();
  const signedIn = wixMemberEnabled && Boolean(user);
  const loading = authLoading || loadingOrders;

  const loadOrders = useCallback(async () => {
    if (!signedIn) {
      setOrders([]);
      return;
    }
    setLoadingOrders(true);
    setError(null);
    try {
      const client = getWixMemberClient();
      const ordersResult = await client.orders.memberListOrders({ limit: 50 });
      setOrders(
        (ordersResult.orders ?? [])
          .filter((order) => isActiveOrder(order.status ?? ''))
          .map((order) => ({
            id: order._id ?? order.planId ?? order.planName ?? 'subscription',
            name: order.planName ?? 'SimDream subscription',
            bookingPackageId: order.planId ? wixSubscriptionBookingPackageForPlan(order.planId) : null,
          }))
      );
    } catch {
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [signedIn]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const signIn = async () => {
    setError(null);
    try {
      await startWixMemberSignIn(`${window.location.pathname}${window.location.search}${window.location.hash}`);
    } catch {
      setError(copy.signInFailed);
    }
  };

  const memberName = user?.fullName || null;

  return (
    <section className="rounded-3xl border border-sky-500/25 bg-sky-500/5 p-5 sm:p-6" aria-live="polite">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-sky-300">
            <ShieldCheck className="h-4 w-4" />
            <span>{copy.eyebrow}</span>
          </div>
          <h2 className="text-xl font-semibold text-white">{copy.title}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
            {signedIn ? copy.signedIn : copy.signedOut}
          </p>
        </div>

        {loading ? null : signedIn ? (
          <Button variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4" />
            <span>{copy.signOut}</span>
          </Button>
        ) : (
          <Button variant="primary" onClick={() => void signIn()}>
            <LogIn className="h-4 w-4" />
            <span>{copy.signIn}</span>
          </Button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      {loading ? (
        <p className="mt-5 text-sm text-slate-400">{copy.loading}</p>
      ) : signedIn ? (
        <div className="mt-5 space-y-2">
          {memberName && (
            <p className="flex items-center gap-2 text-sm text-slate-200">
              <UserRound className="h-4 w-4 text-sky-400" />
              <span>{memberName}</span>
            </p>
          )}
          {orders.length ? (
            <ul className="space-y-2">
              {orders.map((order) => (
                <li key={order.id} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="min-w-0 flex-1 truncate">{order.name}</span>
                  <span className="text-xs text-emerald-300">{copy.active}</span>
                  {order.bookingPackageId && (
                    <Link
                      href={`/book?package=${order.bookingPackageId === 'pkg-captain-60' ? 'captains-command-60' : 'ultimate-aviator-90'}&subscription=wix`}
                      className="shrink-0 text-xs font-semibold text-sky-300 hover:text-sky-200 hover:underline"
                    >
                      {copy.redeem}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">{copy.noActive}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
