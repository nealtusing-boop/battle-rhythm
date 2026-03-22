'use client';

import { useEffect } from 'react';

export function AlertsBadgeClearer() {
  useEffect(() => {
    async function clearBadge() {
      try {
        const nav = navigator as any;

        if (nav.clearAppBadge) {
          await nav.clearAppBadge();
        } else if (nav.setAppBadge) {
          await nav.setAppBadge(0);
        }
      } catch {
        // ignore
      }

      try {
        const registration = await navigator.serviceWorker.getRegistration();
        registration?.active?.postMessage({ type: 'CLEAR_ALERT_BADGE' });
      } catch {
        // ignore
      }
    }

    void clearBadge();
  }, []);

  return null;
}