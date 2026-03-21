'use client';

import { createClient } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button onClick={signOut} className="w-full rounded-[24px] app-card px-5 py-4 text-left font-semibold text-slate-900">
      Sign Out
    </button>
  );
}
