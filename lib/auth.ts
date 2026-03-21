import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

export async function getSessionProfile(redirectIfMissing = true) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (redirectIfMissing) redirect('/login');
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, rank, role, created_at')
    .eq('id', user.id)
    .single<Profile>();

  if (!profile && redirectIfMissing) redirect('/login');

  return { user, profile };
}

export async function requireAdmin() {
  const session = await getSessionProfile(true);
  if (!session?.profile || session.profile.role !== 'admin') {
    redirect('/home');
  }
  return session;
}
