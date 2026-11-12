import { Camera, Cookie, Database, FileClock, FileText, Lock, ShieldCheck, Target, UserCheck, Users, type LucideIcon } from 'lucide-react';

/** Icon of each privacy policy section, keyed by the section id used in `lib/legal/content/privacy.*`. */
export const PRIVACY_SECTION_ICONS: Record<string, LucideIcon> = {
  general: FileText,
  'information-and-consent': ShieldCheck,
  purposes: Target,
  'third-parties': Users,
  'your-rights': UserCheck,
  security: Lock,
  'checkout-data': Database,
  'photos-and-video': Camera,
  cookies: Cookie,
  version: FileClock,
};

export const PRIVACY_FALLBACK_ICON: LucideIcon = FileText;
