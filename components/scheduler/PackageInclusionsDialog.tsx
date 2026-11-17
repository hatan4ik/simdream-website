import { Check, ChevronRight, Plane, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { BookingBlueprintCopy } from '@/lib/i18n/booking-blueprint-copy';
import { MODAL_SHELL, useNativeModal } from '@/lib/ui/use-native-modal';
import { formatCurrency } from '@/lib/utils';
import type { SimulatorPackage } from '@/types';

interface PackageInclusionsDialogProps {
  pkg: SimulatorPackage;
  copy: BookingBlueprintCopy;
  isRTL: boolean;
  onClose: () => void;
  onSelect: (pkg: SimulatorPackage) => void;
  /** The three class strings the storefront and the wizard render differently, passed whole. */
  overlayClassName: string;
  panelClassName: string;
  /**
   * Both callers still pass `font-black` and `px-6` (the wizard also `shadow-glow`), overrides AGENTS.md
   * §1.6 forbids on a Button. They are kept as they were so this shared dialog renders no differently.
   */
  selectButtonClassName: string;
}

/** The "what's included" dialog of a package, shared by AmazonFlightStorefront and KantorovichCalendarScheduler. */
export function PackageInclusionsDialog({
  pkg,
  copy,
  isRTL,
  onClose,
  onSelect,
  overlayClassName,
  panelClassName,
  selectButtonClassName,
}: PackageInclusionsDialogProps) {
  const { dialogRef, requestClose, lightDismiss } = useNativeModal(onClose);
  return (
    // A native modal <dialog>: the browser traps focus, handles Escape and returns focus to the
    // opener. The dialog is the full-viewport shell, so a click on it (outside the panel) dismisses.
    <dialog
      ref={dialogRef}
      aria-labelledby="blueprint-modal-title"
      className={`${MODAL_SHELL} ${overlayClassName}`}
      onClick={lightDismiss}
    >
      <div className={panelClassName}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{copy.badge}</span>
            </div>
            <h3 id="blueprint-modal-title" className="text-xl sm:text-2xl font-black text-white mt-1">
              {pkg.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-mono mt-0.5">
              <strong className="text-amber-400">{copy.duration(pkg.durationMinutes)}</strong> • {formatCurrency(pkg.priceIls)}
            </p>
          </div>

          <button
            type="button"
            onClick={requestClose}
            aria-label={copy.closeDialogLabel}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inclusions Breakdown */}
        <div className="space-y-4 text-xs sm:text-sm">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <h4 className="font-bold text-white flex items-center gap-2 text-sm">
              <Plane className="w-4 h-4 text-sky-400" />
              <span>{copy.missionArch}</span>
            </h4>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">{copy.handsOnPic}</strong>{' '}
                  {copy.handsOnDesc(pkg.durationMinutes)}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">{copy.takeoffTitle}</strong>{' '}
                  {copy.takeoffDesc}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">{copy.worldTitle}</strong>{' '}
                  {pkg.durationMinutes === 60
                    ? copy.world60
                    : pkg.durationMinutes === 90
                    ? copy.world90
                    : pkg.category === 'training'
                    ? copy.worldPro
                    : copy.worldBasic}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">{copy.observersTitle}</strong>{' '}
                  {copy.observersDesc}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">{copy.guidanceTitle}</strong>{' '}
                  {copy.guidanceDesc}
                </span>
              </li>
            </ul>
          </div>

          {/* Package Features List */}
          <div className="space-y-2">
            <p className="text-[11px] font-mono uppercase text-slate-400 font-bold">
              {copy.highlightsTitle}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
              {pkg.features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-950/40 border border-slate-800/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0 mt-1.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <Button
            type="button"
            variant="ghost"
            onClick={requestClose}
            className="w-full sm:w-auto text-slate-400 hover:text-white"
          >
            {copy.closeBtn}
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSelect(pkg);
              requestClose();
            }}
            className={selectButtonClassName}
          >
            <span>{copy.selectBtn(formatCurrency(pkg.priceIls))}</span>
            <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>
    </dialog>
  );
}