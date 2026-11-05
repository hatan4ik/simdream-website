import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * Wix-managed non-Astro hosting runs Cloudflare-Workers-compatible output.
 * Keep the adapter defaults: they use no account-owned R2/KV/Durable Object
 * bindings, which this Wix project neither creates nor controls.
 */
export default defineCloudflareConfig();
