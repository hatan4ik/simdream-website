import { MessageCircle } from 'lucide-react';
import { FACILITY_INFO } from '@/lib/config/facility-info';

/**
 * Persistent, low-friction contact route. It deliberately opens WhatsApp rather
 * than hosting a second conversational system, so the customer reaches the
 * SimDream team in the channel they already use.
 */
export function WhatsAppAction() {
  return (
    <a
      href={FACILITY_INFO.contact.whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      data-whatsapp-action
      aria-label="Contact Sim Dream on WhatsApp: +972 55 507 1307"
      title="WhatsApp Sim Dream"
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#25D366] bg-[#25D366] px-3 text-slate-950 transition-colors hover:bg-[#1DA851] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 touch-manipulation"
    >
      <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="hidden lg:inline text-xs font-semibold">WhatsApp</span>
    </a>
  );
}
