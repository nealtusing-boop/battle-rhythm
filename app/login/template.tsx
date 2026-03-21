'use client';

import { useEffect, useState } from 'react';
import { AppSplash } from '@/components/app-splash';

const SPLASH_DURATION_MS = 2200;
const SPLASH_SEEN_KEY = 'battle-rhythm-login-splash-seen';
const FORCE_SPLASH_KEY = 'battle-rhythm-force-login-splash';

export default function LoginTemplate({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const forced = window.sessionStorage.getItem(FORCE_SPLASH_KEY) === '1';
    const seen = window.sessionStorage.getItem(SPLASH_SEEN_KEY) === '1';

    if (forced) {
      window.sessionStorage.removeItem(FORCE_SPLASH_KEY);
      window.sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
      setShowSplash(true);
      setReady(false);

      const timer = window.setTimeout(() => {
        setShowSplash(false);
        setReady(true);
      }, SPLASH_DURATION_MS);

      return () => window.clearTimeout(timer);
    }

    if (!seen) {
      window.sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
      setShowSplash(true);
      setReady(false);

      const timer = window.setTimeout(() => {
        setShowSplash(false);
        setReady(true);
      }, SPLASH_DURATION_MS);

      return () => window.clearTimeout(timer);
    }

    setShowSplash(false);
    setReady(true);
  }, []);

  if (!ready || showSplash) {
    return <AppSplash subtitle="Preparing secure access..." />;
  }

  return <>{children}</>;
}