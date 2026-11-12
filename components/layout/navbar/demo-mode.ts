/**
 * The role switcher (pilot / admin) in the account menu and the drawer exists only in local development
 * without Supabase. `process.env.NEXT_PUBLIC_SUPABASE_URL` must stay a direct reference so the bundler inlines it.
 */
export const DEMO_MODE_ENABLED = process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_SUPABASE_URL;
