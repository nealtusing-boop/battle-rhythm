'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

const FORCE_SPLASH_KEY = 'battle-rhythm-force-login-splash';

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    window.sessionStorage.setItem(FORCE_SPLASH_KEY, '1');

    const supabase = createClient();
    await supabase.auth.signOut();

    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      style={{
        width: '100%',
        borderRadius: 18,
        border: 'none',
        background: 'linear-gradient(180deg, #b91c1c 0%, #991b1b 100%)',
        color: '#ffffff',
        padding: '15px 18px',
        fontSize: 15,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 14px 30px rgba(185,28,28,0.24)',
      }}
    >
      Sign Out
    </button>
  );
}