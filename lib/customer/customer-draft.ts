'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

export interface CustomerContactDraft {
  fullName: string;
  email: string;
  phone: string;
}

export interface CustomerDraftState extends CustomerContactDraft {
  /** Kept in SPA memory only for in-app navigation; never written to Web Storage. */
  birthDate: string;
}

export interface CustomerDraftAuthUser {
  id?: string | null;
  fullName?: string;
  email?: string;
  phone?: string;
}

const EMPTY_DRAFT: CustomerDraftState = { fullName: '', email: '', phone: '', birthDate: '' };

let currentDraft: CustomerDraftState = EMPTY_DRAFT;
let ownerUserId: string | null = null;
const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CustomerDraftState {
  return currentDraft;
}

function getServerSnapshot(): CustomerDraftState {
  return EMPTY_DRAFT;
}

/** Merges authenticated member profile defaults without overwriting visitor-typed fields. */
export function mergeUserContactIntoDraft(
  current: CustomerDraftState,
  user: CustomerDraftAuthUser | null
): CustomerDraftState {
  if (!user) return current;
  return {
    fullName: current.fullName || user.fullName || '',
    email: current.email || user.email || '',
    phone: current.phone || user.phone || '',
    birthDate: current.birthDate,
  };
}

export function applyCustomerDraftPatch(
  current: CustomerDraftState,
  patch: Partial<CustomerDraftState>
): CustomerDraftState {
  return {
    fullName: patch.fullName !== undefined ? patch.fullName : current.fullName,
    email: patch.email !== undefined ? patch.email : current.email,
    phone: patch.phone !== undefined ? patch.phone : current.phone,
    birthDate: patch.birthDate !== undefined ? patch.birthDate : current.birthDate,
  };
}

function setCustomerDraftStore(next: CustomerDraftState): void {
  if (
    next.fullName === currentDraft.fullName &&
    next.email === currentDraft.email &&
    next.phone === currentDraft.phone &&
    next.birthDate === currentDraft.birthDate
  ) {
    return;
  }
  currentDraft = next;
  emitChange();
}

/** Syncs authenticated member profile fields into the SPA draft store and clears on sign-out. */
export function syncAuthUserToCustomerDraft(user: CustomerDraftAuthUser | null): void {
  const nextUserId = user?.id ?? null;
  if (ownerUserId !== null && ownerUserId !== nextUserId) {
    ownerUserId = nextUserId;
    setCustomerDraftStore(user ? mergeUserContactIntoDraft(EMPTY_DRAFT, user) : EMPTY_DRAFT);
    return;
  }
  if (user) {
    ownerUserId = nextUserId;
    setCustomerDraftStore(mergeUserContactIntoDraft(currentDraft, user));
  }
}

/**
 * Shares entered customer contact and birth-date details across routes in SPA memory plus
 * authenticated member profile fallbacks, clearing on sign-out and never persisting PII to storage.
 */
export function useCustomerDraft(): {
  draft: CustomerDraftState;
  updateCustomerDraft: (patch: Partial<CustomerDraftState>) => void;
} {
  const draft = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const updateCustomerDraft = useCallback((patch: Partial<CustomerDraftState>) => {
    setCustomerDraftStore(applyCustomerDraftPatch(currentDraft, patch));
  }, []);

  return { draft, updateCustomerDraft };
}

/**
 * Inherits non-empty contact details (`fullName`, `email`, `phone`) into a form once available
 * without overwriting fields the visitor already edited.
 */
export function useCustomerContactSeed(onSeed: (contact: CustomerContactDraft) => void) {
  const ctx = useCustomerDraft();
  const onSeedRef = useRef(onSeed);
  onSeedRef.current = onSeed;

  useEffect(() => {
    const { fullName, email, phone } = ctx.draft;
    if (!fullName && !email && !phone) return;
    onSeedRef.current({ fullName, email, phone });
  }, [ctx.draft.fullName, ctx.draft.email, ctx.draft.phone]);

  return ctx;
}
