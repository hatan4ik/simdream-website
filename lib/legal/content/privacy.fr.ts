import { FACILITY_INFO } from '@/lib/config/facility-info';
import type { PrivacyBody } from '../types';

/**
 * Privacy policy in French: a faithful translation of the owner's Hebrew original (sections 1 to 6)
 * plus the additions of sections 7 to 10 (see `privacy.he.ts`). NEEDS LEGAL REVIEW: not checked by counsel.
 */
const PRIVACY_FR: PrivacyBody = {
  sections: [
    {
      id: 'general',
      number: '1',
      title: 'Généralités',
      clauses: [
        {
          text: 'Sim Dream (« la Société » ou « nous ») respecte la vie privée des utilisateurs du site Simdream.co.il. La présente politique est rédigée conformément à la loi israélienne sur la protection de la vie privée (5741-1981) et à son amendement n° 13. Elle a pour but d’expliquer en toute transparence quelles informations sont collectées, comment nous les utilisons et quels sont vos droits.',
        },
      ],
    },
    {
      id: 'information-and-consent',
      number: '2',
      title: 'Communication des informations et consentement (obligation d’information)',
      clauses: [
        {
          text: 'Lorsque vous passez une commande ou nous contactez via le site, il vous sera demandé de fournir des données personnelles (par exemple : nom, téléphone, adresse e-mail).',
        },
        {
          term: 'Faut-il obligatoirement fournir ces informations ?',
          text: 'Non. La communication des informations dépend uniquement de votre volonté et de votre consentement. Aucune obligation légale ne pèse sur vous.',
        },
        {
          term: 'Conséquences de l’absence de communication :',
          text: 'Sans les informations requises (marquées comme obligatoires), nous ne pourrons pas vous fournir le service, organiser un vol en simulateur pour vous ni vous contacter.',
        },
      ],
    },
    {
      id: 'purposes',
      number: '3',
      title: 'Finalités d’utilisation des informations',
      clauses: [
        {
          text: 'Les informations collectées sont utilisées uniquement aux fins suivantes :',
          items: [
            'Gestion et coordination des réservations de vols en simulateur.',
            'Contact et service client.',
            'Envoi de factures et de reçus.',
            'Envois marketing et informations sur les promotions (uniquement si vous l’avez accepté séparément ; vous pouvez vous désinscrire à tout moment).',
            'Respect des obligations légales.',
          ],
        },
      ],
    },
    {
      id: 'third-parties',
      number: '4',
      title: 'Transmission d’informations à des tiers',
      clauses: [
        {
          text: 'Nous ne vendons pas vos données personnelles. Nous pouvons transmettre des informations à des prestataires technologiques qui nous fournissent des services, uniquement pour le fonctionnement du site et de l’activité :',
          items: [
            'Wix.com : plateforme de gestion et d’hébergement du site (les serveurs peuvent se trouver hors d’Israël).',
            'Prestataires de paiement : pour effectuer les paiements (les données sont saisies directement dans le système sécurisé du prestataire).',
            'Google / Meta : services de statistiques et de publicité (sous réserve de la politique relative aux cookies ; s’ils sont activés, uniquement après votre consentement).',
          ],
        },
        {
          text: 'D’autres prestataires d’infrastructure qui hébergent ou exploitent pour nous le système de réservation et la base de données (par exemple des services cloud), selon leurs propres conditions de sécurité.',
          added: true,
        },
      ],
    },
    {
      id: 'your-rights',
      number: '5',
      title: 'Vos droits (droit d’accès et de rectification)',
      clauses: [
        {
          text: 'En vertu de la loi sur la protection de la vie privée, vous disposez des droits suivants :',
          items: [
            'Droit d’accès : vous pouvez nous contacter pour demander à consulter les informations vous concernant conservées dans notre base de données.',
            'Droit de rectification/suppression : si vous constatez que les informations sont inexactes, incomplètes ou obsolètes, vous pouvez demander leur correction ou leur suppression.',
          ],
        },
        { text: `Pour exercer ces droits, vous pouvez nous écrire à l’adresse e-mail : ${FACILITY_INFO.contact.email}` },
      ],
    },
    {
      id: 'security',
      number: '6',
      title: 'Sécurité des informations',
      clauses: [
        {
          text: 'Le site est hébergé sur les serveurs de Wix et s’appuie sur des mesures de sécurité usuelles. Il est toutefois impossible de garantir une immunité absolue contre les intrusions informatiques.',
        },
      ],
    },
    {
      id: 'checkout-data',
      number: '7',
      title: 'Informations supplémentaires collectées lors de la commande',
      added: true,
      clauses: [
        {
          term: 'Données de la commande :',
          text: 'Outre les informations de la section 2, le formulaire de réservation demande les informations nécessaires à la préparation de la session, y compris les données des participants telles qu’elles figurent dans le formulaire.',
          added: true,
        },
        {
          term: 'Date de naissance :',
          text: 'Si une date de naissance est fournie pour bénéficier de la remise d’anniversaire, nous l’utilisons uniquement pour déterminer si la remise s’applique. Nous ne l’utilisons à aucune autre fin et ne conservons que les informations nécessaires à cet objectif.',
          added: true,
        },
        {
          term: 'Enregistrement du consentement :',
          text: 'Lorsque les consentements sont cochés au paiement (le Règlement, la Politique de confidentialité et l’autorisation de captation d’images), un enregistrement est conservé avec la commande : versions présentées, moment où les cases ont été cochées et consentements donnés (voir l’article 15 du Règlement). Cet enregistrement sert de preuve du consentement.',
          added: true,
        },
        {
          term: 'Demandes de remboursement :',
          text: 'Lorsqu’une demande de remboursement est envoyée via le formulaire, les informations saisies sont collectées (par exemple la commande, les coordonnées et le motif de la demande). Elles servent uniquement à traiter la demande et à y répondre, et sont conservées avec l’enregistrement de la commande.',
          added: true,
        },
      ],
    },
    {
      id: 'photos-and-video',
      number: '8',
      title: 'Photos et vidéos',
      added: true,
      clauses: [
        {
          text: 'Le Règlement (articles 6.4, 7.8 et 14) décrit la captation d’images et l’utilisation des Contenus au Centre. Les photos, vidéos et enregistrements sonores sur lesquels une personne apparaît sont des données personnelles et sont utilisés aux fins prévues à l’article 14.2 du Règlement. Vous pouvez demander par écrit à ne pas être filmé (article 6.4 du Règlement) et exercer les droits de la section 5 ci-dessus en nous contactant.',
          added: true,
        },
      ],
    },
    {
      id: 'cookies',
      number: '9',
      title: 'Cookies et stockage local',
      added: true,
      clauses: [
        {
          term: 'Stockage local :',
          text: 'Le site conserve vos préférences de langue et d’affichage dans le stockage local du navigateur, sur votre appareil. La navigation publique ordinaire ne crée pas de cookie de langue. Certaines fonctionnalités conservent une valeur de courte durée dans le stockage de session de l’onglet, par exemple une connexion à un compte membre ou un bon acheté affiché sur la page de confirmation.',
          added: true,
        },
        {
          term: 'Cookies :',
          text: 'Par défaut, le site ne dépose aucun cookie d’analyse ni de publicité. Les prestataires de compte, de réservation ou de paiement utilisés peuvent déposer des cookies essentiels selon leurs propres politiques.',
          added: true,
        },
        {
          term: 'Outils de statistiques et de publicité :',
          text: 'Si des outils de statistiques ou de publicité sont activés (par exemple de Google ou de Meta, comme indiqué à la section 4), ils ne se chargent qu’après votre consentement. Vous pouvez modifier votre choix à tout moment via le lien « Paramètres des cookies » en bas du site, et vous pouvez effacer le stockage local et les cookies dans les paramètres de votre navigateur.',
          added: true,
          needsLegalReview: true,
        },
      ],
    },
    {
      id: 'version',
      number: '10',
      title: 'Version de la présente politique',
      added: true,
      clauses: [
        {
          text: 'La date de version figure en haut de la page. Elle est mise à jour à chaque modification de la politique ou du Règlement, et la commande conserve la version affichée lors du paiement.',
          added: true,
        },
      ],
    },
  ],
};

export default PRIVACY_FR;
