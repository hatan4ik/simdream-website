'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, HeartHandshake, MessageCircle, ShieldCheck, Users } from 'lucide-react';
import { getLocalizedPackages, type LocalizedRecord } from '@/lib/i18n/translations';
import { useLanguage } from '@/lib/i18n/language-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

const FEAR_OF_FLYING_PACKAGE_ID = 'pkg-fear-of-flying-90';

interface FearCopy {
  badge: string;
  title: string;
  subtitle: string;
  ctaBook: string;
  ctaHow: string;
  reassurance: [string, string, string];
  stepsTitle: string;
  stepsSubtitle: string;
  steps: Array<{ title: string; desc: string }>;
  includedTitle: string;
  perSession: string;
  minutes: (count: number) => string;
  companion: string;
  guideTitle: string;
  guideDesc: string;
  honesty: string;
  finalTitle: string;
  finalDesc: string;
}

// One calm, single-choice page: an anxious visitor is never asked to compare packages (AGENTS.md §3).
// Copy describes coaching and exposure in a safe environment; it promises no cure or permanent result.
const FEAR_COPY: LocalizedRecord<FearCopy> = {
  en: {
    badge: 'FEAR OF FLYING • ONE GENTLE SESSION',
    title: 'Understand the aircraft. Take back the controls.',
    subtitle:
      'A private, unhurried session with an airline captain in a real Boeing 737 MAX cockpit. You learn what every sound and movement means, and you fly at your own pace. Nothing happens without your say-so.',
    ctaBook: 'Book the session',
    ctaHow: 'How it works',
    reassurance: ['Private 1-on-1 with a patient captain', 'Stop or pause at any moment', 'Bring someone you trust'],
    stepsTitle: 'What the session looks like',
    stepsSubtitle: 'Three quiet stages, led by a captain who has flown with many nervous passengers.',
    steps: [
      {
        title: 'A conversation first',
        desc: 'About fifteen minutes seated together. You say what worries you; the captain explains turbulence, engine sounds, bumps and the systems that keep an airliner safe.',
      },
      {
        title: 'Into the cockpit, at your pace',
        desc: 'You sit in the captain’s seat. Nothing moves until you are ready. You can watch, ask, touch the controls or fly a short approach yourself.',
      },
      {
        title: 'A calm debrief',
        desc: 'What you felt, what you now know, and simple techniques to carry onto your next real flight. You leave with a workbook and relaxation audio.',
      },
    ],
    includedTitle: 'What is included',
    perSession: 'per session',
    minutes: (count) => `${count} minutes in the cockpit, plus a 15-minute conversation`,
    companion: 'A spouse, family member or friend is welcome to sit in with you.',
    guideTitle: 'Who guides you',
    guideDesc:
      'Real airline pilots who fly the Boeing 737 for a living. They have explained the same sounds and sensations to many anxious passengers, and they know the difference between a normal noise and a real problem, because that judgement is their job.',
    honesty:
      'This is aviation coaching in a safe simulator, not medical or psychological treatment. Many visitors tell us the facts and the hands-on time changed how they feel about flying; how much it helps you is yours to discover.',
    finalTitle: 'Your next flight can feel different.',
    finalDesc: 'Choose a quiet time slot. The captain confirms the plan with you before you arrive.',
  },
  he: {
    badge: 'חרדת טיסה • מפגש אחד ורגוע',
    title: 'להבין את המטוס. לקחת בחזרה את ההגאים.',
    subtitle:
      'מפגש פרטי ולא לחוץ עם קברניט חברת תעופה בתא טייס אמיתי של בואינג 737 מקס. לומדים מה המשמעות של כל צליל ותנועה, וטסים בקצב שלכם. שום דבר לא קורה בלי אישורכם.',
    ctaBook: 'הזמנת המפגש',
    ctaHow: 'איך זה עובד',
    reassurance: ['מפגש פרטי אחד על אחד עם קברניט סבלני', 'אפשר לעצור או להשהות בכל רגע', 'אפשר להביא אדם שאתם סומכים עליו'],
    stepsTitle: 'איך נראה המפגש',
    stepsSubtitle: 'שלושה שלבים שקטים, בהובלת קברניט שטס עם נוסעים חששנים רבים.',
    steps: [
      {
        title: 'קודם כול שיחה',
        desc: 'כרבע שעה בישיבה משותפת. אתם מספרים מה מדאיג אתכם; הקברניט מסביר על כיסי אוויר, צלילי מנוע, רעידות ועל המערכות ששומרות על בטיחות המטוס.',
      },
      {
        title: 'אל תא הטייס, בקצב שלכם',
        desc: 'אתם מתיישבים בכיסא הקברניט. שום דבר לא זז עד שתהיו מוכנים. אפשר להתבונן, לשאול, לגעת בהגאים או לטוס גישה קצרה בעצמכם.',
      },
      {
        title: 'סיכום רגוע',
        desc: 'מה הרגשתם, מה אתם יודעים עכשיו, וטכניקות פשוטות לטיסה האמיתית הבאה. יוצאים עם חוברת עבודה והקלטת הרפיה.',
      },
    ],
    includedTitle: 'מה כלול',
    perSession: 'למפגש',
    minutes: (count) => `${count} דקות בתא הטייס, בתוספת שיחה של 15 דקות`,
    companion: 'בן או בת זוג, בן משפחה או חבר מוזמנים לשבת איתכם.',
    guideTitle: 'מי מלווה אתכם',
    guideDesc:
      'טייסי חברות תעופה אמיתיים שטסים בבואינג 737 למחייתם. הם הסבירו את אותם צלילים ותחושות לנוסעים חששנים רבים, והם יודעים להבדיל בין רעש רגיל לבעיה אמיתית, כי זו העבודה שלהם.',
    honesty:
      'זהו אימון תעופתי בסימולטור בטוח, לא טיפול רפואי או פסיכולוגי. מבקרים רבים מספרים לנו שהעובדות והזמן על ההגאים שינו את ההרגשה שלהם לגבי טיסה; כמה זה יעזור לכם, זה משהו שתגלו בעצמכם.',
    finalTitle: 'הטיסה הבאה שלכם יכולה להרגיש אחרת.',
    finalDesc: 'בחרו שעה שקטה. הקברניט מאשר איתכם את התוכנית לפני שתגיעו.',
  },
  ru: {
    badge: 'АЭРОФОБИЯ • ОДНО СПОКОЙНОЕ ЗАНЯТИЕ',
    title: 'Понять самолёт. Вернуть себе управление.',
    subtitle:
      'Частное, неторопливое занятие с командиром авиалайнера в настоящей кабине Boeing 737 MAX. Вы узнаёте, что означает каждый звук и каждое движение, и летите в своём темпе. Ничего не происходит без вашего согласия.',
    ctaBook: 'Записаться на занятие',
    ctaHow: 'Как это проходит',
    reassurance: ['Индивидуально, с терпеливым командиром', 'Остановка или пауза в любой момент', 'Можно прийти с близким человеком'],
    stepsTitle: 'Как проходит занятие',
    stepsSubtitle: 'Три спокойных этапа под руководством командира, летавшего со многими тревожными пассажирами.',
    steps: [
      {
        title: 'Сначала разговор',
        desc: 'Около пятнадцати минут за столом. Вы рассказываете, что вас тревожит; командир объясняет турбулентность, звуки двигателей, толчки и системы, которые обеспечивают безопасность лайнера.',
      },
      {
        title: 'В кабину, в своём темпе',
        desc: 'Вы садитесь в кресло командира. Ничего не движется, пока вы не готовы. Можно наблюдать, спрашивать, касаться органов управления или самому выполнить короткий заход.',
      },
      {
        title: 'Спокойный разбор',
        desc: 'Что вы почувствовали, что теперь знаете, и простые техники для следующего настоящего полёта. Вы уходите с рабочей тетрадью и аудиозаписью для расслабления.',
      },
    ],
    includedTitle: 'Что входит',
    perSession: 'за занятие',
    minutes: (count) => `${count} минут в кабине плюс 15-минутный разговор`,
    companion: 'Супруг, член семьи или друг может присутствовать рядом с вами.',
    guideTitle: 'Кто вас сопровождает',
    guideDesc:
      'Действующие пилоты авиакомпаний, летающие на Boeing 737. Они объясняли те же звуки и ощущения многим тревожным пассажирам и отличают обычный шум от реальной проблемы, потому что это их работа.',
    honesty:
      'Это авиационный коучинг в безопасном симуляторе, а не медицинское или психологическое лечение. Многие гости говорят, что факты и время за штурвалом изменили их отношение к полётам; насколько это поможет вам, вы узнаете сами.',
    finalTitle: 'Ваш следующий полёт может ощущаться иначе.',
    finalDesc: 'Выберите спокойное время. Командир согласует с вами план до вашего прихода.',
  },
  fr: {
    badge: 'PEUR DE L’AVION • UNE SÉANCE EN DOUCEUR',
    title: 'Comprendre l’avion. Reprendre les commandes.',
    subtitle:
      'Une séance privée et sans hâte avec un commandant de bord, dans un vrai cockpit de Boeing 737 MAX. Vous apprenez ce que signifie chaque bruit et chaque mouvement, et vous volez à votre rythme. Rien ne se passe sans votre accord.',
    ctaBook: 'Réserver la séance',
    ctaHow: 'Comment ça se passe',
    reassurance: ['En tête-à-tête avec un commandant patient', 'Arrêt ou pause à tout moment', 'Venez avec une personne de confiance'],
    stepsTitle: 'Le déroulement de la séance',
    stepsSubtitle: 'Trois étapes calmes, menées par un commandant qui a volé avec de nombreux passagers anxieux.',
    steps: [
      {
        title: 'D’abord une conversation',
        desc: 'Une quinzaine de minutes assis ensemble. Vous dites ce qui vous inquiète ; le commandant explique les turbulences, les bruits de moteur, les secousses et les systèmes qui assurent la sécurité d’un avion de ligne.',
      },
      {
        title: 'Dans le cockpit, à votre rythme',
        desc: 'Vous prenez le siège du commandant. Rien ne bouge avant que vous soyez prêt. Vous pouvez observer, poser des questions, toucher les commandes ou effectuer vous-même une courte approche.',
      },
      {
        title: 'Un débriefing posé',
        desc: 'Ce que vous avez ressenti, ce que vous savez désormais, et des techniques simples pour votre prochain vol réel. Vous repartez avec un cahier d’exercices et un audio de relaxation.',
      },
    ],
    includedTitle: 'Ce qui est inclus',
    perSession: 'par séance',
    minutes: (count) => `${count} minutes dans le cockpit, plus 15 minutes de conversation`,
    companion: 'Conjoint, membre de la famille ou ami : une personne peut rester à vos côtés.',
    guideTitle: 'Qui vous accompagne',
    guideDesc:
      'De vrais pilotes de ligne qui volent sur Boeing 737 au quotidien. Ils ont expliqué les mêmes bruits et sensations à de nombreux passagers anxieux, et ils distinguent un bruit normal d’un vrai problème : c’est leur métier.',
    honesty:
      'Il s’agit d’un accompagnement aéronautique dans un simulateur sûr, et non d’un traitement médical ou psychologique. Beaucoup de visiteurs nous disent que les faits et le temps aux commandes ont changé leur rapport au vol ; ce que cela vous apportera, c’est à vous de le découvrir.',
    finalTitle: 'Votre prochain vol peut être différent.',
    finalDesc: 'Choisissez un créneau calme. Le commandant confirme le programme avec vous avant votre venue.',
  },
  ar: {
    badge: 'الخوف من الطيران • جلسة واحدة هادئة',
    title: 'افهم الطائرة. استعد السيطرة.',
    subtitle:
      'جلسة خاصة من دون عجلة مع قبطان طيران مدني في قمرة قيادة حقيقية لطائرة بوينغ 737 ماكس. تتعرف على معنى كل صوت وكل حركة، وتطير بالوتيرة التي تناسبك. لا يحدث شيء من دون موافقتك.',
    ctaBook: 'احجز الجلسة',
    ctaHow: 'كيف تجري الجلسة',
    reassurance: ['جلسة فردية مع قبطان صبور', 'يمكنك التوقف أو الاستراحة في أي لحظة', 'أحضر شخصًا تثق به'],
    stepsTitle: 'كيف تبدو الجلسة',
    stepsSubtitle: 'ثلاث مراحل هادئة بقيادة قبطان طار مع كثير من الركاب القلقين.',
    steps: [
      {
        title: 'حديث أولًا',
        desc: 'نحو خمس عشرة دقيقة جلوسًا معًا. تقول ما يقلقك، ويشرح القبطان المطبات الهوائية وأصوات المحركات والاهتزازات والأنظمة التي تحافظ على سلامة الطائرة.',
      },
      {
        title: 'إلى قمرة القيادة بوتيرتك',
        desc: 'تجلس في مقعد القبطان. لا يتحرك شيء قبل أن تكون مستعدًا. يمكنك المشاهدة أو السؤال أو لمس أدوات التحكم أو تنفيذ اقتراب قصير بنفسك.',
      },
      {
        title: 'مراجعة هادئة',
        desc: 'ما شعرت به، وما تعرفه الآن، وتقنيات بسيطة لرحلتك الحقيقية التالية. تغادر ومعك كتيب تمارين وتسجيل صوتي للاسترخاء.',
      },
    ],
    includedTitle: 'ما الذي تتضمنه الجلسة',
    perSession: 'للجلسة',
    minutes: (count) => `${count} دقيقة في قمرة القيادة، إضافة إلى حديث مدته 15 دقيقة`,
    companion: 'يمكن للزوج أو أحد أفراد العائلة أو صديق أن يجلس معك.',
    guideTitle: 'من يرافقك',
    guideDesc:
      'طيارون حقيقيون في شركات طيران يقودون بوينغ 737 في عملهم اليومي. شرحوا الأصوات والأحاسيس نفسها لكثير من الركاب القلقين، ويميزون بين الصوت الطبيعي والمشكلة الحقيقية، لأن ذلك عملهم.',
    honesty:
      'هذا تدريب طيران في جهاز محاكاة آمن، وليس علاجًا طبيًا أو نفسيًا. يخبرنا كثير من الزوار أن المعلومات والوقت خلف أدوات التحكم غيّرا إحساسهم بالطيران؛ ومدى ما سيفيدك ذلك أمر تكتشفه بنفسك.',
    finalTitle: 'رحلتك التالية يمكن أن تكون مختلفة.',
    finalDesc: 'اختر وقتًا هادئًا. يؤكد القبطان الخطة معك قبل وصولك.',
  },
  es: {
    badge: 'MIEDO A VOLAR • UNA SESIÓN TRANQUILA',
    title: 'Entender el avión. Recuperar los mandos.',
    subtitle:
      'Una sesión privada y sin prisas con un capitán de aerolínea en una cabina real de Boeing 737 MAX. Aprendes qué significa cada sonido y cada movimiento, y vuelas a tu ritmo. Nada ocurre sin tu consentimiento.',
    ctaBook: 'Reservar la sesión',
    ctaHow: 'Cómo funciona',
    reassurance: ['Sesión individual con un capitán paciente', 'Parar o hacer una pausa en cualquier momento', 'Ven con alguien de confianza'],
    stepsTitle: 'Cómo es la sesión',
    stepsSubtitle: 'Tres etapas tranquilas, guiadas por un capitán que ha volado con muchos pasajeros nerviosos.',
    steps: [
      {
        title: 'Primero, una conversación',
        desc: 'Unos quince minutos sentados juntos. Cuentas qué te preocupa; el capitán explica las turbulencias, los sonidos de los motores, las sacudidas y los sistemas que mantienen seguro un avión comercial.',
      },
      {
        title: 'A la cabina, a tu ritmo',
        desc: 'Te sientas en el asiento del capitán. Nada se mueve hasta que estés listo. Puedes observar, preguntar, tocar los mandos o volar tú mismo una aproximación corta.',
      },
      {
        title: 'Un repaso sereno',
        desc: 'Qué sentiste, qué sabes ahora y técnicas sencillas para tu próximo vuelo real. Te llevas un cuaderno de trabajo y un audio de relajación.',
      },
    ],
    includedTitle: 'Qué incluye',
    perSession: 'por sesión',
    minutes: (count) => `${count} minutos en la cabina, más una conversación de 15 minutos`,
    companion: 'Tu pareja, un familiar o un amigo puede acompañarte durante la sesión.',
    guideTitle: 'Quién te acompaña',
    guideDesc:
      'Pilotos de aerolínea reales que vuelan el Boeing 737 a diario. Han explicado los mismos sonidos y sensaciones a muchos pasajeros ansiosos y distinguen un ruido normal de un problema real, porque ese es su trabajo.',
    honesty:
      'Esto es acompañamiento aeronáutico en un simulador seguro, no un tratamiento médico ni psicológico. Muchos visitantes nos cuentan que los datos y el tiempo a los mandos cambiaron su forma de sentir el vuelo; cuánto te ayude a ti es algo que descubrirás por tu cuenta.',
    finalTitle: 'Tu próximo vuelo puede sentirse distinto.',
    finalDesc: 'Elige una hora tranquila. El capitán confirma el plan contigo antes de tu visita.',
  },
};

