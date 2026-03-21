export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Shield, Bell, ChevronRight } from 'lucide-react';
import { SignOutButton } from '@/components/sign-out-button';
import { EnablePushCard } from '@/components/enable-push-card';

type ProfileRow = {
  id: string;
  full_name: string | null;
  rank: string | null;
  role: string | null;
};

export default async function MorePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: ProfileRow | null = null;

  if (user?.id) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, rank, role')
      .eq('id', user.id)
      .maybeSingle();

    profile = (data as ProfileRow | null) ?? null;
  }

  const displayName =
    [profile?.rank, profile?.full_name].filter(Boolean).join(' ').trim() || 'Soldier';

  const isAdmin = profile?.role === 'admin';

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section>
        <h1
          style={{
            margin: 0,
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: '-0.05em',
            color: '#ffffff',
          }}
        >
          More
        </h1>
        <p
          style={{
            marginTop: 12,
            marginBottom: 0,
            fontSize: 15,
            color: 'rgba(255,255,255,0.82)',
          }}
        >
          Account settings, notifications, and admin access.
        </p>
      </section>

      <section
        style={{
          background: '#ffffff',
          borderRadius: 30,
          padding: 22,
          boxShadow: '0 18px 44px rgba(15,23,42,0.14)',
          color: '#0f172a',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#94a3b8',
              }}
            >
              Account
            </div>

            <h2
              style={{
                marginTop: 10,
                marginBottom: 0,
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: '#0f172a',
              }}
            >
              {displayName}
            </h2>

            <p
              style={{
                marginTop: 8,
                marginBottom: 0,
                fontSize: 14,
                color: '#64748b',
              }}
            >
              Role: {profile?.role ?? 'user'}
            </p>

            {user?.email && (
              <p
                style={{
                  marginTop: 4,
                  marginBottom: 0,
                  fontSize: 14,
                  color: '#64748b',
                }}
              >
                Signed in
              </p>
            )}
          </div>

          <div
            style={{
              borderRadius: 999,
              background: isAdmin ? '#ede9fe' : '#f8fafc',
              color: isAdmin ? '#6d28d9' : '#475569',
              padding: '7px 12px',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            {isAdmin ? 'Admin' : 'Standard'}
          </div>
        </div>
      </section>

      <section
        style={{
          background: '#ffffff',
          borderRadius: 30,
          padding: 22,
          boxShadow: '0 18px 44px rgba(15,23,42,0.14)',
          color: '#0f172a',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 16,
          }}
        >
          <Bell size={18} color="#8b1538" />
          <h2
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#0f172a',
            }}
          >
            Notifications
          </h2>
        </div>

        <div
          style={{
            borderRadius: 22,
            background: '#f8fafc',
            padding: 16,
            border: '1px solid rgba(15,23,42,0.08)',
          }}
        >
          <EnablePushCard />
        </div>
      </section>

      {isAdmin && (
        <section
          style={{
            background: '#ffffff',
            borderRadius: 30,
            padding: 22,
            boxShadow: '0 18px 44px rgba(15,23,42,0.14)',
            color: '#0f172a',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <Shield size={18} color="#8b1538" />
            <h2
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#0f172a',
              }}
            >
              Admin Access
            </h2>
          </div>

          <Link
            href="/admin"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              borderRadius: 22,
              background: 'linear-gradient(180deg, #fff1f2 0%, #ffffff 100%)',
              padding: '16px 18px',
              border: '1px solid #ffe4e6',
              textDecoration: 'none',
              color: '#0f172a',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              >
                Open Admin Panel
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 14,
                  color: '#64748b',
                }}
              >
                Manage alerts, schedules, jumps, manifests, and CQ.
              </div>
            </div>

            <ChevronRight size={20} color="#8b1538" />
          </Link>
        </section>
      )}

      <section
        style={{
          background: '#ffffff',
          borderRadius: 30,
          padding: 22,
          boxShadow: '0 18px 44px rgba(15,23,42,0.14)',
          color: '#0f172a',
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: 16,
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#0f172a',
          }}
        >
          Session
        </h2>

        <div
          style={{
            borderRadius: 22,
            background: '#f8fafc',
            padding: 16,
            border: '1px solid rgba(15,23,42,0.08)',
          }}
        >
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}