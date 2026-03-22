export const dynamic = 'force-dynamic';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth';
import { AlertsBadgeClearer } from './alerts-badge-clearer';

type Alert = {
  id: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  requires_ack: boolean | null;
  created_by: string | null;
  expires_at: string | null;
  is_active: boolean | null;
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

async function acknowledgeAlert(formData: FormData) {
  'use server';

  const alertId = formData.get('alert_id');

  if (typeof alertId !== 'string' || !alertId) {
    return;
  }

  const session = await getSessionProfile(true);
  const supabase = await createClient();

  const { data: alert } = await supabase
    .from('alerts')
    .select('id, created_by, requires_ack, expires_at, is_active')
    .eq('id', alertId)
    .single<{
      id: string;
      created_by: string | null;
      requires_ack: boolean | null;
      expires_at: string | null;
      is_active: boolean | null;
    }>();

  const isVisible =
    !!alert &&
    alert.is_active !== false &&
    (!alert.expires_at || new Date(alert.expires_at).getTime() > Date.now());

  if (!alert?.requires_ack || !isVisible) {
    revalidatePath('/alerts');
    revalidatePath('/admin');
    return;
  }

  if (alert.created_by === session!.user.id) {
    await supabase
      .from('alert_acknowledgements')
      .delete()
      .eq('alert_id', alertId)
      .eq('user_id', session!.user.id);

    revalidatePath('/alerts');
    revalidatePath('/admin');
    return;
  }

  await supabase.from('alert_acknowledgements').upsert(
    {
      alert_id: alertId,
      user_id: session!.user.id,
    },
    {
      onConflict: 'alert_id,user_id',
      ignoreDuplicates: false,
    }
  );

  revalidatePath('/alerts');
  revalidatePath('/admin');
}

export default async function AlertsPage() {
  const session = await getSessionProfile(true);
  const supabase = await createClient();

  const [{ data: alertsData }, { data: acknowledgementsData }] = await Promise.all([
    supabase
      .from('alerts')
      .select('id, message, priority, created_at, requires_ack, created_by, expires_at, is_active')
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: false }),
    supabase
      .from('alert_acknowledgements')
      .select('alert_id')
      .eq('user_id', session!.user.id),
  ]);

  const alerts = (alertsData ?? []) as Alert[];
  const acknowledgedAlertIds = new Set(
    (acknowledgementsData ?? []).map((ack) => ack.alert_id as string)
  );

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
          const isPoster = alert.created_by === session!.user.id;
          const isAcknowledged = isPoster ? true : acknowledgedAlertIds.has(alert.id);

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
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
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

                {alert.requires_ack && (
                  <div
                    style={{
                      display: 'inline-flex',
                      borderRadius: 999,
                      padding: '6px 10px',
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      background: '#ede9fe',
                      color: '#5b21b6',
                    }}
                  >
                    Acknowledgement required
                  </div>
                )}
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

              {alert.requires_ack && !isPoster && (
                <div style={{ marginTop: 14 }}>
                  {isAcknowledged ? (
                    <div
                      style={{
                        display: 'inline-flex',
                        borderRadius: 999,
                        padding: '10px 14px',
                        fontSize: 13,
                        fontWeight: 800,
                        background: '#dcfce7',
                        color: '#166534',
                      }}
                    >
                      Acknowledged ✓
                    </div>
                  ) : (
                    <form action={acknowledgeAlert}>
                      <input type="hidden" name="alert_id" value={alert.id} />
                      <button
                        type="submit"
                        style={{
                          borderRadius: 18,
                          border: 'none',
                          background: 'linear-gradient(180deg, #8b1538 0%, #6f102d 100%)',
                          color: '#ffffff',
                          padding: '12px 16px',
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 14px 30px rgba(139,21,56,0.22)',
                        }}
                      >
                        Acknowledge
                      </button>
                    </form>
                  )}
                </div>
              )}

              {alert.requires_ack && isPoster && (
                <div
                  style={{
                    marginTop: 14,
                    display: 'inline-flex',
                    borderRadius: 999,
                    padding: '10px 14px',
                    fontSize: 13,
                    fontWeight: 800,
                    background: '#f1f5f9',
                    color: '#475569',
                  }}
                >
                  You posted this alert
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
