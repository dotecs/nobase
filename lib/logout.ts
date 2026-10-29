import { createClientSupabaseClient } from './supabase-client';
export async function signOutLocal() {
  const { error } = await createClientSupabaseClient().auth.signOut({ scope: 'local' });
  if (error) throw error;
}
