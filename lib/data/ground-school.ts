import type { Language, LocalizedRecord } from '@/lib/i18n/translations';
import type { GroundSchoolModality, GroundSchoolPathway } from '@/types';

/**
 * Customer-facing Ground School offer. This is deliberately separate from
 * SIMULATOR_PACKAGES: it is a cohort-based theory/oral-preparation programme,
 * not a simulator slot that can be scheduled through /book.
 *
 * The owner supplied USD 1,200. Israeli consumer price presentation requires
 * the public, total price to be presented in NIS, so the approved public price
 * is stored here in the currency actually displayed and collected.
 */
export const GROUND_SCHOOL_TUITION_ILS = 3_806;

export type { GroundSchoolModality, GroundSchoolPathway } from '@/types';

export interface GroundSchoolCopy {
  navLabel: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  overviewBadge: string;
  overviewTitle: string;
  overview: string;
  advantagesTitle: string;
  advantages: Array<{ title: string; description: string }>;
  scheduleBadge: string;
  scheduleTitle: string;
  scheduleSubtitle: string;
  modules: Array<{ week: string; title: string; description: string }>;
  supportTitle: string;
  supportDescription: string;
  formatTitle: string;
  formatItems: string[];
  tuitionLabel: string;
  tuitionDetail: string;
  requestTitle: string;
  requestDescription: string;
  formName: string;
  formEmail: string;
  formPhone: string;
  formPathway: string;
  formModality: string;
  formFocus: string;
  formFocusPlaceholder: string;
  formConsent: string;
  formSubmit: string;
  formSubmitting: string;
  formSuccessTitle: string;
  formSuccessDescription: string;
  formError: string;
  pathwayOptions: Record<GroundSchoolPathway, string>;
  modalityOptions: Record<GroundSchoolModality, string>;
  disclosureTitle: string;
  disclosure: string;
}

