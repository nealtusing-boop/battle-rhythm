'use client';

import { useState } from 'react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function EnablePushCard() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function enablePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('Push notifications are not supported on this device/browser.');
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!publicKey) {
      setStatus('Push notifications are not configured yet.');
      return;
    }

    try {
      setLoading(true);

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('Notification permission was not granted.');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        throw new Error('Subscription save failed.');
      }

      setStatus('Push notifications enabled. New alerts will notify this device.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to enable notifications.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h3
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 700,
          color: '#0f172a',
        }}
      >
        Push Notifications
      </h3>

      <p
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.5,
          color: '#64748b',
        }}
      >
        
      </p>

      <button
        type="button"
        onClick={enablePush}
        disabled={loading}
        style={{
          width: '100%',
          borderRadius: 18,
          border: 'none',
          background: 'linear-gradient(180deg, #8b1538 0%, #6f102d 100%)',
          color: '#ffffff',
          padding: '14px 18px',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 14px 30px rgba(139,21,56,0.28)',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Enabling...' : 'Enable Notifications'}
      </button>

      {status && (
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.5,
            color: '#64748b',
          }}
        >
          {status}
        </p>
      )}
    </div>
  );
}