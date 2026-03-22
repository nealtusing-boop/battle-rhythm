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
    .select('id, full_name, rank, role, is_active, created_at')
    .eq('id', user.id)
    .single<Profile>();

  if (!profile) {
    if (redirectIfMissing) redirect('/login');
    return null;
  }

  if (profile.is_active === false) {
    await supabase.auth.signOut();

    if (redirectIfMissing) {
      redirect('/login');
    }

    return null;
  }

  return { user, profile };
}

export async function requireAdmin() {
  const session = await getSessionProfile(true);

  if (!session?.profile || session.profile.role !== 'admin') {
    redirect('/home');
  }

  return session;
}
