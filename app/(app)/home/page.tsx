
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { DocumentAttachmentListViewer } from '@/components/document-attachment-viewer';

type ProfileRow = {
  id: string;
  full_name: string | null;
  rank: string | null;
};

type AlertAttachment = {
  id: string;
  storage_path: string;
  file_name: string;
  sort_order: number;
  file_type?: string | null;
};

type AlertRow = {
  id: string;
  message: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean | null;
  alert_attachments?: AlertAttachment[] | null;
};

function formatLongDate(dateString: string) {
  return format(new Date(`${dateString}T00:00:00`), 'EEEE, MMMM d, yyyy');
}

function isAlertActive(alert: AlertRow) {
  if (alert.is_active === false) return false;
  if (!alert.expires_at) return true;
  return new Date(alert.expires_at).getTime() > Date.now();
}

function alertSortValue(alert: AlertRow) {
  if (alert.expires_at) return new Date(alert.expires_at).getTime();
  return Number.MAX_SAFE_INTEGER;
}


function getAlertTitle(message: string) {
  const trimmed = message.trim();
  if (!trimmed) return 'Untitled alert';

  const firstLine = trimmed.split('\n').find((line) => line.trim().length > 0)?.trim() ?? trimmed;

  if (firstLine.length <= 70) return firstLine;
  return `${firstLine.slice(0, 67).trimEnd()}...`;
}

function cardStyle() {
  return {
    background: '#ffffff',
    borderRadius: 28,
    padding: 22,
    boxShadow: '0 18px 44px rgba(15,23,42,0.14)',
    color: '#0f172a',
  } as const;
}

function actionButtonStyle(primary = true) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    border: primary ? 'none' : '1px solid rgba(15,23,42,0.10)',
    background: primary
      ? 'linear-gradient(180deg, #8b1538 0%, #6f102d 100%)'
      : '#f8fafc',
    color: primary ? '#ffffff' : '#0f172a',
    padding: '14px 18px',
    minHeight: 50,
    fontSize: 15,
    fontWeight: 800,
    textDecoration: 'none',
    boxShadow: primary ? '0 14px 30px rgba(139,21,56,0.22)' : 'none',
    whiteSpace: 'nowrap' as const,
  } as const;
}

const hubLinks = [
  {
    href: '/weekly-training',
    title: 'PLT Training Calendar',
    description: '',
  },
  {
    href: '/long-range',
    title: 'Long Range Calendar',
    description: '',
  },
  {
    href: '/cq-roster',
    title: 'CQ / Staff Duty Roster',
    description: '',
  },
  {
    href: '/pt-plans',
    title: 'PT Plans',
    description: '',
  },
  {
    href: '/resources',
    title: "SOP's & Resources",
    description: '',
  },
] as const;

export default async function HomePage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: ProfileRow | null = null;
  let alerts: AlertRow[] = [];

  if (user?.id) {
    const [profileResult, alertsResult] = await Promise.all([
      supabase.from('profiles').select('id, full_name, rank').eq('id', user.id).maybeSingle(),
      supabase
        .from('alerts')
        .select(
          `
            id,
            message,
            created_at,
            expires_at,
            is_active,
            alert_attachments (
              id,
              storage_path,
              file_name,
              sort_order,
              file_type
            )
          `
        )
        .order('created_at', { ascending: false }),
    ]);

    profile = (profileResult.data as ProfileRow | null) ?? null;
    alerts = (alertsResult.data as AlertRow[] | null) ?? [];
  }

  const activeAlerts = alerts
    .filter(isAlertActive)
    .slice()
    .sort((a, b) => {
      const dateDiff = alertSortValue(a) - alertSortValue(b);
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const displayName = [profile?.rank, profile?.full_name].filter(Boolean).join(' ').trim() || 'Soldier';

  return (
    <div style={{ display: 'grid', gap: 20, paddingBottom: 10 }}>
      <section style={{ padding: '4px 2px 0 2px' }}>
        <div style={{ maxWidth: 620 }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: 'rgba(255,255,255,0.72)',
            }}
          >
            Home
          </p>

          <h1
            style={{
              marginTop: 14,
              marginBottom: 0,
              fontSize: 28,
              lineHeight: 1.02,
              fontWeight: 800,
              letterSpacing: '-0.05em',
              color: '#ffffff',
            }}
          >
            {formatLongDate(today)}
          </h1>

         

          
        </div>
      </section>

      <section style={{ display: 'grid', gap: 20 }}>
        <section style={cardStyle()}>
          <div style={{ marginBottom: 18 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                lineHeight: 1.02,
                fontWeight: 800,
                letterSpacing: '-0.04em',
              }}
            >
              Active Alerts
            </h2>

            <p
              style={{
                marginTop: 10,
                marginBottom: 0,
                fontSize: 14,
                color: '#64748b',
                maxWidth: 560,
              }}
            >
              
            </p>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {activeAlerts.length === 0 && (
              <div
                style={{
                  borderRadius: 22,
                  background: '#f8fafc',
                  padding: 16,
                  border: '1px solid rgba(15,23,42,0.08)',
                  fontSize: 14,
                  color: '#475569',
                }}
              >
                No active alerts.
              </div>
            )}

            {activeAlerts.map((alert) => {
              const attachments = [...(alert.alert_attachments || [])].sort((a, b) => a.sort_order - b.sort_order);

              return (
                <div
                  key={alert.id}
                  style={{
                    borderRadius: 22,
                    background: '#f8fafc',
                    padding: 16,
                    border: '1px solid rgba(15,23,42,0.08)',
                    minWidth: 0,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#0f172a',
                      overflowWrap: 'anywhere',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {alert.message.trim() || 'Untitled alert'}
                  </p>

                  {attachments.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <DocumentAttachmentListViewer
                        attachments={attachments}
                        buttonLabel={attachments.length === 1 ? 'Open Attachment' : 'Open Attachments'}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section style={cardStyle()}>
          <div style={{ marginBottom: 18 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                lineHeight: 1.02,
                fontWeight: 800,
                letterSpacing: '-0.04em',
              }}
            >
              Information Hub
            </h2>

            <p
              style={{
                marginTop: 10,
                marginBottom: 0,
                fontSize: 14,
                color: '#64748b',
                maxWidth: 560,
              }}
            >
              
            </p>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {hubLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  borderRadius: 22,
                  background: '#f8fafc',
                  padding: 16,
                  border: '1px solid rgba(15,23,42,0.08)',
                  display: 'block',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 800,
                        color: '#0f172a',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {item.title}
                    </p>

                    <p
                      style={{
                        marginTop: 8,
                        marginBottom: 0,
                        fontSize: 14,
                        lineHeight: 1.55,
                        color: '#64748b',
                      }}
                    >
                      {item.description}
                    </p>
                  </div>

                  <span style={actionButtonStyle(false)}>Open</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
