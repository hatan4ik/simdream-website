'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  Users,
  Award,
  CheckCircle2,
  Gift,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { getLocalizedPackages, type Language } from '@/lib/i18n/translations';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';

interface SubscriptionPlanDef {
  id: string;
  sessions: number;
  durationMinutes: number;
  totalHoursFormatted: string;
  priceIls: number;
  priceUsd: number;
  singleRateIls: number;
  savingsIls: number;
  savingsPercentage: number;
  popular?: boolean;
}

const SUBSCRIPTION_PLANS: SubscriptionPlanDef[] = [
  {
    id: 'sub-5x30',
    sessions: 5,
    durationMinutes: 30,
    totalHoursFormatted: '2.5 hrs',
    priceIls: 1790,
    priceUsd: 495,
    singleRateIls: 450,
    savingsIls: 460,
    savingsPercentage: 20,
    popular: false,
  },
  {
    id: 'sub-5x60',
    sessions: 5,
    durationMinutes: 60,
    totalHoursFormatted: '5.0 hrs',
    priceIls: 2750,
    priceUsd: 760,
    singleRateIls: 690,
    savingsIls: 700,
    savingsPercentage: 20,
    popular: true,
  },
  {
    id: 'sub-5x90',
    sessions: 5,
    durationMinutes: 90,
    totalHoursFormatted: '7.5 hrs',
    priceIls: 3390,
    priceUsd: 935,
    singleRateIls: 990,
    savingsIls: 1560,
    savingsPercentage: 31,
    popular: false,
  },
  {
    id: 'sub-10x60',
    sessions: 10,
    durationMinutes: 60,
    totalHoursFormatted: '10.0 hrs',
    priceIls: 4850,
    priceUsd: 1340,
    singleRateIls: 690,
    savingsIls: 2050,
    savingsPercentage: 30,
    popular: false,
  },
];

interface PlanLocalizedCopy {
  title: string;
  badge: string;
  shortDesc: string;
  features: string[];
}

