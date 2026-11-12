import { LEGAL_PATHS } from '../anchors';
import {
  FREE_RESCHEDULE_NOTICE_HOURS,
  REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION,
  REFUND_WINDOW_DAYS,
  RESCHEDULE_FEE_ILS,
} from '../policy-constants';
import type { LegalBody } from '../types';

/**
 * Rules clauses 13 to 15 in French. Clause 14 translates the owner's Hebrew photo and video
 * "consent, release and waiver of rights" form faithfully. NEEDS LEGAL REVIEW: not checked by counsel.
 */
const RULES_EXTRA_FR: LegalBody = {
  sections: [
    {
      id: 'refunds',
      clauses: [
        {
          number: '13.1',
          text: 'Un remboursement se demande uniquement au moyen du formulaire de demande de remboursement en ligne de ce site.',
          action: { href: LEGAL_PATHS.refundForm, label: 'Ouvrir le formulaire de demande de remboursement' },
          added: true,
        },
        {
          number: '13.2',
          text: `Les conditions de remboursement, les frais de modification et les cas où aucun remboursement n’est accordé sont ceux des articles 4.1 à 4.6, que le présent article ne modifie pas. En particulier : un remboursement intégral suppose que ${REFUND_WINDOW_DAYS} jours ne se soient pas encore écoulés depuis la commande et que l’annulation intervienne au moins ${REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION} jours ouvrables avant la session (article 4.3) ; une demande de changement de date reçue moins de ${FREE_RESCHEDULE_NOTICE_HOURS} heures avant la session entraîne des frais de modification de ${RESCHEDULE_FEE_ILS} NIS (article 4.2) ; l’annulation le jour même de la session ou l’absence ne donnent droit à aucun remboursement (article 4.4) ; le remboursement d’un abonnement non utilisé en totalité est calculé selon l’article 4.6.`,
          added: true,
        },
        {
          number: '13.3',
          text: 'La décision est prise sur la base des informations indiquées dans le formulaire et selon les conditions ci-dessus.',
          added: true,
        },
        {
          number: '13.4',
          text: 'Un remboursement accordé est effectué sur le moyen de paiement utilisé pour régler la commande.',
          added: true,
          needsLegalReview: true,
        },
      ],
    },
    {
      id: 'media-release',
      intro:
        'Dans le présent article, « la Société » désigne le Centre au sens de l’article 1.1 et « la personne filmée » toute personne qui apparaît dans les prises de vue. Attendu que la personne filmée a participé ou participera à une journée de tournage et/ou à une activité dans le centre de formation et d’expérience de la Société (simulateur de vol Boeing 737 MAX) ; et attendu que la Société souhaite utiliser les contenus filmés à ses fins commerciales et marketing ; la personne filmée déclare et accepte ce qui suit :',
      clauses: [
        {
          number: '14.1',
          term: 'Octroi de droits :',
          text: 'J’accorde par la présente à la Société, y compris à ses représentants, dirigeants, salariés et à toute personne agissant pour son compte, une autorisation pleine et irrévocable, sans limitation de durée ni de lieu, d’utiliser les photographies, images fixes, contenus vidéo et enregistrements sonores sur lesquels j’apparais, réalisés avec ma participation directe pendant mon séjour dans les locaux du Centre (les « Contenus »).',
        },
        {
          number: '14.2',
          term: 'Finalités d’utilisation :',
          text: 'Je sais et j’accepte que la Société utilisera les Contenus, notamment, aux fins suivantes :',
          items: [
            'Publicité et promotion sur les sites internet de la Société.',
            'Utilisation dans des publications commerciales et publicitaires (y compris annonces et campagnes sponsorisées).',
            'Publication, promotion et partage sur les réseaux sociaux (y compris Facebook, Instagram, TikTok, YouTube) et sur toute autre plateforme numérique ou imprimée.',
          ],
        },
        {
          number: '14.3',
          term: 'Propriété intellectuelle et montage :',
          text: 'Je confirme que tous les droits d’auteur et de propriété intellectuelle sur les Contenus, y compris les contenus bruts et les versions montées, appartiennent exclusivement et pleinement à la Société. La Société a le droit de monter, couper, modifier, adapter et combiner les Contenus avec d’autres contenus, à sa seule discrétion. Je renonce par la présente, par avance, à tout « droit moral » (Moral Right) relatif aux Contenus et à toute réclamation concernant la manière dont ils sont montés.',
        },
        {
          number: '14.4',
          term: 'Absence de réclamation et de contrepartie :',
          text: 'Je sais que, hormis une contrepartie convenue expressément et par écrit dans un accord distinct (le cas échéant), je n’aurai droit à aucune rémunération, redevance ou indemnité supplémentaire pour l’utilisation des Contenus. Je renonce par la présente, de manière absolue, définitive et irrévocable, à toute réclamation, demande ou action contre la Société en raison de l’utilisation des Contenus, y compris, sans s’y limiter, les réclamations fondées sur la loi israélienne sur la protection de la vie privée (5741-1981) ou la loi israélienne interdisant la diffamation (5725-1965).',
        },
        {
          number: '14.5',
          term: 'Capacité juridique :',
          text: 'Je déclare avoir plus de 18 ans et être juridiquement capable d’accepter ce qui précède de mon plein gré. Si la personne filmée a moins de 18 ans, l’accord d’un parent ou d’un tuteur est requis.',
        },
        {
          number: '14.6',
          term: 'Accord du parent ou du tuteur (personnes filmées de moins de 18 ans uniquement) :',
          text: 'Je soussigné(e), parent ou tuteur d’une personne filmée de moins de 18 ans, ai lu ce qui précède, en ai compris le contenu et approuve, au nom du mineur, sa participation et tout ce qui est énoncé dans le présent article.',
        },
        {
          number: '14.7',
          term: 'Droit de s’opposer au tournage :',
          text: 'Le présent article ne limite pas le droit du client de demander par écrit à ne pas être filmé, comme prévu à l’article 6.4.',
          added: true,
          needsLegalReview: true,
        },
      ],
    },
    {
      id: 'consent',
      clauses: [
        {
          number: '15.1',
          text: 'Lors du paiement sur le site, le client doit cocher deux consentements distincts : (a) l’acceptation du Règlement, y compris la règle selon laquelle un remboursement se demande par le formulaire prévu à l’article 13, et de la Politique de confidentialité ; (b) l’accord pour la captation d’images et l’utilisation des Contenus ainsi que la renonciation à toute réclamation prévus à l’article 14.',
          added: true,
        },
        {
          number: '15.2',
          text: 'Lorsque les consentements sont cochés, un enregistrement est conservé avec la commande : la version du Règlement et de la Politique de confidentialité présentée (la date de la version figure en haut de la page), la version du texte de consentement, le moment où les cases ont été cochées et les consentements donnés.',
          added: true,
          needsLegalReview: true,
        },
        {
          number: '15.3',
          text: 'La personne qui passe la commande déclare avoir plus de 18 ans, comme prévu à l’article 1.11. Le parent ou le tuteur d’un mineur qui participe à l’activité consent à l’article 14 au nom du mineur.',
          added: true,
          needsLegalReview: true,
        },
        {
          number: '15.4',
          text: 'Cocher la case lors du paiement vaut accord à l’article 14 et remplace la signature d’un formulaire de consentement distinct.',
          added: true,
          needsLegalReview: true,
        },
      ],
    },
  ],
};

export default RULES_EXTRA_FR;
