export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { AlertsBadgeClearer } from './alerts-badge-clearer';

type Alert = {
  id: string;
  message: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean | null;
};

function formatDateTime(value: string | null) {
  if (!value) return 'No date';
  return new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default async function AlertsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('alerts')
    .select('id, message, created_at, expires_at, is_active')
    .eq('is_active', true)
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('expires_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  const alerts = (data ?? []) as Alert[];

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <AlertsBadgeClearer />

      <section>
        <h1
          style={{
            margin: 0,
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: '-0.05em',
            color: '#ffffff',
          }}
        >
          Alerts
        </h1>
        <p
          style={{
            marginTop: 12,
            marginBottom: 0,
            fontSize: 15,
            color: 'rgba(255,255,255,0.82)',
          }}
        >
          Active alerts only. Expired alerts are removed automatically.
        </p>
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        {alerts.length === 0 && (
          <div
            style={{
              borderRadius: 30,
              background: '#ffffff',
              padding: 22,
              boxShadow: '0 18px 44px rgba(15,23,42,0.14)',
              color: '#475569',
            }}
          >
            No alerts posted yet.
          </div>
        )}

        {alerts.map((alert) => (
          <article
            key={alert.id}
            style={{
              borderRadius: 30,
              background: '#ffffff',
              padding: 22,
              boxShadow: '0 18px 44px rgba(15,23,42,0.14)',
              color: '#0f172a',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.6,
                color: '#0f172a',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}
            >
              {alert.message}
            </p>

            <p
              style={{
                marginTop: 12,
                marginBottom: 0,
                fontSize: 12,
                color: '#64748b',
                overflowWrap: 'anywhere',
              }}
            >
              Posted {formatDateTime(alert.created_at)}
              {alert.expires_at ? ` • Expires ${formatDateTime(alert.expires_at)}` : ''}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