const STEP_ICONS = [MessageCircle, HeartHandshake, ShieldCheck] as const;

export function FearOfFlyingView() {
  const { language, isRTL } = useLanguage();
  const copy = FEAR_COPY[language] || FEAR_COPY.en;
  const pkg = getLocalizedPackages(language).find((candidate) => candidate.id === FEAR_OF_FLYING_PACKAGE_ID);
  const bookHref = `/book?package=${pkg?.slug ?? 'fear-of-flying-course'}`;

  return (
    <div className="flex-1 w-full min-w-0 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-16 sm:space-y-20">
      {/* 1. CALM HERO: one message, one action */}
      <section className="text-center max-w-3xl mx-auto space-y-6 sm:space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/15 border border-sky-500/40 text-xs font-mono text-sky-300 font-bold">
          <HeartHandshake className="w-4 h-4 text-sky-400" />
          <span>{copy.badge}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">{copy.title}</h1>

        <p className="text-slate-300 text-base sm:text-lg leading-relaxed">{copy.subtitle}</p>

        <div className="flex flex-row flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2">
          <Link href={bookHref}>
            <Button size="lg">{copy.ctaBook}</Button>
          </Link>
          <a href="#how-it-works">
            <Button variant="outline" size="lg">
              {copy.ctaHow}
            </Button>
          </a>
        </div>

        <ul className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 text-left rtl:text-right">
          {copy.reassurance.map((item) => (
            <li
              key={item}
              className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 flex items-center gap-2.5 text-xs sm:text-sm text-slate-200 font-semibold leading-tight"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 2. THE SESSION, STEP BY STEP */}
      <section id="how-it-works" className="space-y-8 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">{copy.stepsTitle}</h2>
          <p className="text-slate-400 text-sm sm:text-base">{copy.stepsSubtitle}</p>
        </div>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {copy.steps.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? ShieldCheck;
            return (
              <li key={step.title}>
                <Card className="h-full p-5 sm:p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-sky-500/15 border border-sky-500/40 text-sky-300 font-mono font-bold flex items-center justify-center text-sm">
                      {index + 1}
                    </span>
                    <Icon className="w-5 h-5 text-sky-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{step.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{step.desc}</p>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      {/* 3. THE ONE PACKAGE: catalogue-authoritative price, duration and inclusions */}
      {pkg && (
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <Card className="lg:col-span-3 p-6 sm:p-8 space-y-5">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">{pkg.title}</h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{pkg.description}</p>
            </div>
            <h3 className="text-sm font-mono font-bold text-sky-300 uppercase tracking-wide">{copy.includedTitle}</h3>
            <ul className="space-y-2.5">
              {pkg.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="lg:col-span-2 p-6 sm:p-8 space-y-5 border-sky-500/30">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white" dir="ltr">
                {formatCurrency(pkg.priceIls)}
              </span>
              <span className="text-sm text-slate-400">{copy.perSession}</span>
            </div>
            <ul className="space-y-3 text-sm text-slate-200">
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>{copy.minutes(pkg.durationMinutes)}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Users className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>{copy.companion}</span>
              </li>
            </ul>
            <Link href={bookHref} className="block">
              <Button size="lg" className="w-full">
                {copy.ctaBook}
              </Button>
            </Link>
          </Card>
        </section>
      )}

      {/* 4. WHO GUIDES YOU + HONEST SCOPE */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 sm:p-8 space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-white">{copy.guideTitle}</h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{copy.guideDesc}</p>
        </Card>
        <Card className="p-6 sm:p-8 space-y-3 border-slate-700">
          <ShieldCheck className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{copy.honesty}</p>
        </Card>
      </section>

      {/* 5. FINAL CTA */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left rtl:md:text-right">
          <h2 className="text-xl sm:text-2xl font-bold text-white">{copy.finalTitle}</h2>
          <p className="text-slate-400 text-sm">{copy.finalDesc}</p>
        </div>
        <Link href={bookHref} className="w-full md:w-auto">
          <Button size="lg" className="w-full md:w-auto">
            {copy.ctaBook}
            <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </Link>
      </section>
    </div>
  );
}
