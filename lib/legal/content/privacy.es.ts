import { FACILITY_INFO } from '@/lib/config/facility-info';
import type { PrivacyBody } from '../types';

/**
 * Privacy policy in Spanish: a faithful translation of the owner's Hebrew original (sections 1 to 6)
 * plus the additions of sections 7 to 10 (see `privacy.he.ts`). NEEDS LEGAL REVIEW: not checked by counsel.
 */
const PRIVACY_ES: PrivacyBody = {
  sections: [
    {
      id: 'general',
      number: '1',
      title: 'Aspectos generales',
      clauses: [
        {
          text: 'Sim Dream («la Empresa» o «nosotros») respeta la privacidad de los usuarios del sitio Simdream.co.il. Esta política se redacta conforme a la ley israelí de protección de la privacidad (5741-1981) y a su enmienda n.º 13. Su objetivo es explicar con transparencia qué información se recopila, cómo la usamos y cuáles son tus derechos.',
        },
      ],
    },
    {
      id: 'information-and-consent',
      number: '2',
      title: 'Entrega de información y consentimiento (deber de informar)',
      clauses: [
        {
          text: 'Al hacer una reserva o ponerte en contacto con nosotros a través del sitio, se te pedirá que facilites datos personales (por ejemplo, nombre, teléfono y correo electrónico).',
        },
        {
          term: '¿Es obligatorio facilitar la información?',
          text: 'No. Facilitar la información depende únicamente de tu voluntad y de tu consentimiento. No tienes ninguna obligación legal de hacerlo.',
        },
        {
          term: 'Consecuencias de no facilitar la información:',
          text: 'Sin los datos requeridos (marcados como obligatorios), no podremos prestarte el servicio, coordinar un vuelo en el simulador ni ponernos en contacto contigo.',
        },
      ],
    },
    {
      id: 'purposes',
      number: '3',
      title: 'Finalidades del uso de la información',
      clauses: [
        {
          text: 'La información recopilada se utilizará únicamente para los siguientes fines:',
          items: [
            'Gestión y coordinación de las reservas de vuelos en el simulador.',
            'Contacto y atención al cliente.',
            'Envío de facturas y recibos.',
            'Envíos de marketing y novedades sobre promociones (solo si lo has aceptado por separado; puedes darte de baja en cualquier momento).',
            'Cumplimiento de cualquier disposición legal.',
          ],
        },
      ],
    },
    {
      id: 'third-parties',
      number: '4',
      title: 'Transferencia de información a terceros',
      clauses: [
        {
          text: 'No vendemos tu información personal. Podemos transferir información a proveedores tecnológicos que nos prestan servicios, únicamente para el funcionamiento del sitio y del negocio:',
          items: [
            'Wix.com: plataforma de gestión y alojamiento del sitio (los servidores pueden estar fuera de Israel).',
            'Proveedores de pago: para realizar los pagos (los datos se introducen directamente en el sistema seguro del proveedor).',
            'Google / Meta: servicios de estadísticas y publicidad (sujetos a la política de cookies; si se activan, solo con tu consentimiento).',
          ],
        },
        {
          text: 'Otros proveedores de infraestructura que alojan o hacen funcionar para nosotros el sistema de reservas y la base de datos (por ejemplo, servicios en la nube), con sus propias condiciones de seguridad.',
          added: true,
        },
      ],
    },
    {
      id: 'your-rights',
      number: '5',
      title: 'Tus derechos (derecho de acceso y rectificación)',
      clauses: [
        {
          text: 'Conforme a la ley de protección de la privacidad, tienes los siguientes derechos:',
          items: [
            'Derecho de acceso: puedes dirigirte a nosotros y pedir consultar la información que conservamos sobre ti en nuestra base de datos.',
            'Derecho de rectificación/supresión: si consideras que la información es incorrecta, incompleta o no está actualizada, puedes pedir que se corrija o se elimine.',
          ],
        },
        { text: `Para ejercer estos derechos, puedes escribirnos a la dirección de correo electrónico: ${FACILITY_INFO.contact.email}` },
      ],
    },
    {
      id: 'security',
      number: '6',
      title: 'Seguridad de la información',
      clauses: [
        {
          text: 'El sitio está alojado en los servidores de Wix y se apoya en medidas de seguridad habituales. Sin embargo, no es posible garantizar una inmunidad absoluta frente a intrusiones informáticas.',
        },
      ],
    },
    {
      id: 'checkout-data',
      number: '7',
      title: 'Datos adicionales que se recogen al reservar',
      added: true,
      clauses: [
        {
          term: 'Datos de la reserva:',
          text: 'Además de los datos de la sección 2, el formulario de reserva pide los datos necesarios para preparar la sesión, incluidos los datos de los participantes tal como figuran en el formulario.',
          added: true,
        },
        {
          term: 'Fecha de nacimiento:',
          text: 'Si se facilita una fecha de nacimiento para obtener el descuento de cumpleaños, la usamos únicamente para decidir si el descuento es aplicable. No la utilizamos para ningún otro fin y conservamos solo la información necesaria para ese fin.',
          added: true,
        },
        {
          term: 'Registro del consentimiento:',
          text: 'Cuando se marcan los consentimientos al pagar (las Normas, la Política de privacidad y la autorización de imagen), se guarda junto con la reserva un registro de las versiones mostradas, del momento en que se marcaron y de los consentimientos otorgados (véase la cláusula 15 de las Normas). Este registro sirve como prueba del consentimiento.',
          added: true,
        },
        {
          term: 'Solicitudes de reembolso:',
          text: 'Cuando se envía una solicitud de reembolso mediante el formulario, se recogen los datos introducidos (por ejemplo, la reserva, los datos de contacto y el motivo de la solicitud). Se utilizan solo para tramitar la solicitud y responderla, y se conservan junto con el registro de la reserva.',
          added: true,
        },
        {
          term: 'Solicitudes de la Escuela en tierra:',
          text: 'Cuando solicitas los detalles de inscripción a la Escuela en tierra, también recogemos la vía teórica, el formato de estudio y los temas en los que quieres ayuda. Estos datos se usan solo para responder a tu solicitud sobre la cohorte; una solicitud no es una inscripción ni un pago.',
          added: true,
          needsLegalReview: true,
        },
      ],
    },
    {
      id: 'photos-and-video',
      number: '8',
      title: 'Fotos y vídeos',
      added: true,
      clauses: [
        {
          text: 'Las Normas (cláusulas 6.4, 7.8 y 14) describen la grabación y el uso de los Materiales en el Centro. Las fotos, los vídeos y las grabaciones de audio en los que aparece una persona son datos personales y se utilizan para los fines de la cláusula 14.2 de las Normas. Puedes pedir por escrito que no se te grabe (cláusula 6.4 de las Normas) y ejercer los derechos de la sección 5 anterior poniéndote en contacto con nosotros.',
          added: true,
        },
      ],
    },
    {
      id: 'cookies',
      number: '9',
      title: 'Cookies y almacenamiento local',
      added: true,
      clauses: [
        {
          term: 'Almacenamiento local:',
          text: 'El sitio guarda tus preferencias de idioma y de visualización en el almacenamiento local del navegador, en tu dispositivo. La navegación pública habitual no crea una cookie de idioma. Algunas funciones guardan un valor de corta duración en el almacenamiento de sesión de la pestaña, por ejemplo el inicio de sesión de un miembro o un bono comprado que se muestra en la página de confirmación.',
          added: true,
        },
        {
          term: 'Cookies:',
          text: 'Por defecto, el sitio no instala cookies de analítica ni de publicidad. Los proveedores de cuenta, reserva o pago que se utilicen pueden instalar cookies esenciales según sus propias políticas.',
          added: true,
        },
        {
          term: 'Herramientas de estadísticas y publicidad:',
          text: 'Si se activan herramientas de estadísticas o de publicidad (por ejemplo, de Google o de Meta, como se indica en la sección 4), solo se cargan después de tu consentimiento. Puedes cambiar tu elección en cualquier momento mediante el enlace «Configuración de cookies» al pie del sitio, y puedes borrar el almacenamiento local y las cookies en los ajustes de tu navegador.',
          added: true,
          needsLegalReview: true,
        },
      ],
    },
    {
      id: 'version',
      number: '10',
      title: 'Versión de esta política',
      added: true,
      clauses: [
        {
          text: 'La fecha de la versión figura en la parte superior de la página. Se actualiza cada vez que cambia la política o las Normas, y la reserva conserva la versión mostrada al pagar.',
          added: true,
        },
      ],
    },
  ],
};

export default PRIVACY_ES;