export const GROUND_SCHOOL_COPY: LocalizedRecord<GroundSchoolCopy> = {
  en: {
    navLabel: 'Ground School',
    heroBadge: 'PROFESSIONAL TRAINING · FAA / EASA THEORY PREPARATION',
    heroTitle: 'Ground School for FAA & EASA Theory and Oral Preparation',
    heroSubtitle:
      'An instructor-led monthly intensive for candidates who want structured theory study, focused oral-exam practice, and a practical plan from Israel—online, in person, or hybrid.',
    heroCta: 'Request Ground School Enrollment',
    overviewBadge: 'STUDY FROM ISRAEL',
    overviewTitle: 'Build Exam Readiness Without Building an Overseas Routine',
    overview:
      'For candidates whose pathway requires FAA or EASA theory, a local study programme can reduce avoidable travel, accommodation, rental-car, and waiting-time costs associated with arranging a separate US or European course. The training starts with your target pathway and difficult topics, then turns them into a realistic monthly study plan.',
    advantagesTitle: 'Why Candidates Choose This Format',
    advantages: [
      {
        title: 'A Domestic Study Base',
        description: 'Learn from Israel in person, online, or as a hybrid programme instead of planning routine trips abroad for theory coaching.',
      },
      {
        title: 'Focused 1:1 Support',
        description: 'Bring the subjects that slow you down—weather, regulations, performance, navigation, systems, or oral scenarios—and work them through with an instructor.',
      },
      {
        title: 'Goal-First Mentoring',
        description: 'Your plan is shaped around the licence pathway, exam timetable, learning style, and budget decisions you are actually making.',
      },
      {
        title: 'Theory Connected to Practice',
        description: 'Use aviation examples and structured oral practice to turn isolated facts into clear explanations and safer decision-making.',
      },
    ],
    scheduleBadge: 'MONTHLY INTENSIVE COHORT',
    scheduleTitle: 'A Four-Week Intensive Study Sequence',
    scheduleSubtitle:
      'Each cohort follows this study sequence. The coordinator confirms the next cohort dates, time zone, instructor, capacity, and online/in-person mix before enrollment is accepted.',
    modules: [
      { week: 'Week 1', title: 'Diagnostic & Core Principles', description: 'Confirm your target pathway, identify knowledge gaps, and build a focused study plan around regulations, aerodynamics, and aircraft systems.' },
      { week: 'Week 2', title: 'Weather, Navigation & Flight Planning', description: 'Work through meteorology, charts, performance planning, navigation logic, and the decisions behind the correct answer.' },
      { week: 'Week 3', title: 'Performance, Operations & Weak Topics', description: 'Revisit the topics that cost you time or confidence, using guided problem solving and individual support where it matters most.' },
      { week: 'Week 4', title: 'Oral Practice & Next-Step Plan', description: 'Practise explaining concepts aloud, receive targeted feedback, and leave with a personal revision plan for your official examination.' },
    ],
    supportTitle: 'Help Where the Material Gets Difficult',
    supportDescription:
      'The programme includes targeted 1:1 support for difficult topics and oral-answer structure. Your instructor helps you explain what you know, identify what needs more work, and prepare a plan you can follow.',
    formatTitle: 'Delivery Options',
    formatItems: ['Online live sessions', 'In-person learning in Tel Aviv', 'Hybrid plan arranged with the coordinator'],
    tuitionLabel: 'Ground School Tuition',
    tuitionDetail: 'Total tuition shown in Israeli shekels. Enrollment request does not take payment or reserve a seat.',
    requestTitle: 'Request Enrollment Details',
    requestDescription: 'Tell the training coordinator which pathway and study format you need. You will receive the next available cohort details before any enrollment or payment is confirmed.',
    formName: 'Full Name',
    formEmail: 'Email',
    formPhone: 'Phone / WhatsApp',
    formPathway: 'Theory Pathway',
    formModality: 'Preferred Format',
    formFocus: 'Topics You Want Help With',
    formFocusPlaceholder: 'For example: weather charts, performance calculations, regulations, oral-answer practice…',
    formConsent: 'I agree that Sim Dream may use these details to respond to my Ground School enrollment request, as described in the Privacy Policy.',
    formSubmit: 'Send Enrollment Request',
    formSubmitting: 'Sending…',
    formSuccessTitle: 'Enrollment Request Received',
    formSuccessDescription: 'The training coordinator will send the next cohort details before a seat or payment is confirmed.',
    formError: 'Your request could not be sent. Check the fields and try again.',
    pathwayOptions: { faa: 'FAA theory / oral preparation', easa: 'EASA theory / oral preparation', exploring: 'I am still choosing a pathway' },
    modalityOptions: { online: 'Online', in_person: 'In person in Tel Aviv', hybrid: 'Hybrid' },
    disclosureTitle: 'Important Programme Disclosure',
    disclosure:
      'Ground School is independent educational coaching and exam preparation. It is not an FAA- or EASA-approved school, does not issue a licence, rating, official training credit, or examination result, and does not guarantee that any candidate will pass an external theory or oral examination. Instructor credentials and the final cohort plan are confirmed before enrollment.',
  },
  he: {
    navLabel: 'לימודי קרקע',
    heroBadge: 'הדרכה מקצועית · הכנה לתיאוריה ולמבחן בעל-פה FAA / EASA',
    heroTitle: 'לימודי קרקע להכנה לתיאוריה ולמבחן בעל-פה של FAA ו-EASA',
    heroSubtitle:
      'מסלול חודשי אינטנסיבי בהנחיית מדריך למועמדים שרוצים לימודי תיאוריה מסודרים, תרגול ממוקד למבחן בעל-פה ותכנית עבודה מעשית מישראל — אונליין, פרונטלי או משולב.',
    heroCta: 'בקשת פרטי הרשמה ללימודי קרקע',
    overviewBadge: 'לומדים מישראל',
    overviewTitle: 'מתכוננים למבחן בלי לבנות שגרה בחו״ל',
    overview:
      'למועמדים שמסלולם דורש תיאוריה של FAA או EASA, תכנית לימודים מקומית יכולה לצמצם נסיעות, לינה, רכב שכור וזמן המתנה הכרוכים בהסדרת קורס נפרד בארצות הברית או באירופה. הלימוד מתחיל במסלול שלכם ובנושאים המאתגרים אתכם, ומתרגם אותם לתכנית חודשית מציאותית.',
    advantagesTitle: 'למה מועמדים בוחרים בפורמט הזה',
    advantages: [
      { title: 'בסיס לימודים מקומי', description: 'לומדים מישראל בפרונטלי, אונליין או במסלול משולב, בלי לתכנן נסיעות שוטפות לחו״ל לצורך הדרכת תיאוריה.' },
      { title: 'תמיכה אישית בנושאים מאתגרים', description: 'מביאים את הנושאים שמעכבים אתכם — מזג אוויר, תקנות, ביצועים, ניווט, מערכות או תרחישים בעל-פה — ועובדים עליהם עם מדריך.' },
      { title: 'ליווי שמתחיל במטרה', description: 'התכנית נבנית סביב מסלול הרישוי, לוח המבחנים, סגנון הלמידה והחלטות התקציב שבאמת עומדות בפניכם.' },
      { title: 'מחברים תיאוריה לפרקטיקה', description: 'דוגמאות תעופתיות ותרגול בעל-פה הופכים עובדות בודדות להסברים ברורים ולקבלת החלטות בטוחה יותר.' },
    ],
    scheduleBadge: 'מחזור חודשי אינטנסיבי',
    scheduleTitle: 'רצף לימודי אינטנסיבי של ארבעה שבועות',
    scheduleSubtitle: 'כל מחזור פועל לפי הרצף הזה. המתאם מאשר את מועדי המחזור הבא, אזור הזמן, המדריך, מספר המקומות והשילוב בין אונליין לפרונטלי לפני קבלת ההרשמה.',
    modules: [
      { week: 'שבוע 1', title: 'אבחון ועקרונות יסוד', description: 'מגדירים את המסלול, מזהים פערי ידע ובונים תכנית לימוד ממוקדת סביב תקנות, אווירודינמיקה ומערכות מטוס.' },
      { week: 'שבוע 2', title: 'מזג אוויר, ניווט ותכנון טיסה', description: 'עובדים על מטאורולוגיה, מפות, תכנון ביצועים, לוגיקת ניווט וההחלטות שמאחורי התשובה הנכונה.' },
      { week: 'שבוע 3', title: 'ביצועים, תפעול ונושאים חלשים', description: 'חוזרים לנושאים שגוזלים זמן או ביטחון בעזרת פתרון בעיות מודרך ותמיכה אישית היכן שנחוץ.' },
      { week: 'שבוע 4', title: 'תרגול בעל-פה ותכנית המשך', description: 'מתרגלים הסבר של מושגים בקול, מקבלים משוב ממוקד ויוצאים עם תכנית חזרה אישית לקראת הבחינה הרשמית.' },
    ],
    supportTitle: 'עזרה בדיוק במקום שבו החומר נהיה קשה',
    supportDescription: 'התכנית כוללת תמיכה אישית בנושאים מאתגרים ובמבנה התשובה בעל-פה. המדריך עוזר לכם להסביר את מה שאתם יודעים, לזהות מה דורש עוד עבודה ולבנות תכנית שאפשר לבצע.',
    formatTitle: 'אפשרויות למידה',
    formatItems: ['שיעורים חיים אונליין', 'לימוד פרונטלי בתל אביב', 'מסלול משולב בתיאום עם המתאם'],
    tuitionLabel: 'שכר לימוד ללימודי קרקע',
    tuitionDetail: 'המחיר הכולל מוצג בשקלים חדשים. בקשת ההרשמה אינה כוללת תשלום ואינה שומרת מקום.',
    requestTitle: 'בקשת פרטי הרשמה',
    requestDescription: 'ספרו למתאם ההדרכה איזה מסלול ופורמט לימוד אתם צריכים. תקבלו את פרטי המחזור הבא לפני אישור הרשמה או תשלום.',
    formName: 'שם מלא', formEmail: 'דוא״ל', formPhone: 'טלפון / WhatsApp', formPathway: 'מסלול תיאוריה', formModality: 'פורמט מועדף', formFocus: 'נושאים שבהם תרצו עזרה', formFocusPlaceholder: 'לדוגמה: מפות מזג אוויר, חישובי ביצועים, תקנות, תרגול תשובות בעל-פה…',
    formConsent: 'אני מסכים/ה ש-Sim Dream תשתמש בפרטים אלה כדי להשיב לבקשת ההרשמה שלי ללימודי קרקע, כמפורט במדיניות הפרטיות.', formSubmit: 'שליחת בקשת הרשמה', formSubmitting: 'שולחים…', formSuccessTitle: 'בקשת ההרשמה התקבלה', formSuccessDescription: 'מתאם ההדרכה ישלח את פרטי המחזור הבא לפני אישור מקום או תשלום.', formError: 'לא ניתן היה לשלוח את הבקשה. בדקו את השדות ונסו שוב.',
    pathwayOptions: { faa: 'הכנה לתיאוריה / בעל-פה של FAA', easa: 'הכנה לתיאוריה / בעל-פה של EASA', exploring: 'עדיין בוחר/ת מסלול' }, modalityOptions: { online: 'אונליין', in_person: 'פרונטלי בתל אביב', hybrid: 'משולב' },
    disclosureTitle: 'גילוי חשוב על התכנית',
    disclosure: 'לימודי הקרקע הם ליווי חינוכי עצמאי והכנה לבחינות. הם אינם בית ספר מאושר של FAA או EASA, אינם מעניקים רישיון, הגדר, קרדיט הדרכה רשמי או תוצאת בחינה, ואינם מבטיחים מעבר של בחינה חיצונית בתיאוריה או בעל-פה. אישורי המדריך והתכנית הסופית של המחזור מאומתים לפני הרשמה.',
  },
  ru: {
    navLabel: 'Наземная школа', heroBadge: 'ПРОФЕССИОНАЛЬНАЯ ПОДГОТОВКА · ТЕОРИЯ И УСТНЫЙ ЭКЗАМЕН FAA / EASA', heroTitle: 'Наземная школа: подготовка к теории и устному экзамену FAA и EASA',
    heroSubtitle: 'Ежемесячный интенсив с инструктором для кандидатов, которым нужны системная теория, целевая подготовка к устному экзамену и практичный план обучения из Израиля — онлайн, очно или гибридно.', heroCta: 'Запросить условия зачисления в наземную школу',
    overviewBadge: 'ОБУЧЕНИЕ ИЗ ИЗРАИЛЯ', overviewTitle: 'Готовьтесь к экзамену без постоянной жизни за рубежом', overview: 'Для кандидатов, чей путь требует теории FAA или EASA, местная программа может сократить поездки, проживание, аренду автомобиля и время ожидания, связанные с отдельным курсом в США или Европе. Обучение начинается с вашей цели и сложных тем, затем превращает их в реалистичный месячный план.',
    advantagesTitle: 'Почему кандидаты выбирают этот формат', advantages: [
      { title: 'Учебная база в Израиле', description: 'Учитесь очно, онлайн или в гибридном формате без регулярных зарубежных поездок ради теоретического наставничества.' },
      { title: 'Точечная поддержка 1:1', description: 'Разберите темы, которые замедляют вас: погоду, правила, лётные характеристики, навигацию, системы или устные сценарии.' },
      { title: 'Наставничество от вашей цели', description: 'План строится вокруг лицензионного пути, графика экзаменов, вашего стиля обучения и реальных бюджетных решений.' },
      { title: 'Теория, связанная с практикой', description: 'Авиационные примеры и структурированная устная практика превращают разрозненные факты в ясные объяснения.' },
    ],
    scheduleBadge: 'ЕЖЕМЕСЯЧНЫЙ ИНТЕНСИВ', scheduleTitle: 'Четырёхнедельная интенсивная программа', scheduleSubtitle: 'Каждый поток следует этой последовательности. Координатор подтверждает даты следующего потока, часовой пояс, инструктора, вместимость и сочетание онлайн/очного формата до подтверждения зачисления.',
    modules: [
      { week: 'Неделя 1', title: 'Диагностика и основы', description: 'Подтвердите путь подготовки, выявите пробелы и составьте план по правилам, аэродинамике и системам самолёта.' },
      { week: 'Неделя 2', title: 'Погода, навигация и планирование', description: 'Разберите метеорологию, карты, расчёт характеристик, навигацию и логику верного ответа.' },
      { week: 'Неделя 3', title: 'Характеристики, операции и слабые темы', description: 'Вернитесь к темам, которые отнимают время или уверенность, с пошаговым решением задач и индивидуальной помощью.' },
      { week: 'Неделя 4', title: 'Устная практика и следующий план', description: 'Практикуйте объяснение концепций вслух, получите целевой отзыв и личный план повторения перед официальным экзаменом.' },
    ],
    supportTitle: 'Помощь там, где материал становится сложным', supportDescription: 'Программа включает поддержку 1:1 по сложным темам и структуре устных ответов. Инструктор поможет объяснить то, что вы знаете, увидеть, что требует работы, и создать выполнимый план.', formatTitle: 'Форматы обучения', formatItems: ['Живые онлайн-занятия', 'Очное обучение в Тель-Авиве', 'Гибридный план с координатором'],
    tuitionLabel: 'Стоимость наземной школы', tuitionDetail: 'Полная стоимость указана в израильских шекелях. Запрос на зачисление не принимает оплату и не резервирует место.', requestTitle: 'Запросить детали зачисления', requestDescription: 'Сообщите координатору нужный путь и формат. Детали следующего потока придут до подтверждения зачисления или оплаты.',
    formName: 'Полное имя', formEmail: 'Электронная почта', formPhone: 'Телефон / WhatsApp', formPathway: 'Теоретический путь', formModality: 'Предпочтительный формат', formFocus: 'Темы, в которых нужна помощь', formFocusPlaceholder: 'Например: карты погоды, расчёты характеристик, правила, устные ответы…', formConsent: 'Я согласен/согласна, что Sim Dream может использовать эти данные для ответа на мой запрос о зачислении в наземную школу, как описано в Политике конфиденциальности.', formSubmit: 'Отправить запрос', formSubmitting: 'Отправка…', formSuccessTitle: 'Запрос получен', formSuccessDescription: 'Координатор направит детали следующего потока до подтверждения места или оплаты.', formError: 'Не удалось отправить запрос. Проверьте поля и повторите попытку.',
    pathwayOptions: { faa: 'Подготовка к теории / устному экзамену FAA', easa: 'Подготовка к теории / устному экзамену EASA', exploring: 'Я ещё выбираю путь' }, modalityOptions: { online: 'Онлайн', in_person: 'Очно в Тель-Авиве', hybrid: 'Гибридно' }, disclosureTitle: 'Важное раскрытие информации', disclosure: 'Наземная школа — независимое образовательное наставничество и подготовка к экзаменам. Это не одобренная FAA или EASA школа, она не выдаёт лицензию, квалификацию, официальный учебный зачёт или результат экзамена и не гарантирует сдачу внешнего теоретического или устного экзамена. Квалификация инструктора и окончательный план потока подтверждаются до зачисления.',
  },
  fr: {
    navLabel: 'École au sol', heroBadge: 'FORMATION PROFESSIONNELLE · THÉORIE ET ORAL FAA / EASA', heroTitle: 'École au sol : préparation à la théorie et à l’oral FAA et EASA',
    heroSubtitle: 'Un programme intensif mensuel accompagné par un instructeur pour les candidats qui souhaitent une théorie structurée, une préparation ciblée à l’oral et un plan d’étude pratique depuis Israël — en ligne, sur place ou hybride.', heroCta: 'Demander les modalités d’inscription',
    overviewBadge: 'ÉTUDIER DEPUIS ISRAËL', overviewTitle: 'Préparez votre examen sans organiser une routine à l’étranger', overview: 'Pour les candidats dont le parcours exige la théorie FAA ou EASA, un programme local peut réduire les trajets, l’hébergement, la location de voiture et les délais liés à un cours séparé aux États-Unis ou en Europe. La formation commence par votre objectif et vos sujets difficiles, puis les transforme en plan mensuel réaliste.',
    advantagesTitle: 'Pourquoi choisir ce format', advantages: [
      { title: 'Une base d’étude locale', description: 'Étudiez depuis Israël, sur place, en ligne ou en hybride, sans organiser des déplacements réguliers à l’étranger pour le tutorat théorique.' },
      { title: 'Un accompagnement ciblé 1:1', description: 'Travaillez les sujets qui vous freinent : météo, réglementation, performances, navigation, systèmes ou scénarios oraux.' },
      { title: 'Un mentorat orienté objectif', description: 'Votre plan est construit autour du parcours de licence, du calendrier d’examen, de votre façon d’apprendre et de vos choix budgétaires.' },
      { title: 'Relier théorie et pratique', description: 'Des exemples aéronautiques et une pratique orale structurée transforment des faits isolés en explications claires.' },
    ],
    scheduleBadge: 'COHORTE INTENSIVE MENSUELLE', scheduleTitle: 'Une séquence intensive sur quatre semaines', scheduleSubtitle: 'Chaque cohorte suit cette séquence. Le coordinateur confirme les dates, le fuseau horaire, l’instructeur, la capacité et le format avant toute inscription confirmée.',
    modules: [
      { week: 'Semaine 1', title: 'Diagnostic et fondamentaux', description: 'Confirmez votre parcours, identifiez les lacunes et construisez un plan ciblé autour de la réglementation, de l’aérodynamique et des systèmes.' },
      { week: 'Semaine 2', title: 'Météo, navigation et préparation', description: 'Travaillez la météorologie, les cartes, les performances, la logique de navigation et les décisions derrière la bonne réponse.' },
      { week: 'Semaine 3', title: 'Performances, opérations et sujets faibles', description: 'Revenez sur les sujets qui coûtent du temps ou de la confiance grâce à une résolution guidée et un soutien individuel.' },
      { week: 'Semaine 4', title: 'Pratique orale et plan de suite', description: 'Entraînez-vous à expliquer les notions à voix haute, recevez un retour ciblé et repartez avec un plan de révision personnel.' },
    ],
    supportTitle: 'Une aide là où la matière devient difficile', supportDescription: 'Le programme inclut un soutien individuel sur les sujets difficiles et la structure des réponses orales. Votre instructeur vous aide à expliquer ce que vous savez, à repérer ce qui demande du travail et à suivre un plan concret.', formatTitle: 'Options de participation', formatItems: ['Sessions en direct en ligne', 'Formation en personne à Tel Aviv', 'Parcours hybride avec le coordinateur'],
    tuitionLabel: 'Frais de l’école au sol', tuitionDetail: 'Le prix total est affiché en shekels israéliens. La demande d’inscription ne prend pas de paiement et ne réserve pas de place.', requestTitle: 'Demander les détails d’inscription', requestDescription: 'Indiquez au coordinateur le parcours et le format souhaités. Vous recevrez les détails de la prochaine cohorte avant toute inscription ou paiement confirmé.',
    formName: 'Nom complet', formEmail: 'E-mail', formPhone: 'Téléphone / WhatsApp', formPathway: 'Parcours théorique', formModality: 'Format préféré', formFocus: 'Sujets sur lesquels vous souhaitez de l’aide', formFocusPlaceholder: 'Par exemple : cartes météo, calculs de performances, réglementation, réponses orales…', formConsent: 'J’accepte que Sim Dream utilise ces informations pour répondre à ma demande d’inscription à l’école au sol, comme indiqué dans la Politique de confidentialité.', formSubmit: 'Envoyer la demande', formSubmitting: 'Envoi…', formSuccessTitle: 'Demande reçue', formSuccessDescription: 'Le coordinateur communiquera les détails de la prochaine cohorte avant toute confirmation de place ou de paiement.', formError: 'Votre demande n’a pas pu être envoyée. Vérifiez les champs et réessayez.',
    pathwayOptions: { faa: 'Préparation théorie / oral FAA', easa: 'Préparation théorie / oral EASA', exploring: 'Je choisis encore mon parcours' }, modalityOptions: { online: 'En ligne', in_person: 'En personne à Tel Aviv', hybrid: 'Hybride' }, disclosureTitle: 'Information importante sur le programme', disclosure: 'L’école au sol est un accompagnement éducatif indépendant et une préparation aux examens. Elle n’est pas une école approuvée FAA ou EASA, ne délivre ni licence, ni qualification, ni crédit de formation officiel, ni résultat d’examen, et ne garantit pas la réussite à un examen théorique ou oral externe. Les qualifications de l’instructeur et le programme final de la cohorte sont confirmés avant l’inscription.',
  },
  ar: {
    navLabel: 'المدرسة الأرضية', heroBadge: 'تدريب احترافي · التحضير النظري والشفهي FAA / EASA', heroTitle: 'المدرسة الأرضية للتحضير للنظري والشفهي لدى FAA وEASA',
    heroSubtitle: 'برنامج شهري مكثف بإرشاد مدرب للمرشحين الذين يريدون دراسة نظرية منظمة وتدريباً مركزاً للاختبار الشفهي وخطة عملية من إسرائيل — عبر الإنترنت أو حضورياً أو بنظام هجين.', heroCta: 'طلب تفاصيل التسجيل في المدرسة الأرضية',
    overviewBadge: 'الدراسة من إسرائيل', overviewTitle: 'استعد للاختبار من دون بناء روتين في الخارج', overview: 'للمرشحين الذين يتطلب مسارهم نظرية FAA أو EASA، يمكن للبرنامج المحلي أن يقلل السفر والإقامة وتأجير السيارات ووقت الانتظار المرتبط بدورة منفصلة في الولايات المتحدة أو أوروبا. يبدأ التدريب بهدفك والموضوعات الصعبة ثم يحولها إلى خطة شهرية واقعية.',
    advantagesTitle: 'لماذا يختار المرشحون هذا الشكل', advantages: [
      { title: 'قاعدة دراسة محلية', description: 'تعلم من إسرائيل حضورياً أو عبر الإنترنت أو بنظام هجين من دون رحلات خارجية منتظمة من أجل الإرشاد النظري.' },
      { title: 'دعم فردي مركز', description: 'اعمل على الموضوعات التي تبطئك: الطقس أو اللوائح أو الأداء أو الملاحة أو الأنظمة أو السيناريوهات الشفهية.' },
      { title: 'إرشاد يبدأ من هدفك', description: 'تُبنى خطتك حول مسار الترخيص وموعد الاختبار وأسلوب التعلم وقرارات الميزانية التي تواجهها فعلاً.' },
      { title: 'ربط النظرية بالممارسة', description: 'الأمثلة الجوية والتدريب الشفهي المنظم يحولان الحقائق المتفرقة إلى تفسيرات واضحة.' },
    ],
    scheduleBadge: 'دفعة شهرية مكثفة', scheduleTitle: 'تسلسل دراسي مكثف لأربعة أسابيع', scheduleSubtitle: 'تتبع كل دفعة هذا التسلسل. يؤكد المنسق تواريخ الدفعة التالية والمنطقة الزمنية والمدرب والسعة ومزيج الإنترنت والحضور قبل تأكيد التسجيل.',
    modules: [
      { week: 'الأسبوع 1', title: 'التشخيص والأسس', description: 'حدد مسارك واكتشف فجوات المعرفة وابنِ خطة مركزة حول اللوائح والديناميكا الهوائية وأنظمة الطائرة.' },
      { week: 'الأسبوع 2', title: 'الطقس والملاحة والتخطيط', description: 'اعمل على الأرصاد والخرائط وحساب الأداء ومنطق الملاحة والقرارات وراء الإجابة الصحيحة.' },
      { week: 'الأسبوع 3', title: 'الأداء والعمليات والموضوعات الضعيفة', description: 'ارجع إلى الموضوعات التي تستهلك الوقت أو الثقة من خلال حل موجّه ودعم فردي.' },
      { week: 'الأسبوع 4', title: 'تدريب شفهي وخطة تالية', description: 'تدرب على شرح المفاهيم بصوت عالٍ، واحصل على ملاحظات مركزة وخطة مراجعة شخصية قبل الاختبار الرسمي.' },
    ],
    supportTitle: 'مساعدة عندما تصبح المادة صعبة', supportDescription: 'يتضمن البرنامج دعماً فردياً للموضوعات الصعبة وبنية الإجابة الشفهية. يساعدك المدرب على شرح ما تعرفه وتحديد ما يحتاج إلى عمل وبناء خطة قابلة للتنفيذ.', formatTitle: 'خيارات التقديم', formatItems: ['جلسات مباشرة عبر الإنترنت', 'تعلم حضوري في تل أبيب', 'خطة هجينة مع المنسق'],
    tuitionLabel: 'رسوم المدرسة الأرضية', tuitionDetail: 'يعرض السعر الإجمالي بالشيكل الإسرائيلي. طلب التسجيل لا يأخذ دفعة ولا يحجز مقعداً.', requestTitle: 'طلب تفاصيل التسجيل', requestDescription: 'أخبر منسق التدريب بالمسار والشكل المطلوبين. ستتلقى تفاصيل الدفعة التالية قبل تأكيد التسجيل أو الدفع.',
    formName: 'الاسم الكامل', formEmail: 'البريد الإلكتروني', formPhone: 'الهاتف / WhatsApp', formPathway: 'المسار النظري', formModality: 'الشكل المفضل', formFocus: 'الموضوعات التي تريد المساعدة فيها', formFocusPlaceholder: 'مثلاً: خرائط الطقس، حسابات الأداء، اللوائح، التدريب على الإجابات الشفهية…', formConsent: 'أوافق على أن تستخدم Sim Dream هذه البيانات للرد على طلب تسجيلي في المدرسة الأرضية وفقاً لسياسة الخصوصية.', formSubmit: 'إرسال طلب التسجيل', formSubmitting: 'جارٍ الإرسال…', formSuccessTitle: 'تم استلام الطلب', formSuccessDescription: 'سيرسل منسق التدريب تفاصيل الدفعة التالية قبل تأكيد المقعد أو الدفع.', formError: 'تعذر إرسال الطلب. راجع الحقول وحاول مجدداً.',
    pathwayOptions: { faa: 'تحضير نظري / شفهي FAA', easa: 'تحضير نظري / شفهي EASA', exploring: 'ما زلت أختار المسار' }, modalityOptions: { online: 'عبر الإنترنت', in_person: 'حضوري في تل أبيب', hybrid: 'هجين' }, disclosureTitle: 'إفصاح مهم عن البرنامج', disclosure: 'المدرسة الأرضية إرشاد تعليمي مستقل وتحضير للاختبارات. ليست مدرسة معتمدة من FAA أو EASA ولا تصدر رخصة أو تأهيلاً أو رصيد تدريب رسمي أو نتيجة اختبار، ولا تضمن نجاح أي مرشح في اختبار نظري أو شفهي خارجي. يتم تأكيد مؤهلات المدرب وخطة الدفعة النهائية قبل التسجيل.',
  },
  es: {
    navLabel: 'Escuela en tierra', heroBadge: 'FORMACIÓN PROFESIONAL · TEORÍA Y ORAL FAA / EASA', heroTitle: 'Escuela en tierra para teoría y preparación oral FAA y EASA',
    heroSubtitle: 'Un intensivo mensual dirigido por instructor para candidatos que buscan teoría estructurada, práctica enfocada para el examen oral y un plan práctico desde Israel: en línea, presencial o híbrido.', heroCta: 'Solicitar inscripción a la escuela en tierra',
    overviewBadge: 'ESTUDIA DESDE ISRAEL', overviewTitle: 'Prepárate para el examen sin crear una rutina en el extranjero', overview: 'Para candidatos cuyo itinerario requiere teoría FAA o EASA, un programa local puede reducir viajes, alojamiento, alquiler de coche y tiempos de espera asociados con organizar un curso separado en Estados Unidos o Europa. La formación comienza con tu objetivo y tus temas difíciles y los convierte en un plan mensual realista.',
    advantagesTitle: 'Por qué los candidatos eligen este formato', advantages: [
      { title: 'Una base de estudio local', description: 'Estudia desde Israel de forma presencial, en línea o híbrida sin planificar viajes regulares al extranjero para tutoría teórica.' },
      { title: 'Apoyo específico 1:1', description: 'Trabaja los temas que te frenan: meteorología, normativa, rendimiento, navegación, sistemas o escenarios orales.' },
      { title: 'Mentoría desde tu objetivo', description: 'El plan se construye alrededor de la ruta de licencia, el calendario de examen, tu estilo de aprendizaje y tus decisiones reales de presupuesto.' },
      { title: 'Teoría conectada con la práctica', description: 'Los ejemplos de aviación y la práctica oral estructurada convierten hechos aislados en explicaciones claras.' },
    ],
    scheduleBadge: 'COHORTE INTENSIVA MENSUAL', scheduleTitle: 'Una secuencia intensiva de cuatro semanas', scheduleSubtitle: 'Cada cohorte sigue esta secuencia. El coordinador confirma fechas, zona horaria, instructor, capacidad y mezcla presencial/en línea antes de aceptar la inscripción.',
    modules: [
      { week: 'Semana 1', title: 'Diagnóstico y fundamentos', description: 'Confirma tu ruta, identifica brechas y crea un plan enfocado en normativa, aerodinámica y sistemas de aeronave.' },
      { week: 'Semana 2', title: 'Meteorología, navegación y planificación', description: 'Trabaja meteorología, cartas, rendimiento, lógica de navegación y las decisiones detrás de la respuesta correcta.' },
      { week: 'Semana 3', title: 'Rendimiento, operaciones y temas débiles', description: 'Vuelve a los temas que cuestan tiempo o confianza con resolución guiada y apoyo individual.' },
      { week: 'Semana 4', title: 'Práctica oral y plan siguiente', description: 'Practica explicar conceptos en voz alta, recibe comentarios concretos y sal con un plan de repaso personal.' },
    ],
    supportTitle: 'Ayuda donde el material se vuelve difícil', supportDescription: 'El programa incluye apoyo 1:1 en temas difíciles y en la estructura de respuestas orales. Tu instructor te ayuda a explicar lo que sabes, detectar lo que requiere trabajo y seguir un plan viable.', formatTitle: 'Opciones de impartición', formatItems: ['Sesiones en directo en línea', 'Aprendizaje presencial en Tel Aviv', 'Plan híbrido con el coordinador'],
    tuitionLabel: 'Matrícula de escuela en tierra', tuitionDetail: 'El precio total se muestra en nuevos séqueles israelíes. La solicitud de inscripción no realiza un pago ni reserva plaza.', requestTitle: 'Solicitar detalles de inscripción', requestDescription: 'Indica al coordinador la ruta y el formato que necesitas. Recibirás detalles de la próxima cohorte antes de confirmar inscripción o pago.',
    formName: 'Nombre completo', formEmail: 'Correo electrónico', formPhone: 'Teléfono / WhatsApp', formPathway: 'Ruta teórica', formModality: 'Formato preferido', formFocus: 'Temas en los que quieres ayuda', formFocusPlaceholder: 'Por ejemplo: cartas meteorológicas, cálculos de rendimiento, normativa, práctica de respuestas orales…', formConsent: 'Acepto que Sim Dream use estos datos para responder a mi solicitud de inscripción a la escuela en tierra, como se describe en la Política de privacidad.', formSubmit: 'Enviar solicitud', formSubmitting: 'Enviando…', formSuccessTitle: 'Solicitud recibida', formSuccessDescription: 'El coordinador enviará los detalles de la próxima cohorte antes de confirmar plaza o pago.', formError: 'No se pudo enviar tu solicitud. Revisa los campos e inténtalo de nuevo.',
    pathwayOptions: { faa: 'Preparación de teoría / oral FAA', easa: 'Preparación de teoría / oral EASA', exploring: 'Aún estoy eligiendo una ruta' }, modalityOptions: { online: 'En línea', in_person: 'Presencial en Tel Aviv', hybrid: 'Híbrido' }, disclosureTitle: 'Información importante del programa', disclosure: 'La escuela en tierra es tutoría educativa independiente y preparación para exámenes. No es una escuela aprobada por FAA o EASA, no otorga licencia, habilitación, crédito oficial de formación ni resultado de examen, y no garantiza que un candidato apruebe un examen teórico u oral externo. Las credenciales del instructor y el plan final de la cohorte se confirman antes de la inscripción.',
  },
  de: {
    navLabel: 'Theoriekurs',
    heroBadge: 'PROFI-TRAINING · FAA- / EASA-THEORIE- & ORAL-VORBEREITUNG',
    heroTitle: 'Ground School für FAA- & EASA-Theorie und mündliche Prüfungen',
    heroSubtitle:
      'Ein monatlicher Intensivkurs mit Instruktor für Kandidaten, die strukturierte Theorie, gezielte Oral-Prüfungsvorbereitung und einen realistischen Lernplan aus Israel suchen – online, vor Ort oder hybrid.',
    heroCta: 'Anmeldung für den Theoriekurs anfragen',
    overviewBadge: 'AUS ISRAEL LERNEN',
    overviewTitle: 'Prüfungsreife aufbauen ohne Auslandsalltag',
    overview:
      'Für Kandidaten, deren Weg FAA- oder EASA-Theorie erfordert, reduziert ein lokales Lernprogramm vermeidbare Reise-, Unterkunfts-, Mietwagen- und Wartezeiten für einen separaten Kurs in den USA oder Europa. Das Training beginnt bei Ihrem Zielpfad und Ihren schwierigen Themen und formt daraus einen realistischen Monatsplan.',
    advantagesTitle: 'Warum Kandidaten dieses Format wählen',
    advantages: [
      {
        title: 'Lernbasis vor Ort',
        description: 'Lernen Sie aus Israel persönlich, online oder hybrid statt regelmäßige Auslandsreisen für Theorie-Coaching einzuplanen.',
      },
      {
        title: 'Gezielte 1:1-Unterstützung',
        description: 'Bringen Sie genau die Themen mit, die Sie bremsen – Wetter, Luftrecht, Flugleistung, Navigation, Systeme oder Oral-Szenarien – und arbeiten Sie sie mit einem Instruktor durch.',
      },
      {
        title: 'Zielorientiertes Mentoring',
        description: 'Ihr Plan richtet sich nach Lizenzweg, Prüfungstermin, Lernstil und Ihren realen Budgetentscheidungen.',
      },
      {
        title: 'Theorie mit Praxisbezug',
        description: 'Luftfahrtbeispiele und strukturierte mündliche Übungen verwandeln isolierte Fakten in klare Erklärungen und sicherere Entscheidungen.',
      },
    ],
    scheduleBadge: 'MONATLICHER INTENSIVKURS',
    scheduleTitle: 'Ein vierwöchiger Intensiv-Lernplan',
    scheduleSubtitle:
      'Jeder Durchgang folgt dieser Struktur. Der Koordinator bestätigt die nächsten Termine, Zeitzone, Instruktor, Kapazität und den Online-/Präsenz-Mix vor der endgültigen Anmeldung.',
    modules: [
      { week: 'Woche 1', title: 'Diagnose & Grundlagen', description: 'Zielpfad bestätigen, Wissenslücken erkennen und einen fokussierten Lernplan für Luftrecht, Aerodynamik und Flugzeugsysteme aufstellen.' },
      { week: 'Woche 2', title: 'Wetter, Navigation & Flugplanung', description: 'Meteorologie, Karten, Leistungsberechnung, Navigationslogik und die Entscheidungswege hinter der richtigen Antwort durcharbeiten.' },
      { week: 'Woche 3', title: 'Flugleistung, Betrieb & Schwachstellen', description: 'Themen vertiefen, die Zeit oder Sicherheit kosten – mit geführter Problemlösung und individueller Unterstützung.' },
      { week: 'Woche 4', title: 'Oral-Training & Nächste Schritte', description: 'Konzepte laut und strukturiert erklären, gezieltes Feedback erhalten und mit einem persönlichen Wiederholungsplan in die offizielle Prüfung gehen.' },
    ],
    supportTitle: 'Hilfe dort, wo der Stoff schwierig wird',
    supportDescription:
      'Das Programm umfasst 1:1-Unterstützung bei anspruchsvollen Themen und dem Aufbau mündlicher Antworten. Ihr Instruktor hilft Ihnen, Ihr Wissen klar zu formulieren und einen machbaren Plan einzuhalten.',
    formatTitle: 'Unterrichtsformate',
    formatItems: ['Live-Online-Sessions', 'Präsenzunterricht in Tel Aviv', 'Hybrider Plan mit dem Koordinator'],
    tuitionLabel: 'Kursgebühr Ground School',
    tuitionDetail:
      'Der Gesamtpreis wird in Israelischen Schekel angezeigt. Eine Anfrage löst weder eine Zahlung noch eine verbindliche Platzreservierung aus.',
    requestTitle: 'Anmeldedetails anfragen',
    requestDescription:
      'Teilen Sie dem Koordinator Ihren gewünschten Theoriepfad und Ihr Lernformat mit. Sie erhalten die Details zum nächsten Durchgang vor einer verbindlichen Anmeldung oder Zahlung.',
    formName: 'Vollständiger Name',
    formEmail: 'E-Mail-Adresse',
    formPhone: 'Telefon / WhatsApp',
    formPathway: 'Theoriepfad',
    formModality: 'Bevorzugtes Format',
    formFocus: 'Themen, bei denen Sie Unterstützung wünschen',
    formFocusPlaceholder: 'z. B. Wetterkarten, Leistungsberechnung, Luftrecht, Oral-Prüfungstraining…',
    formConsent:
      'Ich bin damit einverstanden, dass Sim Dream diese Angaben verwendet, um meine Anfrage zum Theoriekurs wie in der Datenschutzerklärung beschrieben zu beantworten.',
    formSubmit: 'Anfrage senden',
    formSubmitting: 'Wird gesendet…',
    formSuccessTitle: 'Anfrage erhalten',
    formSuccessDescription:
      'Der Koordinator sendet Ihnen die Details zum nächsten Durchgang, bevor ein Platz oder eine Zahlung bestätigt wird.',
    formError: 'Ihre Anfrage konnte nicht gesendet werden. Prüfen Sie die Felder und versuchen Sie es erneut.',
    pathwayOptions: {
      faa: 'FAA-Theorie- / Oral-Vorbereitung',
      easa: 'EASA-Theorie- / Oral-Vorbereitung',
      exploring: 'Ich wähle meinen Pfad noch aus',
    },
    modalityOptions: { online: 'Online', in_person: 'Vor Ort in Tel Aviv', hybrid: 'Hybrid' },
    disclosureTitle: 'Wichtiger Programmhinweis',
    disclosure:
      'Die Ground School ist ein unabhängiges Bildungs-Tutoring und Prüfungstraining. Sie ist keine von FAA oder EASA zugelassene Flugschule, verleiht keine Lizenzen, Berechtigungen, offiziellen Ausbildungsstunden oder Prüfungsergebnisse und garantiert nicht das Bestehen externer Theorie- oder Oral-Prüfungen. Qualifikationen des Instruktors und der endgültige Kursplan werden vor der Anmeldung bestätigt.',
  },
};

export function groundSchoolCopy(language: Language): GroundSchoolCopy {
  return GROUND_SCHOOL_COPY[language] ?? GROUND_SCHOOL_COPY.en;
}
