'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Navigation,
  Train,
  Car,
  Send,
  CheckCircle2,
  MessageCircle,
  ExternalLink,
  UserCheck,
  ShieldCheck,
  Compass,
  LocateFixed,
  Footprints,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useLanguage } from '@/lib/i18n/language-context';
import {
  FACILITY_INFO,
  ROUTE_ORIGIN_PRESETS,
  getLiveFacilityStatus,
  calculateDynamicRouteFromCoords,
  LiveFacilityStatus,
} from '@/lib/config/facility-info';

type TravelMode = 'transit' | 'driving' | 'walking';

export default function ContactPage() {
  const { t, language } = useLanguage();
  const isHe = language === 'he';

  // Live Israel Time & Facility Open/Closed Status
  const [liveStatus, setLiveStatus] = useState<LiveFacilityStatus>(() => getLiveFacilityStatus());

  useEffect(() => {
    setLiveStatus(getLiveFacilityStatus());
    const timer = setInterval(() => {
      setLiveStatus(getLiveFacilityStatus());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Dynamic Arrival & Route Calculator State
  const [selectedPresetId, setSelectedPresetId] = useState<string>('yehudit-lrt');
  const [customOrigin, setCustomOrigin] = useState<string>('');
  const [travelMode, setTravelMode] = useState<TravelMode>('transit');
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'ready' | 'error'>('idle');
  const [gpsMetrics, setGpsMetrics] = useState<{
    lat: number;
    lng: number;
    roadDistanceKm: number;
    walkingMinutes: number;
    drivingMinutes: number;
    transitMinutes: number;
  } | null>(null);

  const activePreset = useMemo(
    () => ROUTE_ORIGIN_PRESETS.find((p) => p.id === selectedPresetId) || ROUTE_ORIGIN_PRESETS[0],
    [selectedPresetId]
  );

  const handleUseMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('error');
      return;
    }
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const metrics = calculateDynamicRouteFromCoords(latitude, longitude);
        setGpsMetrics({
          lat: latitude,
          lng: longitude,
          ...metrics,
        });
        setGpsStatus('ready');
      },
      () => {
        setGpsStatus('error');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Build dynamic Google Maps Directions URL with origin, destination Place ID, and travelmode
  const dynamicGoogleMapsDirectionsUrl = useMemo(() => {
    const params = new URLSearchParams({
      api: '1',
      destination: 'Gershon Shatz St 36, Tel Aviv-Yafo, Israel',
      destination_place_id: FACILITY_INFO.placeId,
      travelmode: travelMode,
    });

    if (customOrigin.trim()) {
      params.set('origin', customOrigin.trim());
    } else if (gpsStatus === 'ready' && gpsMetrics) {
      params.set('origin', `${gpsMetrics.lat},${gpsMetrics.lng}`);
    } else if (activePreset) {
      params.set('origin', activePreset.query);
    }

    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }, [customOrigin, gpsStatus, gpsMetrics, activePreset, travelMode]);

  // Contact Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Question',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsSuccess(true);
    setIsSubmitting(false);
  };

  const activeDistanceKm =
    gpsStatus === 'ready' && gpsMetrics ? gpsMetrics.roadDistanceKm : activePreset.distanceKm;
  const activeEtaMinutes =
    gpsStatus === 'ready' && gpsMetrics
      ? travelMode === 'walking'
        ? gpsMetrics.walkingMinutes
        : travelMode === 'driving'
        ? gpsMetrics.drivingMinutes
        : gpsMetrics.transitMinutes
      : travelMode === 'walking'
      ? activePreset.walkingMinutes ?? Math.round(activePreset.distanceKm * 12)
      : travelMode === 'driving'
      ? activePreset.drivingMinutes
      : activePreset.transitMinutes;

  return (
    <div className="flex-1 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-14">
      {/* 1. HEADER */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="sky">{t.contact.badge}</Badge>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
          {t.contact.title}
        </h1>
        <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
          {t.contact.subtitle}
        </p>
      </div>

      {/* 2. KEY FACILITY RULES & MINIMUM AGE RIBBON (10+) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-slate-900/90 to-slate-900/90">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
            <UserCheck aria-hidden="true" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase text-amber-400 font-bold">
              {isHe ? 'גיל מינימלי להטסה' : 'MINIMUM PILOT AGE'}
            </div>
            <div className="text-sm sm:text-base font-black text-white">
              {isHe ? 'גיל 10+ ומעלה' : 'Ages 10+ Years Old'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-400 flex items-center justify-center shrink-0">
            <ShieldCheck aria-hidden="true" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase text-sky-400 font-bold">
              {isHe ? 'תיאום והגעה' : 'RESERVATION POLICY'}
            </div>
            <div className="text-sm font-bold text-white">
              {isHe ? 'נדרשת הזמנה מראש (הגעה 10 דק׳ לפני)' : 'Advance Booking Required'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
            <Compass aria-hidden="true" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase text-emerald-400 font-bold">
              {isHe ? 'מלווים בתא הטייס' : 'COCKPIT JUMPSEATS'}
            </div>
            <div className="text-sm font-bold text-white">
              {isHe ? 'עד 2 אורחים נוספים בתא הטייס' : 'Up to 2 Observer Guests Welcome'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. CORE BUSINESS CARDS (ADDRESS, DYNAMIC HOURS, DIRECT PHONE & EMAIL) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Verified Google Business Address */}
        <Card className="space-y-4 flex flex-col justify-between" borderAccent="sky">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                <MapPin aria-hidden="true" className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 font-bold">
                GOOGLE VERIFIED
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">{t.contact.addressTitle}</h2>
            <div className="text-slate-200 text-sm font-semibold space-y-0.5">
              <p>{t.contact.addressLine1}</p>
              <p className="text-slate-400 font-normal">{t.contact.addressLine2}</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{t.contact.addressNote}</p>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-2">
            <a
              href={FACILITY_INFO.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-mono font-bold transition-all"
            >
              <span>Google Maps</span>
              <ExternalLink aria-hidden="true" className="w-3.5 h-3.5" />
            </a>
            <a
              href={FACILITY_INFO.wazeNavigationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-bold transition-all"
            >
              <span>Waze Navigation</span>
              <Navigation aria-hidden="true" className="w-3.5 h-3.5 text-sky-400" />
            </a>
          </div>
        </Card>

        {/* Card 2: Dynamic Operating Hours & Real-Time IST Status */}
        <Card className="space-y-4 flex flex-col justify-between" borderAccent="emerald">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Clock aria-hidden="true" className="w-5 h-5" />
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full font-bold border ${
                  liveStatus.isOpen
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    liveStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>{liveStatus.isOpen ? (isHe ? 'פתוח כעת' : 'OPEN NOW') : isHe ? 'סגור כעת' : 'CLOSED'}</span>
              </span>
            </div>

            <h2 className="text-lg font-bold text-white">{t.contact.hoursTitle}</h2>

            <div className="text-slate-200 text-xs font-mono space-y-1.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
              <div className="flex justify-between">
                <span className="text-slate-400">{isHe ? 'ראשון – חמישי:' : 'Sun – Thu:'}</span>
                <span className="font-bold text-white" dir="ltr">10:00 – 23:00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{isHe ? 'יום שישי:' : 'Friday:'}</span>
                <span className="font-bold text-white" dir="ltr">09:00 – 16:00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{isHe ? 'מוצ״ש (שבת):' : 'Saturday:'}</span>
                <span className="font-bold text-amber-300" dir="ltr">19:00 – 24:00</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 space-y-0.5 font-mono text-[11px]">
            <p className={liveStatus.isOpen ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              {isHe ? liveStatus.statusHeadlineHe : liveStatus.statusHeadlineEn}
            </p>
            <p className="text-slate-400">
              {isHe ? liveStatus.statusSublineHe : liveStatus.statusSublineEn}
            </p>
          </div>
        </Card>

        {/* Card 3: Direct Dispatch Phone, WhatsApp & Email */}
        <Card className="space-y-4 flex flex-col justify-between" borderAccent="amber">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Phone aria-hidden="true" className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                DIRECT DISPATCH
              </span>
            </div>

            <h2 className="text-lg font-bold text-white">{t.contact.dispatchTitle}</h2>

            <div className="space-y-2 text-sm font-mono">
              <a
                href={FACILITY_INFO.contact.phoneHref}
                dir="ltr"
                className="flex items-center gap-2 text-white hover:text-sky-400 font-bold transition-colors"
              >
                <Phone aria-hidden="true" className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{FACILITY_INFO.contact.phoneDisplay}</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({FACILITY_INFO.contact.phoneInternational})
                </span>
              </a>

              <a
                href={FACILITY_INFO.contact.emailHref}
                dir="ltr"
                className="flex items-center gap-2 text-slate-200 hover:text-sky-400 transition-colors"
              >
                <Mail aria-hidden="true" className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{FACILITY_INFO.contact.email}</span>
              </a>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80">
            <a
              href={FACILITY_INFO.contact.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold transition-all"
            >
              <MessageCircle aria-hidden="true" className="w-4 h-4" />
              <span>{t.contact.chatWhatsApp}</span>
            </a>
          </div>
        </Card>
      </div>

      {/* 4. DYNAMIC GOOGLE MAPS ARRIVAL ROUTE PLANNER & TRANSIT CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left 7 Columns: Dynamic Route Calculator + Transit Modes */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white">{t.contact.directionsTitle}</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {isHe
                ? 'בחרו נקודת מוצא או השתמשו במיקום ה-GPS שלכם לחישוב מסלול הגעה דינמי אל רחוב גרשון ש"ץ 36, תל אביב:'
                : 'Select your starting point or use your live GPS location to calculate dynamic arrival instructions to Gershon Shatz St 36:'}
            </p>
          </div>

          {/* Interactive Dynamic Route Engine Box */}
          <div className="p-5 sm:p-6 rounded-2xl border border-sky-500/30 bg-slate-900/90 space-y-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-2">
                <Compass aria-hidden="true" className="w-5 h-5 text-sky-400" />
                <span className="text-sm font-bold text-white font-mono uppercase">
                  {isHe ? 'מחשבון מסלול הגעה דינמי (Google Maps)' : 'Dynamic Google Maps Arrival Calculator'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleUseMyLocation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-mono font-bold transition-all"
              >
                <LocateFixed aria-hidden="true" className="w-3.5 h-3.5" />
                <span>
                  {gpsStatus === 'locating'
                    ? isHe
                      ? 'מאתר מיקום...'
                      : 'Locating GPS...'
                    : gpsStatus === 'ready'
                    ? isHe
                      ? '✓ מיקום GPS פעיל'
                      : '✓ Live GPS Active'
                    : isHe
                    ? 'השתמש במיקום הנוכחי שלי'
                    : 'Use My Live GPS'}
                </span>
              </button>
            </div>

            {/* Quick Starting Point Pills */}
            <div className="space-y-2">
              <span className="block text-[11px] font-mono uppercase text-slate-400">
                {isHe ? '1. בחרו נקודת מוצא מהירה או הקלידו כתובת:' : '1. Choose Starting Point or Enter Custom Origin:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ROUTE_ORIGIN_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id && gpsStatus !== 'ready' && !customOrigin;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedPresetId(preset.id);
                        setGpsStatus('idle');
                        setCustomOrigin('');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                          : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {isHe ? preset.labelHe : preset.labelEn}
                    </button>
                  );
                })}
              </div>

              <div className="pt-1">
                <label htmlFor="custom-origin-input" className="sr-only">
                  {isHe ? 'כתובת מוצא מותאמת אישית' : 'Custom starting address'}
                </label>
                <input
                  id="custom-origin-input"
                  name="customOrigin"
                  type="text"
                  value={customOrigin}
                  onChange={(e) => setCustomOrigin(e.target.value)}
                  placeholder={
                    isHe
                      ? 'או הקלידו עיר / כתובת מוצא לחישוב מסלול ב-Google Maps...'
                      : 'Or type any starting street/city for live Google Maps routing...'
                  }
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Travel Mode Switcher */}
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  {
                    id: 'transit',
                    label: isHe ? 'רכבת / רכבת קלה' : 'Train / Light Rail',
                    icon: Train,
                  },
                  {
                    id: 'driving',
                    label: isHe ? 'רכב וחניה' : 'Driving & Parking',
                    icon: Car,
                  },
                  {
                    id: 'walking',
                    label: isHe ? 'הליכה רגלית' : 'Walking',
                    icon: Footprints,
                  },
                ] as const
              ).map((mode) => {
                const Icon = mode.icon;
                const active = travelMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setTravelMode(mode.id)}
                    className={`p-2.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                      active
                        ? 'border-sky-400 bg-sky-500/15 text-white'
                        : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon aria-hidden="true" className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="truncate">{mode.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Computed ETA, Distance & Step-by-Step Instructions */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5 font-mono text-xs">
                <span className="text-slate-400">
                  {isHe ? 'יעד:' : 'DESTINATION:'}{' '}
                  <strong className="text-white">Gershon Shatz 36, Tel Aviv</strong>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sky-400 font-bold">~{activeDistanceKm} km</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                    ~{activeEtaMinutes} min
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {travelMode === 'driving'
                  ? isHe
                    ? activePreset.drivingStepsHe
                    : activePreset.drivingStepsEn
                  : isHe
                  ? activePreset.transitStepsHe
                  : activePreset.transitStepsEn}
              </p>

              <div className="pt-1 flex flex-wrap gap-2">
                <a
                  href={dynamicGoogleMapsDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-xs font-black transition-all shadow-md"
                >
                  <Navigation aria-hidden="true" className="w-3.5 h-3.5" />
                  <span>
                    {isHe
                      ? 'פתח מסלול ניווט חי ב-Google Maps ↗'
                      : 'Launch Turn-by-Turn Route in Google Maps ↗'}
                  </span>
                </a>
              </div>
            </div>
          </div>

          {/* Static Reference Cards for Light Rail (Yehudit), Israel Railways (HaShalom), and Street/Private Parking */}
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 mt-1">
                <Navigation aria-hidden="true" className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-sm">
                <h3 className="font-bold text-white">{t.contact.lightRailTitle}</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {t.contact.lightRailDesc}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 mt-1">
                <Train aria-hidden="true" className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-sm">
                <h3 className="font-bold text-white">{t.contact.trainTitle}</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {t.contact.trainDesc}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-1">
                <Car aria-hidden="true" className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-sm">
                <h3 className="font-bold text-white">{t.contact.carTitle}</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {t.contact.carDesc}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Live Google Map Embed + Direct Inquiry Form */}
        <div className="lg:col-span-5 space-y-6">
          {/* Interactive Google Maps Embed for Gershon Shatz 36 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-2xl space-y-2">
            <div className="flex items-center justify-between px-1 text-xs font-mono text-slate-300">
              <span>📍 Gershon Shatz St 36, Tel Aviv-Yafo</span>
              <a
                href={FACILITY_INFO.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:underline"
              >
                Open Full Map ↗
              </a>
            </div>
            <iframe
              title="SimDream Boeing 737 MAX Flight Simulator Location — Gershon Shatz St 36, Tel Aviv-Yafo"
              src={FACILITY_INFO.googleEmbedUrl}
              className="w-full h-64 rounded-xl border border-slate-800"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* Direct Dispatch Contact Form */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">{t.contact.messageTitle}</h2>
              <p className="text-xs text-slate-400">{t.contact.messageSubtitle}</p>
            </div>

            {isSuccess ? (
              <div
                role="status"
                aria-live="polite"
                className="p-8 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-center space-y-3"
              >
                <CheckCircle2 aria-hidden="true" className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-lg font-bold text-white">{t.contact.formSuccessTitle}</h3>
                <p className="text-xs text-slate-300">{t.contact.formSuccessDesc}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} method="POST" action="/contact" className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-name"
                    className="block font-mono uppercase text-slate-300 font-semibold"
                  >
                    {t.contact.formName}
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ronen Katz"
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-base text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="contact-email"
                      className="block font-mono uppercase text-slate-300 font-semibold"
                    >
                      {t.contact.formEmail}
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="ronen@example.com"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-base text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="contact-phone"
                      className="block font-mono uppercase text-slate-300 font-semibold"
                    >
                      {t.contact.formPhone}
                    </label>
                    <input
                      id="contact-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="055-507-1307"
                      dir="ltr"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-base text-white focus:outline-none focus:border-sky-500 text-left rtl:text-right"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-subject"
                    className="block font-mono uppercase text-slate-300 font-semibold"
                  >
                    {t.contact.formSubject}
                  </label>
                  <select
                    id="contact-subject"
                    name="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-base text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="General Question">{t.contact.subjectGeneral}</option>
                    <option value="Pilot Assessment Screening">{t.contact.subjectTraining}</option>
                    <option value="Corporate Offsite">{t.contact.subjectCorporate}</option>
                    <option value="Gift Voucher Support">{t.contact.subjectVoucher}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-message"
                    className="block font-mono uppercase text-slate-300 font-semibold"
                  >
                    {t.contact.formMessage}
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={t.contact.formMessagePlaceholder}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-base text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <Button type="submit" size="md" isLoading={isSubmitting} className="w-full font-bold">
                  <Send aria-hidden="true" className="w-4 h-4" />
                  <span>{isSubmitting ? t.contact.formSending : t.contact.formSubmit}</span>
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
