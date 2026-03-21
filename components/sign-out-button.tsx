'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
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
        background: 'linear-gradient(180deg, #8b1538 0%, #6f102d 100%)',
        color: '#ffffff',
        padding: '15px 18px',
        fontSize: 15,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 14px 30px rgba(139,21,56,0.28)',
      }}
    >
      Sign Out
    </button>
  );
}