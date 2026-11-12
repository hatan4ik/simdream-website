import { LEGAL_PATHS } from '../anchors';
import {
  FREE_RESCHEDULE_NOTICE_HOURS,
  REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION,
  REFUND_WINDOW_DAYS,
  RESCHEDULE_FEE_ILS,
} from '../policy-constants';
import type { LegalBody } from '../types';

/**
 * Rules clauses 13 to 15 in Spanish. Clause 14 translates the owner's Hebrew photo and video
 * "consent, release and waiver of rights" form faithfully. NEEDS LEGAL REVIEW: not checked by counsel.
 */
const RULES_EXTRA_ES: LegalBody = {
  sections: [
    {
      id: 'refunds',
      clauses: [
        {
          number: '13.1',
          text: 'El reembolso se solicita únicamente mediante el formulario de solicitud de reembolso en línea de este sitio.',
          action: { href: LEGAL_PATHS.refundForm, label: 'Abrir el formulario de solicitud de reembolso' },
          added: true,
        },
        {
          number: '13.2',
          text: `Los requisitos para el reembolso, la tarifa por cambio de fecha y los casos en que no se concede reembolso son los de las cláusulas 4.1 a 4.6, que esta cláusula no modifica. En particular: el reembolso total exige que no hayan pasado aún ${REFUND_WINDOW_DAYS} días desde la reserva y que la cancelación se haga al menos ${REFUND_MIN_BUSINESS_DAYS_BEFORE_SESSION} días hábiles antes de la sesión (cláusula 4.3); una solicitud de cambio de fecha recibida con menos de ${FREE_RESCHEDULE_NOTICE_HOURS} horas de antelación conlleva una tarifa de ${RESCHEDULE_FEE_ILS} NIS (cláusula 4.2); la cancelación el mismo día de la sesión o la no presentación no dan derecho a reembolso (cláusula 4.4); el reembolso de una suscripción no utilizada por completo se calcula conforme a la cláusula 4.6.`,
          added: true,
        },
        {
          number: '13.3',
          text: 'La decisión sobre la solicitud se toma a partir de los datos indicados en el formulario y conforme a las condiciones anteriores.',
          added: true,
        },
        {
          number: '13.4',
          text: 'Un reembolso aprobado se efectúa por el medio de pago utilizado para pagar la reserva.',
          added: true,
          needsLegalReview: true,
        },
      ],
    },
    {
      id: 'media-release',
      intro:
        'En esta cláusula, «la Empresa» es el Centro según la cláusula 1.1 y «la persona filmada» es quien aparece en las grabaciones. Considerando que la persona filmada ha participado o participará en una jornada de grabación y/o en una actividad en el centro de formación y experiencias de la Empresa (simulador de vuelo Boeing 737 MAX); y considerando que la Empresa desea utilizar el material grabado para sus fines comerciales y de marketing; la persona filmada declara y acepta lo siguiente:',
      clauses: [
        {
          number: '14.1',
          term: 'Cesión de derechos:',
          text: 'Por la presente concedo a la Empresa, incluidos sus representantes, directivos, empleados y cualquier persona que actúe en su nombre, una autorización plena e irrevocable, sin límite de tiempo ni de lugar, para utilizar las fotografías, imágenes fijas, material de vídeo y grabaciones de audio en los que aparezco, producidos con mi participación directa durante mi estancia en las instalaciones del Centro (los «Materiales»).',
        },
        {
          number: '14.2',
          term: 'Finalidades de uso:',
          text: 'Sé y acepto que la Empresa utilizará los Materiales, entre otros fines, para los siguientes:',
          items: [
            'Publicidad y promoción en los sitios web de la Empresa.',
            'Uso en publicaciones comerciales y publicitarias (incluidos anuncios y campañas patrocinadas).',
            'Publicación, promoción y difusión en redes sociales (incluidas Facebook, Instagram, TikTok y YouTube) y en cualquier otra plataforma digital o impresa.',
          ],
        },
        {
          number: '14.3',
          term: 'Propiedad intelectual y edición:',
          text: 'Confirmo que todos los derechos de autor y de propiedad intelectual sobre los Materiales, incluido el material en bruto y las versiones editadas, pertenecen de forma exclusiva y plena a la Empresa. La Empresa tiene derecho a editar, recortar, modificar, adaptar y combinar los Materiales con otros contenidos según su exclusivo criterio. Por la presente renuncio de antemano a cualquier «derecho moral» (Moral Right) relacionado con los Materiales y a cualquier reclamación sobre la forma en que se editen.',
        },
        {
          number: '14.4',
          term: 'Ausencia de reclamaciones y de contraprestación:',
          text: 'Sé que, salvo una contraprestación acordada expresamente y por escrito en un acuerdo aparte (si lo hubiera), no tendré derecho a ninguna remuneración económica, regalías ni compensación adicional por el uso de los Materiales. Por la presente renuncio de forma absoluta, definitiva e irrevocable a cualquier queja, exigencia o demanda contra la Empresa por el uso de los Materiales, incluidas, entre otras, las reclamaciones basadas en la ley israelí de protección de la privacidad (5741-1981) o en la ley israelí que prohíbe la difamación (5725-1965).',
        },
        {
          number: '14.5',
          term: 'Capacidad jurídica:',
          text: 'Declaro que soy mayor de 18 años y que tengo capacidad jurídica para aceptar lo anterior por mi libre voluntad. Si la persona filmada es menor de 18 años, se requiere el consentimiento de uno de sus padres o de su tutor legal.',
        },
        {
          number: '14.6',
          term: 'Autorización de madre, padre o tutor (solo para personas filmadas menores de 18 años):',
          text: 'Yo, madre, padre o tutor legal de una persona filmada menor de 18 años, he leído lo anterior, he comprendido su contenido y apruebo, en nombre del menor, su participación y todo lo establecido en esta cláusula.',
        },
        {
          number: '14.7',
          term: 'Derecho a oponerse a la grabación:',
          text: 'Esta cláusula no limita el derecho del cliente a pedir por escrito que no se le grabe, según lo previsto en la cláusula 6.4.',
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
          text: 'Al pagar en el sitio, el cliente debe marcar dos consentimientos distintos: (a) la aceptación de las Normas, incluida la regla de que el reembolso se solicita mediante el formulario descrito en la cláusula 13, y de la Política de privacidad; (b) la autorización para grabar y utilizar los Materiales y la renuncia a reclamaciones previstas en la cláusula 14.',
          added: true,
        },
        {
          number: '15.2',
          text: 'Al marcar los consentimientos se guarda, junto con la reserva, un registro con: la versión de las Normas y de la Política de privacidad mostradas (la fecha de la versión figura en la parte superior de la página), la versión del texto de consentimiento, el momento en que se marcaron las casillas y los consentimientos otorgados.',
          added: true,
          needsLegalReview: true,
        },
        {
          number: '15.3',
          text: 'Quien realiza la reserva declara ser mayor de 18 años, según la cláusula 1.11. La madre, el padre o el tutor legal de un menor que participe en la actividad consiente lo dispuesto en la cláusula 14 en nombre del menor.',
          added: true,
          needsLegalReview: true,
        },
        {
          number: '15.4',
          text: 'Marcar la casilla al pagar equivale a aceptar la cláusula 14 y sustituye la firma de un formulario de consentimiento aparte.',
          added: true,
          needsLegalReview: true,
        },
      ],
    },
  ],
};

export default RULES_EXTRA_ES;
