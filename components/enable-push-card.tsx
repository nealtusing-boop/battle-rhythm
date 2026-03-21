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
    <div className="app-card rounded-[24px] p-5">
      <h3 className="text-lg font-semibold">Push Notifications</h3>
      <p className="mt-2 text-sm text-slate-600">
        Enable notifications on this device to receive new alerts.
      </p>
      <button
        onClick={enablePush}
        disabled={loading}
        className="premium-button mt-4 rounded-2xl px-4 py-3 font-semibold disabled:opacity-60"
      >
        {loading ? 'Enabling...' : 'Enable Notifications'}
      </button>
      {status && <p className="mt-3 text-sm text-slate-600">{status}</p>}
    </div>
  );
}