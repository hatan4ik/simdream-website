/**
 * Read-only Wix AI Site-Chat connection probe.
 *
 * It authenticates as a new anonymous visitor and confirms that the headless
 * frontend can read that visitor's chat history. No message is created, and no
 * message body, visitor identity, token, or credential is printed.
 *
 *   npm run wix:chat:smoke
 */
import { createClient, OAuthStrategy } from '@wix/sdk';
import { messages } from '@wix/ai-site-chat';
import { loadWixLocalEnv } from './wix-env';

loadWixLocalEnv(['NEXT_PUBLIC_WIX_CLIENT_ID']);

const clientId = process.env.NEXT_PUBLIC_WIX_CLIENT_ID?.trim();
if (!clientId) {
  console.error('Wix Smart Chat: NEXT_PUBLIC_WIX_CLIENT_ID is not configured. No Wix request was made.');
  process.exit(2);
}

const wixClient = createClient({
  modules: { messages },
  auth: OAuthStrategy({ clientId }),
});

try {
  await wixClient.messages.listMessages({ cursorPaging: { limit: 1 } });
  console.log('Wix Smart Chat: visitor message API is reachable.');
} catch {
  console.error(
    'Wix Smart Chat: visitor message API is unavailable. Install and configure Wix AI Site-Chat in the Wix Editor for this Headless site, then retry.'
  );
  process.exit(1);
}
