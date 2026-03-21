'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [fullName, setFullName] = useState('');
  const [rank, setRank] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'sign-up') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              rank,
            },
          },
        });

        if (error) {
          setMessage(error.message);
          setLoading(false);
          return;
        }

        setMessage('Account created. Check your email if confirmation is enabled, then sign in.');
        setMode('sign-in');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      router.push('/home');
      router.refresh();
    } catch {
      setMessage('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #7a0f2f 0%, #5f0c24 100%)',
        padding: '24px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          display: 'grid',
          gap: 20,
        }}
      >
        <section
          style={{
            padding: '8px 4px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: 'rgba(255,255,255,0.72)',
            }}
          >
            Platoon Operations Hub
          </p>

          <h1
            style={{
              marginTop: 14,
              marginBottom: 0,
              fontSize: 44,
              lineHeight: 0.96,
              fontWeight: 800,
              letterSpacing: '-0.06em',
              color: '#ffffff',
            }}
          >
            Battle Rhythm
          </h1>

          <p
            style={{
              marginTop: 14,
              marginBottom: 0,
              fontSize: 16,
              lineHeight: 1.55,
              color: 'rgba(255,255,255,0.84)',
              maxWidth: 420,
            }}
          >
            Fast, clean platoon scheduling for training, CQ, alerts, leave, DONSAs, and jump operations.
          </p>
        </section>

        <section
          style={{
            background: 'rgba(255,255,255,0.97)',
            borderRadius: 32,
            padding: 24,
            boxShadow: '0 24px 70px rgba(15,23,42,0.24)',
            color: '#0f172a',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 18,
            }}
          >
            <button
              type="button"
              onClick={() => setMode('sign-in')}
              style={{
                flex: 1,
                borderRadius: 18,
                border: mode === 'sign-in' ? 'none' : '1px solid rgba(15,23,42,0.08)',
                background:
                  mode === 'sign-in'
                    ? 'linear-gradient(180deg, #8b1538 0%, #6f102d 100%)'
                    : '#f8fafc',
                color: mode === 'sign-in' ? '#ffffff' : '#334155',
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow:
                  mode === 'sign-in' ? '0 14px 28px rgba(139,21,56,0.22)' : 'none',
              }}
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => setMode('sign-up')}
              style={{
                flex: 1,
                borderRadius: 18,
                border: mode === 'sign-up' ? 'none' : '1px solid rgba(15,23,42,0.08)',
                background:
                  mode === 'sign-up'
                    ? 'linear-gradient(180deg, #8b1538 0%, #6f102d 100%)'
                    : '#f8fafc',
                color: mode === 'sign-up' ? '#ffffff' : '#334155',
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow:
                  mode === 'sign-up' ? '0 14px 28px rgba(139,21,56,0.22)' : 'none',
              }}
            >
              Sign Up
            </button>
          </div>

          <div style={{ marginBottom: 18 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: '#0f172a',
              }}
            >
              {mode === 'sign-in' ? 'Welcome back' : 'Create account'}
            </h2>

            <p
              style={{
                marginTop: 8,
                marginBottom: 0,
                fontSize: 14,
                color: '#64748b',
              }}
            >
              {mode === 'sign-in'
                ? 'Sign in to access your platoon dashboard.'
                : 'Create your account to access schedules, alerts, and duties.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
            {mode === 'sign-up' && (
              <>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  required
                  style={{
                    width: '100%',
                    borderRadius: 18,
                    border: '1px solid rgba(15,23,42,0.10)',
                    background: '#f8fafc',
                    padding: '14px 16px',
                    fontSize: 15,
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />

                <input
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  placeholder="Rank"
                  required
                  style={{
                    width: '100%',
                    borderRadius: 18,
                    border: '1px solid rgba(15,23,42,0.10)',
                    background: '#f8fafc',
                    padding: '14px 16px',
                    fontSize: 15,
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />
              </>
            )}

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              style={{
                width: '100%',
                borderRadius: 18,
                border: '1px solid rgba(15,23,42,0.10)',
                background: '#f8fafc',
                padding: '14px 16px',
                fontSize: 15,
                color: '#0f172a',
                outline: 'none',
              }}
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              style={{
                width: '100%',
                borderRadius: 18,
                border: '1px solid rgba(15,23,42,0.10)',
                background: '#f8fafc',
                padding: '14px 16px',
                fontSize: 15,
                color: '#0f172a',
                outline: 'none',
              }}
            />

            {message && (
              <div
                style={{
                  borderRadius: 18,
                  padding: '14px 16px',
                  background: '#f8fafc',
                  border: '1px solid rgba(15,23,42,0.08)',
                  fontSize: 14,
                  color: '#475569',
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                borderRadius: 18,
                border: 'none',
                background: 'linear-gradient(180deg, #8b1538 0%, #6f102d 100%)',
                color: '#ffffff',
                padding: '15px 18px',
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'default' : 'pointer',
                boxShadow: '0 14px 30px rgba(139,21,56,0.28)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? mode === 'sign-in'
                  ? 'Signing In...'
                  : 'Creating Account...'
                : mode === 'sign-in'
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}