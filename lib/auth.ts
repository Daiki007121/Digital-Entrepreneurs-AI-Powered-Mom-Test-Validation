import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * Gets the authenticated user from the current session.
 * Throws an error if no user is authenticated.
 * Use in API routes and server components that require authentication.
 */
export async function getAuthUser() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return user;
}
