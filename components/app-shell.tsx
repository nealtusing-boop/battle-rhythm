'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, House, Ellipsis } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Profile } from '@/lib/types';
import { PullToRefresh } from '@/components/pull-to-refresh';

const navItems = [
  { href: '/home', label: 'Home', icon: House },
  { href: '/more', label: 'More', icon: Ellipsis },
] as const;

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const fullName = [profile.rank, profile.full_name].filter(Boolean).join(' ');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const DB_NAME = 'battle-rhythm-push';
    const STORE_NAME = 'meta';
    const REDIRECT_KEYS = ['redirect_to_home', 'pending_notification_redirect'];

    function openPushDb() {
      return new Promise<IDBDatabase>((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    async function getStoredValue(key: string) {
      const db = await openPushDb();

      return new Promise<unknown>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    async function clearStoredValue(key: string) {
      const db = await openPushDb();

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    function goHomeFromNotification() {
      setOpen(false);

      if (window.location.pathname !== '/home') {
        window.location.href = '/home';
      } else {
        router.refresh();
      }
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'OPEN_HOME_FROM_NOTIFICATION') return;
      void Promise.all(REDIRECT_KEYS.map((key) => clearStoredValue(key).catch(() => undefined)));
      goHomeFromNotification();
    };

    async function consumePendingNotificationRedirect() {
      try {
        for (const key of REDIRECT_KEYS) {
          const value = await getStoredValue(key);

          const shouldGoHome =
            value === true ||
            value === '/home' ||
            value === 'true' ||
            value === 'home';

          if (shouldGoHome) {
            await clearStoredValue(key);
            goHomeFromNotification();
            return;
          }
        }
      } catch {
        // ignore notification redirect errors
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    void consumePendingNotificationRedirect();

    const handleFocus = () => {
      void consumePendingNotificationRedirect();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void consumePendingNotificationRedirect();
      }
    };

    const handlePageShow = () => {
      void consumePendingNotificationRedirect();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    async function clearAlertBadge() {
      if (typeof window === 'undefined') return;

      try {
        const nav = navigator as Navigator & {
          clearAppBadge?: () => Promise<void>;
          setAppBadge?: (count?: number) => Promise<void>;
        };

        if (nav.clearAppBadge) {
          await nav.clearAppBadge();
        } else if (nav.setAppBadge) {
          await nav.setAppBadge(0);
        }
      } catch {
        // ignore badge api errors
      }

      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        registrations.forEach((registration) => {
          registration.active?.postMessage({ type: 'CLEAR_ALERT_BADGE' });
        });
      } catch {
        // ignore service worker errors
      }
    }

    void clearAlertBadge();

    const handleFocus = () => {
      void clearAlertBadge();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void clearAlertBadge();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #7a0f2f 0%, #5f0c24 100%)',
        color: '#ffffff',
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background:
            'linear-gradient(180deg, rgba(10,10,12,0.96) 0%, rgba(22,22,26,0.92) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 14px 30px rgba(0,0,0,0.28)',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 760,
            margin: '0 auto',
            padding: '12px 16px 16px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((value) => !value)}
            style={{
              width: 46,
              height: 46,
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.08)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 10px 24px rgba(0,0,0,0.2)',
            }}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <div
              style={{
                fontSize: 12,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.62)',
                marginBottom: 2,
              }}
            >
              Battle Rhythm
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {fullName}
            </div>
          </div>

          <div style={{ width: 46, height: 46 }} />
        </div>
      </header>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.42)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              zIndex: 45,
            }}
          />
          <nav
            style={{
              position: 'fixed',
              top: 'calc(env(safe-area-inset-top) + 86px)',
              left: 16,
              right: 16,
              zIndex: 50,
              maxWidth: 760,
              margin: '0 auto',
              borderRadius: 24,
              padding: 14,
              background: 'rgba(18,18,22,0.92)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ display: 'grid', gap: 10 }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      borderRadius: 18,
                      textDecoration: 'none',
                      color: '#ffffff',
                      background: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                      border: active
                        ? '1px solid rgba(255,255,255,0.16)'
                        : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <span
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        display: 'grid',
                        placeItems: 'center',
                        background: 'rgba(255,255,255,0.08)',
                      }}
                    >
                      <Icon size={18} />
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </>
      )}

      <main style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '16px 16px 120px' }}>
        <PullToRefresh>{children}</PullToRefresh>
      </main>
    </div>
  );
}