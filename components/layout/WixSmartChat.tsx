'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LoaderCircle, MessageCircleMore, Send, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import { WIX_SMART_CHAT_COPY } from '@/lib/i18n/wix-smart-chat-copy';
import { getWixMemberClient, isWixBrowserClientConfigured } from '@/lib/wix/member-client';

type ChatMessage = {
  id: string;
  kind: 'visitor' | 'assistant';
  text: string;
};

type WixMessageLike = {
  _id?: string | null;
  sender?: string | null;
  body?: { mainText?: string | null } | null;
};

function messageFromWix(message: WixMessageLike, index: number): ChatMessage | null {
  const text = message.body?.mainText?.trim();
  if (!text) return null;
  return {
    id: message._id ?? `wix-message-${index}`,
    kind: message.sender === 'SITE_VISITOR' ? 'visitor' : 'assistant',
    text,
  };
}

/**
 * A custom visitor interface for Wix AI Site-Chat. Wix's editor widget cannot render inside
 * a headless frontend, so this component deliberately uses the supported visitor APIs instead.
 */
export function WixSmartChat() {
  const { language, isRTL } = useLanguage();
  const copy = WIX_SMART_CHAT_COPY[language];
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sending' | 'unavailable'>('idle');
  const [historyReloadKey, setHistoryReloadKey] = useState(0);
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (!isWixBrowserClientConfigured()) {
      setStatus('unavailable');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    getWixMemberClient()
      .messages.listMessages({ cursorPaging: { limit: 50 } })
      .then((response) => {
        if (cancelled) return;
        setMessages(
          (response.messages ?? []).reduce<ChatMessage[]>((items, message, index) => {
            const item = messageFromWix(message, index);
            if (item) items.push(item);
            return items;
          }, [])
        );
        setStatus('idle');
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });

    return () => {
      cancelled = true;
    };
  }, [historyReloadKey, open]);

  useEffect(() => {
    if (open) historyEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, open, status]);

  const send = async () => {
    const question = draft.trim();
    if (!question || status === 'sending' || !isWixBrowserClientConfigured()) return;

    const localId = `local-${Date.now()}`;
    setMessages((current) => [...current, { id: localId, kind: 'visitor', text: question }]);
    setDraft('');
    setStatus('sending');

    try {
      const response = await getWixMemberClient().messages.createMessageStream({
        messageType: 'QUESTION',
        body: { mainText: question },
      });
      const answer = response.answerMessage?.body?.mainText?.trim() ?? response.answerChunk?.trim();
      if (answer) {
        setMessages((current) => [
          ...current,
          { id: response.answerMessage?._id ?? `answer-${Date.now()}`, kind: 'assistant', text: answer },
        ]);
        setStatus('idle');
      } else {
        setStatus('unavailable');
      }
    } catch {
      setStatus('unavailable');
    }
  };

  const retry = () => {
    setHistoryReloadKey((value) => value + 1);
  };

  return (
    <div data-wix-smart-chat className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? copy.close : copy.launcher}
        aria-expanded={open}
        aria-controls="wix-smart-chat-panel"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-violet-300 transition-colors hover:bg-violet-500/15 hover:text-violet-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 touch-manipulation"
      >
        {open ? <X className="h-4 w-4" aria-hidden="true" /> : <MessageCircleMore className="h-4 w-4" aria-hidden="true" />}
      </button>

      {open && (
        <section
          id="wix-smart-chat-panel"
          aria-label={copy.title}
          className="fixed inset-x-3 bottom-safe-area-3 z-[70] flex max-h-[min(38rem,calc(100dvh-5.5rem))] min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-sky-500/35 bg-slate-950 shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[24rem] rtl:sm:right-auto rtl:sm:left-5"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <header className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-white">{copy.title}</h2>
              <p className="mt-0.5 text-[10px] text-sky-300">{copy.status}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={copy.close}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-slate-300 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {status === 'loading' ? (
              <p className="flex items-center gap-2 text-sm text-slate-300">
                <LoaderCircle className="h-4 w-4 animate-spin text-sky-400" aria-hidden="true" />
                {copy.loading}
              </p>
            ) : status === 'unavailable' ? (
              <div className="rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-relaxed text-amber-100">
                <p>{copy.unavailable}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="mt-2 min-h-11 rounded-lg px-3 text-xs font-semibold text-amber-100 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  {copy.retry}
                </button>
              </div>
            ) : (
              <>
                {messages.length === 0 && (
                  <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-800 px-3 py-2.5 text-sm leading-relaxed text-slate-100 rtl:rounded-tl-2xl rtl:rounded-tr-sm">
                    {copy.greeting}
                  </p>
                )}
                {messages.map((message) => (
                  <p
                    key={message.id}
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
                      message.kind === 'visitor'
                        ? 'ml-auto rounded-tr-sm bg-sky-600 text-white rtl:ml-0 rtl:mr-auto rtl:rounded-tr-2xl rtl:rounded-tl-sm'
                        : 'rounded-tl-sm bg-slate-800 text-slate-100 rtl:rounded-tl-2xl rtl:rounded-tr-sm'
                    }`}
                  >
                    {message.text}
                  </p>
                ))}
                {status === 'sending' && (
                  <p className="flex w-fit items-center gap-2 rounded-2xl rounded-tl-sm bg-slate-800 px-3 py-2.5 text-sm text-slate-300 rtl:rounded-tl-2xl rtl:rounded-tr-sm">
                    <LoaderCircle className="h-4 w-4 animate-spin text-sky-400" aria-hidden="true" />
                    {copy.loading}
                  </p>
                )}
              </>
            )}
            <div ref={historyEndRef} />
          </div>

          <form
            className="flex items-end gap-2 border-t border-slate-800 bg-slate-900/70 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <label className="sr-only" htmlFor="wix-smart-chat-input">{copy.placeholder}</label>
            <textarea
              id="wix-smart-chat-input"
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder={copy.placeholder}
              disabled={status === 'loading' || status === 'sending' || status === 'unavailable'}
              className="min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!draft.trim() || status === 'loading' || status === 'sending' || status === 'unavailable'}
              aria-label={copy.send}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white transition-colors hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
