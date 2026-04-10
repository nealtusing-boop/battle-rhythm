'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

const RANKS = [
  'PVT','PV2','PFC','SPC','CPL',
  'SGT','SSG','SFC','MSG','1SG',
  'SGM','CSM',
  '2LT','1LT','CPT','MAJ','LTC','COL'
];

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rank, setRank] = useState('');
  const [status, setStatus] = useState('');

  async function handleSignup() {
    if (!firstName || !lastName) {
      setStatus('Enter first and last name.');
      return;
    }

    if (!rank) {
      setStatus('Select a rank.');
      return;
    }

    const fullName = `${firstName} ${lastName}`;

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
      setStatus(error.message);
    } else {
      setStatus('Account created. You can log in now.');
    }
  }

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus(error.message);
    } else {
      setStatus('Logged in.');
      window.location.href = '/home';
    }
  }

  return (
    <div style={{ padding: 20, display: 'grid', gap: 12 }}>
      <h1>Login / Signup</h1>

      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

      <input placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      <input placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />

      <select value={rank} onChange={(e) => setRank(e.target.value)}>
        <option value="">Select rank</option>
        {RANKS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <button onClick={handleSignup}>Sign Up</button>
      <button onClick={handleLogin}>Login</button>

      {status && <p>{status}</p>}
    </div>
  );
}
