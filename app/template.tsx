'use client';

import { useEffect, useState } from 'react';
import { AppSplash } from '@/components/app-splash';

export default function ProtectedAppTemplate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReady(true);
    }, 1400);

    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) {
    return <AppSplash subtitle="Loading your platoon dashboard..." />;
  }

  return <>{children}</>;
}