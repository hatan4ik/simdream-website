import type { LocalizedRecord } from '@/lib/i18n/translations';

export const DURATION_OPTION_SUBTITLES: LocalizedRecord<{ training: string; fearOfFlying: string; discovery: string }> = {
  en: {
    training: 'Airline assessment preparation',
    fearOfFlying: 'Calm captain-led coaching',
    discovery: 'Guided Discovery Mission',
  },
  he: {
    training: 'הכנה למבדקי חברת תעופה',
    fearOfFlying: 'ליווי רגוע עם קברניט',
    discovery: 'משימת היכרות מודרכת',
  },
  ru: {
    training: 'Подготовка к отбору в авиакомпанию',
    fearOfFlying: 'Спокойная сессия с капитаном',
    discovery: 'Ознакомительная миссия с инструктором',
  },
  fr: {
    training: 'Préparation aux évaluations aériennes',
    fearOfFlying: 'Accompagnement serein avec un commandant',
    discovery: 'Mission découverte guidée',
  },
  ar: {
    training: 'تحضير لتقييمات شركات الطيران',
    fearOfFlying: 'تدريب هادئ بإشراف كابتن',
    discovery: 'مهمة استكشافية بإرشاد مدرب',
  },
  de: {
    training: 'Airline-Assessment-Vorbereitung',
    fearOfFlying: 'Ruhiges Coaching mit Flugkapitän',
    discovery: 'Geführte Entdeckermission',
  },
};
