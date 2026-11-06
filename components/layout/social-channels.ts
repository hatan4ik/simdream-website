import { Facebook, Instagram, Youtube, type LucideIcon } from 'lucide-react';
import { FACILITY_INFO } from '@/lib/config/facility-info';

/**
 * Official social destinations and their native platform colours. These colours identify
 * third-party services; they are intentionally not Sim Dream brand tokens.
 */
export const SOCIAL_CHANNELS: ReadonlyArray<{
  name: 'Instagram' | 'Facebook' | 'YouTube';
  href: string;
  icon: LucideIcon;
  iconClassName: string;
  hoverClassName: string;
}> = [
  {
    name: 'Instagram',
    href: FACILITY_INFO.social.instagramUrl,
    icon: Instagram,
    iconClassName: 'text-[#E4405F]',
    hoverClassName: 'hover:bg-[#E4405F]/15',
  },
  {
    name: 'Facebook',
    href: FACILITY_INFO.social.facebookUrl,
    icon: Facebook,
    iconClassName: 'text-[#1877F2]',
    hoverClassName: 'hover:bg-[#1877F2]/15',
  },
  {
    name: 'YouTube',
    href: FACILITY_INFO.social.youtubeUrl,
    icon: Youtube,
    iconClassName: 'text-[#FF0000]',
    hoverClassName: 'hover:bg-[#FF0000]/15',
  },
];
