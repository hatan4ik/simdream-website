import React from 'react';
import { loadRulesCoreHe, loadRulesExtraHe } from '@/lib/legal/loaders';
import { LegalHashScroll } from '../shared/LegalHashScroll';
import { RulesSections } from './RulesSections';

/**
 * The Hebrew clause text, rendered by the server and placed into `RulesContentView` as a slot.
 *
 * A SERVER component on purpose. The text is far larger than React's progressive chunk size
 * (12.8 kB), so inside a `<Suspense>` boundary it is always streamed as a separate segment: the
 * loading fallback first, the text in a hidden `<div id="S:n">`, swapped in by an inline script that
 * waits for `requestAnimationFrame`. When the client hydrated before that swap, the hidden copy and
 * the client-rendered copy were in the DOM together and every clause id was duplicated. As a plain
 * server-rendered slot the text is in the first HTML, hydrates in place and has no fallback phase.
 */
export async function RulesBodyHebrew() {
  // Start both loads before awaiting either, so they run in parallel.
  const corePromise = loadRulesCoreHe();
  const extraPromise = loadRulesExtraHe();
  const [core, extra] = await Promise.all([corePromise, extraPromise]);

  return (
    <>
      <RulesSections language="he" core={core} coreLanguage="he" extra={extra} />
      <LegalHashScroll />
    </>
  );
}
