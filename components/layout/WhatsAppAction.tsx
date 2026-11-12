import { FACILITY_INFO } from '@/lib/config/facility-info';

type WhatsAppActionProps = {
  /** The utility bar is compact on desktop; the phone-navbar action keeps its full touch target. */
  placement?: 'utility' | 'navbar';
};

/**
 * WhatsApp's recognisable handset-in-bubble mark, rather than Lucide's generic chat bubble.
 * The accessible name stays on the containing link, so this SVG remains decorative.
 */
function WhatsAppMark({ className }: { className?: string }) {
  return (
    <svg
      data-whatsapp-native-icon
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12.05 2a9.85 9.85 0 0 0-8.35 15.08L2 22l5.08-1.65A9.95 9.95 0 1 0 12.05 2Zm0 17.92a8.06 8.06 0 0 1-4.1-1.12l-.3-.18-3.02.98.99-2.94-.2-.31a8.06 8.06 0 1 1 6.63 3.67Zm4.42-6.04c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12s-.62.77-.76.93c-.14.16-.28.18-.52.06-1.42-.71-2.35-1.27-3.29-2.88-.25-.43.25-.4.71-1.34.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.65.58.25 1.03.4 1.38.51.58.18 1.1.15 1.52.09.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}

/**
 * Persistent, low-friction contact route. It deliberately opens WhatsApp rather
 * than hosting a second conversational system, so the customer reaches the
 * SimDream team in the channel they already use.
 */
export function WhatsAppAction({ placement = 'utility' }: WhatsAppActionProps) {
  const isNavbarAction = placement === 'navbar';

  return (
    <a
      href={FACILITY_INFO.contact.whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      data-whatsapp-action
      data-whatsapp-placement={placement}
      aria-label="Contact Sim Dream on WhatsApp: +972 55 507 1307"
      title="WhatsApp Sim Dream"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-[#25D366] bg-[#25D366] text-slate-950 transition-colors hover:bg-[#1DA851] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 touch-manipulation ${
        isNavbarAction ? 'min-h-11 min-w-11' : 'min-h-9 min-w-9 pointer-coarse:min-w-11 md:h-9 md:w-9'
      }`}
    >
      <WhatsAppMark className={isNavbarAction ? 'h-5 w-5' : 'h-[18px] w-[18px]'} />
    </a>
  );
}
