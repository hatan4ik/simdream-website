import type { LocalizedRecord } from '@/lib/i18n/translations';

export interface FearCopy {
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
export const FEAR_COPY: LocalizedRecord<FearCopy> = {
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
  de: {
    badge: 'FLUGANGST • EINE RUHIGE SESSION',
    title: 'Das Flugzeug verstehen. Die Kontrolle zurückgewinnen.',
    subtitle:
      'Eine private, ruhige Session mit einem Verkehrspiloten in einem echten Boeing 737 MAX Cockpit. Sie erfahren, was jedes Geräusch und jede Bewegung bedeutet, und fliegen in Ihrem eigenen Tempo. Nichts geschieht ohne Ihre Zustimmung.',
    ctaBook: 'Session buchen',
    ctaHow: 'So funktioniert es',
    reassurance: [
      '1-zu-1 mit einem geduldigen Flugkapitän',
      'Jederzeit pausieren oder stoppen',
      'Bringen Sie eine vertraute Person mit',
    ],
    stepsTitle: 'So läuft die Session ab',
    stepsSubtitle: 'Drei ruhige Schritte, begleitet von einem Kapitän mit viel Erfahrung mit nervösen Passagieren.',
    steps: [
      {
        title: 'Zuerst ein Gespräch',
        desc: 'Etwa fünfzehn Minuten zusammensitzen. Sie erzählen, was Ihnen Sorgen bereitet; der Kapitän erklärt Turbulenzen, Triebwerksgeräusche, Bewegungen und die Systeme, die ein Verkehrsflugzeug sicher machen.',
      },
      {
        title: 'Ins Cockpit, in Ihrem Tempo',
        desc: 'Sie nehmen auf dem Kapitänssitz Platz. Nichts bewegt sich, bis Sie bereit sind. Sie können beobachten, Fragen stellen, die Steuerorgane berühren oder selbst einen kurzen Anflug fliegen.',
      },
      {
        title: 'Ein ruhiger Abschluss',
        desc: 'Was sich verändert hat, was Sie jetzt wissen und einfache Techniken für Ihren nächsten echten Flug. Ein Arbeitsbuch und ein Entspannungs-Audio nehmen Sie mit nach Hause.',
      },
    ],
    includedTitle: 'Das ist enthalten',
    perSession: 'pro Session',
    minutes: (count) => `${count} Minuten im Cockpit, plus 15 Minuten Vorgespräch`,
    companion: 'Ihr Partner, ein Familienmitglied oder ein Freund kann während der gesamten Session dabei sein.',
    guideTitle: 'Wer Sie begleitet',
    guideDesc:
      'Echte Verkehrspiloten, die täglich die Boeing 737 fliegen. Sie haben genau diese Geräusche und Gefühle schon vielen nervösen Fluggästen erklärt – und wissen beruflich bedingt genau, was normal ist.',
    honesty:
      'Dies ist ein fliegerisches Coaching in einem sicheren Simulator, keine medizinische oder psychologische Behandlung. Viele Besucher berichten, dass das Wissen und die Zeit am Steuer ihr Gefühl beim Fliegen verändert haben; wie stark es Ihnen hilft, erleben Sie selbst.',
    finalTitle: 'Ihr nächster Flug kann sich anders anfühlen.',
    finalDesc: 'Wählen Sie eine ruhige Zeit. Der Kapitän stimmt den Ablauf vor Ihrem Besuch mit Ihnen ab.',
  },
};
