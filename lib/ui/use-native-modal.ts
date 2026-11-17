'use client';

import { useCallback, useEffect, useRef, type MouseEvent, type RefObject } from 'react';

/**
 * Classes that turn a `<dialog>` into a full-viewport shell around its panel: the user-agent size
 * limits, margin and border are reset and it only becomes a flex box while open (a dialog that sets
 * `display` unconditionally would stay visible when closed). The caller adds the dimming, padding
 * and alignment.
 */
export const MODAL_SHELL = 'm-0 h-full max-h-none w-full max-w-none border-0 text-inherit backdrop:bg-transparent open:flex';

interface NativeModal {
  /** Attach to the `<dialog>`. */
  dialogRef: RefObject<HTMLDialogElement | null>;
  /** Close the dialog while it is still attached, so the browser returns focus to the opener. */
  requestClose: () => void;
  /** `onClick` for the `<dialog>`: closes when the press lands on the dialog itself, outside its panel. */
  lightDismiss: (event: MouseEvent<HTMLDialogElement>) => void;
}

/**
 * Opens a mounted `<dialog>` as a modal. The browser then makes the page behind it inert, keeps
 * focus inside, handles Escape and the back gesture, and returns focus to the opener on close, so
 * none of that is written here. The caller mounts the dialog when it should be open, and `onClose`
 * runs whenever the dialog closes (Escape, a close button, a click outside the panel).
 *
 * The dialog is a full-viewport shell around its panel, so a click on the shell is a click on the
 * backdrop; that works in every browser, unlike the `closedby` attribute (not in Safari).
 */
export function useNativeModal(onClose: () => void): NativeModal {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Latest onClose without re-running the effect below.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (!dialog.open) dialog.showModal();
    const handleClose = () => onCloseRef.current();
    dialog.addEventListener('close', handleClose);
    return () => {
      // Unmounting (route change, strict-mode remount) is not a visitor decision: do not report it.
      dialog.removeEventListener('close', handleClose);
      if (dialog.open) dialog.close();
    };
  }, []);

  const requestClose = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    else onCloseRef.current();
  }, []);

  const lightDismiss = useCallback(
    (event: MouseEvent<HTMLDialogElement>) => {
      if (event.target === event.currentTarget) requestClose();
    },
    [requestClose],
  );

  return { dialogRef, requestClose, lightDismiss };
}
