'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, LogIn, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import type { Language } from '@/lib/i18n/translations';
import { Button } from '@/components/ui/Button';
import { clearWixMemberSession, getWixMemberClient, wixMemberOAuthStorageKey } from '@/lib/wix/member-client';
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

const COPY: Record<Language, MemberCopy> = {
  en: {
    eyebrow: 'WIX MEMBERS',
    title: 'Your subscription flight deck',
    signedOut: 'Sign in or create a Wix member account before purchasing or using a flight subscription.',
    signedIn: 'Your active SimDream subscriptions are shown below. Membership is required for subscription checkout and redemption.',
    signIn: 'Sign in or create account',
    signOut: 'Sign out',
    loading: 'Loading member subscriptions…',
    noActive: 'No active Wix subscriptions yet.',
    active: 'Active',
    redeem: 'Book a covered session',
    signInFailed: 'We could not open Wix member sign-in. Please try again.',
  },
  he: {
    eyebrow: 'חברי WIX',
    title: 'לוח הטיסות של המנוי שלכם',
    signedOut: 'יש להתחבר או ליצור חשבון חבר Wix לפני רכישה או מימוש של מנוי טיסה.',
    signedIn: 'המנויים הפעילים שלכם ב־SimDream מופיעים למטה. נדרשת חברות לרכישת מנוי ולמימושו.',
    signIn: 'התחברות או יצירת חשבון',
    signOut: 'התנתקות',
    loading: 'טוענים מנויים של החבר…',
    noActive: 'עדיין אין מנויי Wix פעילים.',
    active: 'פעיל',
    redeem: 'קביעת טיסה הכלולה במנוי',
    signInFailed: 'לא ניתן היה לפתוח את התחברות חברי Wix. נסו שוב.',
  },
  ru: {
    eyebrow: 'УЧАСТНИКИ WIX',
    title: 'Ваш кабинет лётной подписки',
    signedOut: 'Войдите или создайте аккаунт Wix перед покупкой или использованием лётной подписки.',
    signedIn: 'Ниже показаны ваши активные подписки SimDream. Учётная запись нужна для покупки и использования подписки.',
    signIn: 'Войти или создать аккаунт',
    signOut: 'Выйти',
    loading: 'Загружаем подписки участника…',
    noActive: 'Активных подписок Wix пока нет.',
    active: 'Активна',
    redeem: 'Забронировать включённый сеанс',
    signInFailed: 'Не удалось открыть вход Wix. Попробуйте ещё раз.',
  },
  fr: {
    eyebrow: 'MEMBRES WIX',
    title: 'Votre espace abonnement de vol',
    signedOut: 'Connectez-vous ou créez un compte membre Wix avant d’acheter ou d’utiliser un abonnement de vol.',
    signedIn: 'Vos abonnements SimDream actifs sont affichés ci-dessous. Un compte membre est requis pour acheter et utiliser un abonnement.',
    signIn: 'Se connecter ou créer un compte',
    signOut: 'Se déconnecter',
    loading: 'Chargement des abonnements du membre…',
    noActive: 'Aucun abonnement Wix actif pour le moment.',
    active: 'Actif',
    redeem: 'Réserver une séance incluse',
    signInFailed: 'Impossible d’ouvrir la connexion Wix. Veuillez réessayer.',
  },
  ar: {
    eyebrow: 'أعضاء WIX',
    title: 'منصة اشتراك الطيران الخاصة بكم',
    signedOut: 'سجّلوا الدخول أو أنشئوا حساب عضو Wix قبل شراء اشتراك الطيران أو استخدامه.',
    signedIn: 'تظهر اشتراكات SimDream النشطة أدناه. العضوية مطلوبة لشراء الاشتراك واستخدامه.',
    signIn: 'تسجيل الدخول أو إنشاء حساب',
    signOut: 'تسجيل الخروج',
    loading: 'جارٍ تحميل اشتراكات العضو…',
    noActive: 'لا توجد اشتراكات Wix نشطة بعد.',
    active: 'نشط',
    redeem: 'حجز جلسة مشمولة',
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
  const copy = COPY[language];
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [memberName, setMemberName] = useState<string | null>(null);
  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadMember = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = getWixMemberClient();
      if (!client.auth.loggedIn()) {
        setSignedIn(false);
        setOrders([]);
        return;
      }

      const [memberResult, ordersResult] = await Promise.all([
        client.members.getCurrentMember({ fieldsets: ['FULL'] }),
        client.orders.memberListOrders({ limit: 50 }),
      ]);
      setSignedIn(true);
      setMemberName(memberResult.member?.profile?.nickname ?? null);
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
      setSignedIn(false);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMember();
  }, [loadMember]);

  const signIn = async () => {
    setError(null);
    try {
      const client = getWixMemberClient();
      const redirectUri = `${window.location.origin}/wix/members/callback`;
      const oAuthData = client.auth.generateOAuthData(redirectUri, window.location.href);
      window.sessionStorage.setItem(wixMemberOAuthStorageKey(), JSON.stringify(oAuthData));
      const { authUrl } = await client.auth.getAuthUrl(oAuthData);
      window.location.assign(authUrl);
    } catch {
      setError(copy.signInFailed);
    }
  };

  const signOut = async () => {
    try {
      const client = getWixMemberClient();
      const { logoutUrl } = await client.auth.logout(window.location.href);
      clearWixMemberSession();
      window.location.assign(logoutUrl);
    } catch {
      clearWixMemberSession();
      await loadMember();
    }
  };

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
          <Button variant="outline" onClick={() => void signOut()}>
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
