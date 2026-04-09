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
    const REDIRECT_KEYS = ['redirect_to_home', 'pending_notification_redirect'] as const;

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

    function goHomeFromNotification(rawUrl?: string) {
      setOpen(false);
      const targetUrl = rawUrl && rawUrl.startsWith('/home')
        ? (rawUrl.includes('notification=1') ? rawUrl : '/home?notification=1')
        : '/home?notification=1';

      if (window.location.pathname !== '/home' || !window.location.search.includes('notification=1')) {
        window.location.assign(targetUrl);
        return;
      }

      router.replace('/home?notification=1');
      router.refresh();
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'OPEN_HOME_FROM_NOTIFICATION') return;
      const targetUrl = typeof event.data?.url === 'string' ? event.data.url : '/home?notification=1';
      void Promise.all(REDIRECT_KEYS.map((key) => clearStoredValue(key).catch(() => undefined)));
      goHomeFromNotification(targetUrl);
    };

    async function consumePendingNotificationRedirect() {
      try {
        for (const key of REDIRECT_KEYS) {
          const pendingRedirect = await getStoredValue(key);
          const redirectValue = typeof pendingRedirect === 'string' ? pendingRedirect : '';
          const shouldGoHome =
            pendingRedirect === true ||
            pendingRedirect === 'true' ||
            redirectValue === '/home' ||
            redirectValue === 'home' ||
            redirectValue.startsWith('/home?');

          if (!shouldGoHome) continue;

          await clearStoredValue(key);
          goHomeFromNotification(redirectValue || '/home?notification=1');
          return;
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
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'linear-gradient(180deg, #8b1538 0%, #6f102d 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 14px 30px rgba(139,21,56,0.32)',
              flexShrink: 0,
            }}
          >
            {open ? <X size={20} color="#ffffff" /> : <Menu size={20} color="#ffffff" />}
          </button>

          <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Battle Rhythm
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.78)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {fullName}
            </div>
          </div>

          <div style={{ width: 46, height: 46, flexShrink: 0 }} />
        </div>
      </header>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(15, 23, 42, 0.32)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            padding: 'calc(env(safe-area-inset-top) + 72px) 16px 16px 16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 760,
              margin: '0 auto',
            }}
          >
            <nav
              onClick={(e) => e.stopPropagation()}
              style={{
                overflow: 'hidden',
                borderRadius: 28,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.97)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
              }}
            >
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '16px 18px',
                      borderBottom:
                        index === navItems.length - 1
                          ? 'none'
                          : '1px solid rgba(15,23,42,0.06)',
                      textDecoration: 'none',
                      color: '#0f172a',
                      background: active ? '#f8fafc' : 'transparent',
                      fontWeight: active ? 700 : 600,
                      fontSize: 16,
                    }}
                  >
                    <Icon size={18} color="#0f172a" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <main
        style={{
          width: '100%',
          maxWidth: 760,
          margin: '0 auto',
          padding: '24px 16px calc(40px + env(safe-area-inset-bottom)) 16px',
        }}
      >
        <PullToRefresh>{children}</PullToRefresh>
      </main>
    </div>
  );
}
