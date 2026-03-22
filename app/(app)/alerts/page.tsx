export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { AlertsBadgeClearer } from './alerts-badge-clearer';

type Alert = {
  id: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
};

function priorityStyle(priority: Alert['priority']) {
  if (priority === 'high') {
    return { background: '#fee2e2', color: '#991b1b', label: 'High' };
  }

  if (priority === 'medium') {
    return { background: '#fef3c7', color: '#92400e', label: 'Medium' };
  }

  return { background: '#dcfce7', color: '#166534', label: 'Low' };
}

export default async function AlertsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('alerts')
    .select('id, message, priority, created_at')
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
          Full alert history with the most recent alerts at the top.
        </p>
      </section>

      <section
        style={{
          display: 'grid',
          gap: 12,
        }}
      >
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

        {alerts.map((alert) => {
          const pill = priorityStyle(alert.priority);

          return (
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
              <div
                style={{
                  display: 'inline-flex',
                  borderRadius: 999,
                  padding: '6px 10px',
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  background: pill.background,
                  color: pill.color,
                }}
              >
                {pill.label}
              </div>

              <p
                style={{
                  marginTop: 12,
                  marginBottom: 0,
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: '#0f172a',
                  overflowWrap: 'anywhere',
                }}
              >
                {alert.message}
              </p>

              <p
                style={{
                  marginTop: 10,
                  marginBottom: 0,
                  fontSize: 12,
                  color: '#64748b',
                  overflowWrap: 'anywhere',
                }}
              >
                {new Date(alert.created_at).toLocaleString()}
              </p>
            </article>
          );
        })}
      </section>
    </div>
  );
}