const SUBSCRIPTION_LOCALIZED_COPY: Record<Language, Record<string, PlanLocalizedCopy>> = {
  en: {
    'sub-5x30': {
      title: 'Annual 5×30 Flight Pass',
      badge: '5 Flights • 30 Min Each',
      shortDesc: '5 flight sessions of 30 minutes in the 1:1 Boeing 737 MAX cockpit. Perfect for beginner circuit practice.',
      features: [
        '5 flight sessions of 30 minutes (150 total cockpit minutes)',
        'Valid for 12 full months from purchase date',
        '1 jumpseat observer included free in every flight',
        'Commercial pilot flight instructor as First Officer',
        'Flexible scheduling via phone or dispatch',
      ],
    },
    'sub-5x60': {
      title: "Annual 5×60 Captain's Pass",
      badge: 'Most Popular • 20% Off',
      shortDesc: '5 full 60-minute Captain missions with Takeoff & Landing training and iconic World Airport Trios.',
      features: [
        '5 flight missions of 60 minutes (300 total cockpit minutes / 5 hrs)',
        'Save 700 ILS vs individual flights (only 550 ILS per flight)',
        'Up to 2 observers in cockpit jumpseats free on every flight',
        'Takeoff & Landing training + World Airport Trios',
        'Valid for 12 months with priority dispatch booking',
      ],
    },
    'sub-5x90': {
      title: 'Annual 5×90 Odyssey Pass',
      badge: 'Ultimate Immersion • 31% Off',
      shortDesc: '5 extended 90-minute flight missions. Fly solo or alternate Captain controls with a partner on every flight.',
      features: [
        '5 extended missions of 90 minutes (450 total cockpit minutes / 7.5 hrs)',
        'Fly solo or split Captain controls between 2 participants',
        'Cold & Dark startups, severe weather & V1 emergency scenarios',
        'Complimentary 4K HD cockpit video recording included',
        'Valid for 12 months with maximum booking flexibility',
      ],
    },
    'sub-10x60': {
      title: 'Annual 10×60 Master Aviator Pass',
      badge: 'Best Value • 10 Hours Cockpit Time',
      shortDesc: '10 full 60-minute Boeing 737 flights (10.0 flight hours). The premier package for dedicated flight sim enthusiasts.',
      features: [
        '10 flight missions of 60 minutes (600 total cockpit minutes / 10 hrs)',
        'Lowest hourly rate (only 485 ILS per flight — save 2050 ILS)',
        'Personalized pilot profile & flight logbook tracking',
        'Up to 2 observers in cockpit jumpseats free on every flight',
        'Valid for 12 months with VIP rescheduling flexibility',
      ],
    },
  },
  he: {
    'sub-5x30': {
      title: 'מנוי שנתי 5×30 (5 טיסות היכרות)',
      badge: '5 טיסות • 30 דקות',
      shortDesc: '5 מפגשי טיסה בני 30 דקות בקוקפיט בואינג 737 MAX. אידיאלי להתנסות קבועה ולחובבי טיסה מתחילים.',
      features: [
        '5 טיסות בנות 30 דקות (סה״כ 150 דק׳ זמן קוקפיט)',
        'תוקף של 12 חודשים מלאים מיום הרכישה',
        'אורח 1 בכיסא צופה (Jumpseat) בכל טיסה כלול',
        'מדריך טיסה צמוד לכל אורך המפגשים',
        'תיאום גמיש לפי נוחותכם במערכת ההזמנות',
      ],
    },
    'sub-5x60': {
      title: 'מנוי שנתי 5×60 (כרטיסיית קברניט)',
      badge: 'הכי פופולרי • חיסכון של 20%',
      shortDesc: '5 משימות טיסה מלאות בנות 60 דקות עם תרגול המראות ונחיתות ובחירת שלישיית שדות תעופה איקוניים בעולם.',
      features: [
        '5 טיסות בנות 60 דקות (סה״כ 300 דק׳ / 5 שעות קוקפיט)',
        'חיסכון משמעותי לעומת הזמנת טיסות בודדות (רק 550 ש״ח לטיסה)',
        'עד 2 אורחים בכיסאות צופים בכל טיסה ללא תוספת תשלום',
        'תרגול המראה ונחיתה + שלישיית שדות תעופה לבחירה',
        'תוקף ל-12 חודשים עם קדימות בשיריון מועדים',
      ],
    },
    'sub-5x90': {
      title: 'מנוי שנתי 5×90 (כרטיסיית אודיסאה)',
      badge: 'חוויית עומק • חיסכון של 31%',
      shortDesc: '5 טיסות ממושכות של 90 דקות. מתאים לטיסות סולו ארוכות או לחלוקת הגאים בין 2 טייסים בכל מפגש.',
      features: [
        '5 טיסות בנות 90 דקות (סה״כ 450 דק׳ / 7.5 שעות קוקפיט)',
        'אפשרות לחלוקת הגאים בין שני משתתפים בכל טיסה',
        'תרגול הפעלת קוקפיט Cold & Dark ותרחישי חירום V1',
        'צילום וידאו 4K מקצועי של הטיסה במתנה',
        'תוקף ל-12 חודשים עם גמישות מלאה',
      ],
    },
    'sub-10x60': {
      title: 'מנוי שנתי 10×60 (כרטיסיית מאסטר 10 שעות)',
      badge: 'המשתלם ביותר • 30% הנחה',
      shortDesc: '10 טיסות בנות 60 דקות (10 שעות טיסה מלאות). החבילה המשתלמת ביותר לחובבי סימולטור וטייסים קבועים.',
      features: [
        '10 טיסות מלאות של 60 דקות (סה״כ 600 דק׳ / 10 שעות טיסה)',
        'המחיר הנמוך ביותר לשעה (רק 485 ש״ח לטיסה)',
        'מעקב לוגבוק ופרופיל טייס אישי במועדון החברים',
        'עד 2 אורחים בכיסאות צופים בכל טיסה חינם',
        'תוקף ל-12 חודשים עם גמישות מירבית בשינוי מועדים',
      ],
    },
  },
  ru: {
    'sub-5x30': {
      title: 'Годовой абонемент 5×30 (5 полетов)',
      badge: '5 полетов • по 30 мин',
      shortDesc: '5 сессий по 30 минут в кабине Boeing 737 MAX 1:1. Отлично подходит для регулярных тренировок взлета и посадки.',
      features: [
        '5 полетов по 30 минут (всего 150 минут в кабине)',
        'Действует 12 месяцев с даты покупки',
        '1 гость на откидном кресле включен бесплатно на каждом полете',
        'Опытный пилот-инструктор в роли второго пилота',
        'Гибкое бронирование через диспетчерскую службу',
      ],
    },
    'sub-5x60': {
      title: 'Годовой абонемент 5×60 (Капитанский)',
      badge: 'Самый популярный • Скидка 20%',
      shortDesc: '5 полноценных 60-минутных полетов с отработкой взлетов, посадок и выбором пакета из 3 мировых аэропортов.',
      features: [
        '5 полетов по 60 минут (300 минут / 5 часов в кабине)',
        'Существенная экономия по сравнению с отдельными сессиями',
        'До 2 гостей на откидных креслах бесплатно на каждом полете',
        'Взлет, посадка и трио мировых аэропортов на выбор',
        'Действует 12 месяцев с приоритетом при записи',
      ],
    },
    'sub-5x90': {
      title: 'Годовой абонемент 5×90 (Одиссея)',
      badge: 'Глубокое погружение • Скидка 31%',
      shortDesc: '5 расширенных 90-минутных миссий. Одиночные полеты или разделение управления между 2 пилотами.',
      features: [
        '5 миссий по 90 минут (450 минут / 7.5 часов в кабине)',
        'Возможность летать соло или передавать управление напарнику',
        'Запуск Cold & Dark, экстремальная погода и отказы V1',
        'Профессиональная видеозапись полета в 4K в подарок',
        'Действует 12 месяцев с полной гибкостью',
      ],
    },
    'sub-10x60': {
      title: 'Годовой абонемент 10×60 (Мастер 10 часов)',
      badge: 'Максимальная выгода • Скидка 30%',
      shortDesc: '10 полетов по 60 минут (10 часов налета). Идеальный абонемент для постоянных энтузиастов симулятора.',
      features: [
        '10 полетов по 60 минут (600 минут / 10 часов летного времени)',
        'Минимальная цена за час полета',
        'Учет часов в личном профиле и летной книжке пилота',
        'До 2 гостей на откидных креслах бесплатно на каждом полете',
        'Действует 12 месяцев с максимальной гибкостью переноса слотов',
      ],
    },
  },
  fr: {
    'sub-5x30': {
      title: 'Pass Annuel 5×30 (5 Sessions de Vol)',
      badge: '5 Vols • 30 Min',
      shortDesc: '5 sessions de 30 minutes dans le cockpit Boeing 737 MAX échelle 1:1. Idéal pour s’entraîner aux tours de piste.',
      features: [
        '5 sessions de 30 minutes (150 minutes de cockpit au total)',
        'Valable 12 mois complets à compter de l’achat',
        '1 invité en strapontin inclus sur chaque session',
        'Instructeur pilote de ligne professionnel dédié',
        'Réservation flexible auprès du centre',
      ],
    },
    'sub-5x60': {
      title: 'Pass Annuel 5×60 (Formule Commandant)',
      badge: 'Le Plus Populaire • 20% d’Économie',
      shortDesc: '5 missions complètes de 60 minutes avec tour de piste et pack de 3 aéroports mythiques au choix.',
      features: [
        '5 missions de 60 minutes (300 minutes / 5 heures de vol)',
        'Économisez 700 ILS par rapport aux vols individuels',
        'Jusqu’à 2 invités en strapontin gratuits à chaque vol',
        'Tour de piste complet + 1 Trio d’aéroports internationaux',
        'Valable 12 mois avec créneaux prioritaires',
      ],
    },
    'sub-5x90': {
      title: 'Pass Annuel 5×90 (Formule Odyssée)',
      badge: 'Immersion Totale • 31% d’Économie',
      shortDesc: '5 vols de 90 minutes. À effectuer en solo ou à partager aux commandes à deux pilotes.',
      features: [
        '5 missions longues de 90 minutes (450 minutes / 7.5 heures de vol)',
        'Vol solo ou partage des commandes entre deux équipiers',
        'Démarrage Cold & Dark, météo dégradée et procédures de panne V1',
        'Vidéo 4K du cockpit offerte sur chaque session',
        'Valable 12 mois avec flexibilité maximale',
      ],
    },
    'sub-10x60': {
      title: 'Pass Annuel 10×60 (Master 10 Heures)',
      badge: 'Meilleur Tarif • 30% d’Économie',
      shortDesc: '10 missions de 60 minutes (10 heures de vol complètes). L’offre incontournable pour passionnés réguliers.',
      features: [
        '10 missions complètes de 60 minutes (600 minutes / 10 heures)',
        'Tarif horaire le plus avantageux',
        'Suivi du carnet de vol et profil pilote personnalisé',
        'Jusqu’à 2 invités en strapontin gratuits sur tous les vols',
        'Valable 12 mois avec souplesse VIP de report',
      ],
    },
  },
  ar: {
    'sub-5x30': {
      title: 'الاشتراك السنوي 5×30 (5 جلسات طيران)',
      badge: '5 رحلات • 30 دقيقة',
      shortDesc: '5 جلسات طيران مدة كل منها 30 دقيقة في قمرة قيادة بوينغ 737 ماكس بمقياس 1:1. مثالية لممارسة الإقلاع والهبوط.',
      features: [
        '5 جلسات طيران مدة كل منها 30 دقيقة (150 دقيقة إجمالية)',
        'صالح لمدة 12 شهرًا كاملة من تاريخ الشراء',
        'مرافق واحد في مقعد المراقبة مشمول مجاناً في كل رحلة',
        'مدرب طيران معتمد كطيار مساعد',
        'جدولة مرنة عبر مركز الحجز',
      ],
    },
    'sub-5x60': {
      title: 'الاشتراك السنوي 5×60 (باقة القبطان)',
      badge: 'الأكثر طلباً • توفير 20%',
      shortDesc: '5 مهمات طيران كاملة مدة كل منها 60 دقيقة تشمل تدريب الإقلاع والهبوط وثلاثية مطارات عالمية مختارة.',
      features: [
        '5 مهمات طيران مدة كل منها 60 دقيقة (300 دقيقة / 5 ساعات طيران)',
        'توفير كبير مقارنة بالرحلات الفردية (فقط 550 شيكل لكل رحلة)',
        'حتى مرافقين اثنين في مقاعد المراقبة مجاناً في كل رحلة',
        'تدريب الإقلاع والهبوط + ثلاثية مطارات دولية من اختيارك',
        'صالح لمدة 12 شهرًا مع أولوية في حجز المواعيد',
      ],
    },
    'sub-5x90': {
      title: 'الاشتراك السنوي 5×90 (باقة الأوديسة)',
      badge: 'تجربة طيران متقدمة • توفير 31%',
      shortDesc: '5 رحلات طيران ممتدة مدة كل منها 90 دقيقة. مناسبة للطيران الفردي أو تقاسم القيادة بين طيارين.',
      features: [
        '5 مهمات ممتدة مدة كل منها 90 دقيقة (450 دقيقة / 7.5 ساعات)',
        'إمكانية الطيران المنفرد أو تقاسم أجهزة التحكم بين شخصين',
        'تشغيل القمرة من الصفر (Cold & Dark) وسيناريوهات طوارئ المحرك',
        'تسجيل فيديو عالي الدقة 4K مجاني للرحلة',
        'صالح لمدة 12 شهرًا مع مرونة كاملة',
      ],
    },
    'sub-10x60': {
      title: 'الاشتراك السنوي 10×60 (باقة المحترف 10 ساعات)',
      badge: 'أفضل قيمة • خصم 30%',
      shortDesc: '10 رحلات طيران كاملة مدة كل منها 60 دقيقة (10 ساعات طيران كاملة). الباقة المثالية لعشاق الطيران الدائمين.',
      features: [
        '10 مهمات طيران مدة كل منها 60 دقيقة (600 دقيقة / 10 ساعات)',
        'أقل سعر للساعة (فقط 485 شيكل لكل رحلة)',
        'سجل رحلات معتمد وتتبع ملف الطيار الشخصي',
        'حتى مرافقين اثنين في مقاعد المراقبة مجاناً في كل رحلة',
        'صالح لمدة 12 شهرًا مع مرونة كاملة في تعديل المواعيد',
      ],
    },
  },
};

