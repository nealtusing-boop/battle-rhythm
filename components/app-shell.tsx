'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  House,
  CalendarDays,
  CalendarRange,
  Plane,
  ClipboardList,
  Ellipsis,
  Bell,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Profile } from '@/lib/types';
import { PullToRefresh } from '@/components/pull-to-refresh';

const navItems = [
  { href: '/home', label: 'Home', icon: House },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/weekly-schedule', label: 'Weekly Schedule', icon: CalendarDays },
  { href: '/long-range-calendar', label: 'Long Range Calendar', icon: CalendarRange },
  { href: '/leave-donsa', label: 'Leave & DONSAs', icon: ClipboardList },
  { href: '/jump-schedule', label: 'Jump Schedule', icon: Plane },
  { href: '/cq-roster', label: 'CQ Roster', icon: ClipboardList },
  { href: '/details', label: 'Details', icon: Users },
  { href: '/more', label: 'More', icon: Ellipsis },
];

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const fullName = [profile.rank, profile.full_name].filter(Boolean).join(' ');

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
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
            padding: '12px 16px 14px 16px',
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
                fontSize: 28,
                fontWeight: 700,
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
                marginTop: 6,
                fontSize: 12,
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
