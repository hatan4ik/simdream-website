import {
  Accessibility,
  AlertTriangle,
  Camera,
  CheckSquare,
  Clock,
  CloudLightning,
  FileText,
  Gavel,
  Globe,
  Lock,
  RotateCcw,
  Scale,
  ShieldCheck,
  Tag,
  Ticket,
  type LucideIcon,
} from 'lucide-react';
import type { RulesSectionId } from '@/lib/legal/anchors';

/** Icon of each rules section; keyed by the section id so a new section cannot be added without one. */
export const RULES_SECTION_ICONS: Record<RulesSectionId, LucideIcon> = {
  definitions: FileText,
  principles: Scale,
  booking: Clock,
  changes: Ticket,
  liability: Scale,
  safety: AlertTriangle,
  disclaimer: ShieldCheck,
  promotions: Tag,
  website: Globe,
  accessibility: Accessibility,
  'force-majeure': CloudLightning,
  disputes: Gavel,
  refunds: RotateCcw,
  'media-release': Camera,
  consent: CheckSquare,
  'privacy-appendix': Lock,
};
