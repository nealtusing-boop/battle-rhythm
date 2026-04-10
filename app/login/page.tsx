'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

const RANK_OPTIONS = [
  'PVT',
  'PV2',
  'PFC',
  'SPC',
  'CPL',
  'SGT',
  'SSG',
  'SFC',
  'MSG',
  '1SG',
  'SGM',
  'CSM',
  '2LT',
  '1LT',
  'CPT',
  'MAJ',
  'LTC',
  'COL',
] as const;

const fieldStyle = {
  width: '100%',
  borderRadius: 18,
  border: '1px solid rgba(15,23,42,0.10)',
  background: '#f8fafc',
  padding: '14px 16px',
  fontSize: 15,
  color: '#0f172a',
  outline: 'none',
} as const;

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
        if (!firstName.trim() || !lastName.trim()) {
          setMessage('Enter a first and last name.');
          setLoading(false);
          return;
        }

        if (!rank) {
          setMessage('Select a rank.');
          setLoading(false);
          return;
        }

        const fullName = `${firstName.trim()} ${lastName.trim()}`;

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

        setMessage('Account created. You can sign in now.');
        setMode('sign-in');
        setPassword('');
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
          <h1
            style={{
              marginTop: 0,
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
              onClick={() => {
                setMode('sign-in');
                setMessage(null);
              }}
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
              onClick={() => {
                setMode('sign-up');
                setMessage(null);
              }}
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
              {mode === 'sign-in' ? '' : 'Create account'}
            </h2>

            <p
              style={{
                marginTop: 8,
                marginBottom: 0,
                fontSize: 14,
                color: '#64748b',
              }}
            >
              {mode === 'sign-in' ? '' : ''}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
            {mode === 'sign-up' && (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 12,
                  }}
                >
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    required
                    style={fieldStyle}
                  />

                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    required
                    style={fieldStyle}
                  />
                </div>

                <select
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  required
                  style={fieldStyle}
                >
                  <option value="" disabled>
                    Select rank
                  </option>
                  {RANK_OPTIONS.map((rankOption) => (
                    <option key={rankOption} value={rankOption}>
                      {rankOption}
                    </option>
                  ))}
                </select>
              </>
            )}

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              style={fieldStyle}
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              style={fieldStyle}
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