export default function ExperiencesPage() {
  const { t, language, isRTL } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    if (cat === 'subscriptions' || cat === 'recreational' || cat === 'fear_of_flying') {
      setSelectedCategory(cat);
    }
  }, []);

  const categories = [
    { id: 'all', label: t.experiences.all },
    { id: 'recreational', label: t.experiences.recreational },
    { id: 'subscriptions', label: t.experiences.subscriptions },
    { id: 'fear_of_flying', label: t.experiences.fearOfFlying },
  ];

  // Exclude B2B corporate and professional training packages from the consumer catalog
  // (Corporate workshops live on /workshops; Professional airline assessment prep lives on /pro)
  const packages = getLocalizedPackages(language).filter(
    (p) => p.category !== 'corporate' && p.category !== 'training'
  );

  const filteredPackages =
    selectedCategory === 'all'
      ? packages
      : packages.filter((p) => p.category === selectedCategory);

  const showFlightPackages = selectedCategory !== 'subscriptions';
  const showSubscriptions = selectedCategory === 'all' || selectedCategory === 'subscriptions';

  return (
    <div className="flex-1 w-full min-w-0 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-5">
        <Badge variant="sky">{t.experiences.badge}</Badge>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
          {t.experiences.title}
        </h1>
        <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
          {t.experiences.subtitle}
        </p>

        {/* Direct Launch Bar to Live Kantorovich Calendar */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link href="/book">
            <Button size="lg" className="font-bold shadow-glow">
              <Calendar className="w-5 h-5" />
              <span>{t.nav.bookFlight} — Live Calendar &amp; Slots</span>
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
          </Link>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-slate-800 pb-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all min-h-[44px] touch-manipulation cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-sky-700 text-white shadow-glow'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 1. Single Flight Packages Grid */}
      {showFlightPackages && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPackages.map((pkg) => (
            <Card
              key={pkg.id}
              glow={pkg.featured}
              borderAccent={pkg.featured ? 'sky' : 'none'}
              className="flex flex-col justify-between relative overflow-hidden"
            >
              {pkg.badge && (
                <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
                  <Badge variant={pkg.featured ? 'sky' : 'slate'}>{pkg.badge}</Badge>
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{pkg.durationMinutes} {t.experiences.minutesTime}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">{pkg.title}</h2>
                </div>

                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{pkg.description}</p>

                {/* Price */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-black text-white">{formatCurrency(pkg.priceIls)}</span>
                      <span className="text-xs text-slate-400 font-mono ml-1 rtl:mr-1">{t.experiences.perFlight}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{t.experiences.approxUsd} ${pkg.priceUsd} USD</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      <span>{pkg.guestSeats} {t.experiences.jumpseatGuests}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t.experiences.instructorIncluded}</span>
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-2">
                  <p className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                    {t.experiences.packageHighlights}
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {pkg.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-8 mt-auto">
                <Link
                  href={
                    pkg.category === 'corporate'
                      ? '/workshops'
                      : `/book?package=${pkg.slug}`
                  }
                >
                  <Button
                    variant={pkg.featured ? 'primary' : 'secondary'}
                    className="w-full font-bold justify-between min-h-[44px] touch-manipulation cursor-pointer"
                  >
                    <span>
                      {pkg.category === 'corporate'
                        ? t.experiences.inquireCorporate
                        : t.experiences.bookThisFlight}
                    </span>
                    <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 2. Annual Simulator Subscriptions & Multi-Passes Section */}
      {showSubscriptions && (
        <section className="space-y-8 pt-4">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge variant="sky">{t.experiences.subscriptionsBadge}</Badge>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              {t.experiences.subscriptionsTitle}
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {t.experiences.subscriptionsSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const planCopy =
                SUBSCRIPTION_LOCALIZED_COPY[language]?.[plan.id] ||
                SUBSCRIPTION_LOCALIZED_COPY.en[plan.id];
              const costPerFlight = Math.round(plan.priceIls / plan.sessions);

              return (
                <Card
                  key={plan.id}
                  glow={plan.popular}
                  borderAccent={plan.popular ? 'sky' : 'none'}
                  className={`flex flex-col justify-between relative overflow-hidden p-5 sm:p-6 space-y-6 ${
                    plan.popular
                      ? 'border-sky-400/80 bg-gradient-to-b from-sky-500/15 via-slate-950/90 to-slate-950 shadow-glow'
                      : 'border-slate-800 bg-slate-950/70'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-full">
                        {planCopy.badge}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        -{plan.savingsPercentage}%
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white">{planCopy.title}</h3>
                      <div className="flex items-baseline gap-1.5 mt-2">
                        <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                          {formatCurrency(plan.priceIls)}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          / {plan.sessions} {t.experiences.sessionsCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400 mt-1">
                        <span>{t.experiences.approxUsd} ${plan.priceUsd} USD</span>
                        <span className="text-emerald-400 font-semibold">
                          ~{formatCurrency(costPerFlight)} {t.experiences.perSessionApprox}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>{t.experiences.totalFlightTime}:</span>
                        <span className="text-sky-300 font-bold">{plan.totalHoursFormatted}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>{t.experiences.validity12m}</span>
                        <span className="text-emerald-400 font-bold">
                          {formatCurrency(plan.savingsIls)} OFF
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed">
                      {planCopy.shortDesc}
                    </p>

                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <p className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                        {t.experiences.packageHighlights}
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {planCopy.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 space-y-2">
                    <Link
                      href={`/contact?subject=subscription&plan=${plan.id}`}
                      className="block w-full"
                    >
                      <Button
                        variant={plan.popular ? 'primary' : 'secondary'}
                        className="w-full font-bold justify-between text-xs sm:text-sm py-2.5 min-h-[44px] touch-manipulation cursor-pointer"
                      >
                        <span>{t.experiences.buySubscription}</span>
                        <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Professional Pilot Assessment Bridge Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center md:text-left rtl:md:text-right">
          <Badge variant="amber">{t.experiences.proBridgeBadge}</Badge>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            {t.experiences.proBridgeTitle}
          </h3>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
            {t.experiences.proBridgeDesc}
          </p>
        </div>
        <Link href="/pro" className="shrink-0">
          <Button size="lg" className="font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-glowAmber border-amber-300 min-h-[44px] touch-manipulation cursor-pointer">
            <span>{t.experiences.proBridgeButton}</span>
            <ArrowRight className={`w-4 h-4 text-slate-950 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </Link>
      </div>

      {/* 4. B2B / Corporate Aviation Workshops Dedicated Bridge Card */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center md:text-left rtl:md:text-right">
          <Badge variant="amber">{t.experiences.b2bBadge}</Badge>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            {t.experiences.b2bTitle}
          </h3>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            {t.experiences.b2bDesc}
          </p>
        </div>
        <Link href="/workshops" className="shrink-0">
          <Button size="lg" className="font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-glowAmber min-h-[44px] touch-manipulation cursor-pointer">
            <span>{t.experiences.b2bButton}</span>
            <ArrowRight className={`w-4 h-4 text-slate-950 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </Link>
      </div>

      {/* 5. Gift Voucher Teaser Banner */}
      <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-950/60 via-slate-900 to-sky-950/60 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-glow">
        <div className="space-y-2 text-center md:text-left rtl:md:text-right">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-sky-400 font-bold uppercase">
            <Gift className="w-4 h-4" />
            <span>{t.experiences.giftTeaserBadge}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">{t.experiences.giftTeaserTitle}</h2>
          <p className="text-slate-300 text-sm max-w-xl">
            {t.experiences.giftTeaserDesc}
          </p>
        </div>
        <Link href="/vouchers">
          {/* Wraps on phones: a no-wrap label made the page ~359px wide at 320px. */}
          <Button size="lg" className="font-bold text-center sm:whitespace-nowrap min-h-[44px] touch-manipulation cursor-pointer">
            <Gift className="w-5 h-5" />
            <span>{t.experiences.customizeVoucher}</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
