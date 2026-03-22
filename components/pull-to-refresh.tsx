'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export function PullToRefresh({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const refreshingRef = useRef(false);

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function runRefresh() {
    if (refreshingRef.current) return;

    refreshingRef.current = true;
    setIsRefreshing(true);
    router.refresh();
    await new Promise((resolve) => setTimeout(resolve, 700));
    setIsRefreshing(false);
    setPullDistance(0);
    refreshingRef.current = false;
  }

  useEffect(() => {
    function handleFocus() {
      router.refresh();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    }

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (window.scrollY > 0 || refreshingRef.current) return;
    startYRef.current = event.touches[0]?.clientY ?? null;
    pullingRef.current = true;
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (!pullingRef.current || startYRef.current == null || refreshingRef.current) return;
    if (window.scrollY > 0) return;

    const currentY = event.touches[0]?.clientY ?? startYRef.current;
    const delta = currentY - startYRef.current;

    if (delta <= 0) {
      setPullDistance(0);
      return;
    }

    const limited = Math.min(delta * 0.45, 84);
    setPullDistance(limited);
  }

  async function handleTouchEnd() {
    if (!pullingRef.current || refreshingRef.current) return;

    const shouldRefresh = pullDistance >= 54;
    pullingRef.current = false;
    startYRef.current = null;

    if (shouldRefresh) {
      await runRefresh();
      return;
    }

    setPullDistance(0);
  }

  const indicatorText = isRefreshing
    ? 'Refreshing...'
    : pullDistance >= 54
      ? 'Release to refresh'
      : 'Pull to refresh';

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ minHeight: '100%' }}
    >
      <div
        style={{
          height: pullDistance,
          opacity: pullDistance > 0 || isRefreshing ? 1 : 0,
          transition: isRefreshing ? 'height 160ms ease' : 'opacity 160ms ease',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            marginBottom: 10,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.92)',
            color: '#8b1538',
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            boxShadow: '0 10px 24px rgba(15,23,42,0.12)',
          }}
        >
          {indicatorText}
        </div>
      </div>

      {children}
    </div>
  );
}
