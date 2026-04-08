'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { AlertsBadgeClearer } from './alerts-badge-clearer';
import { DocumentAttachmentListViewer } from '@/components/document-attachment-viewer';

type AlertAttachment = {
  id: string;
  storage_path: string;
  file_name: string;
  sort_order: number;
  file_type?: string | null;
};

type Alert = {
  id: string;
  message: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean | null;
  attachments: AlertAttachment[];
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

function cardStyle() {
  return {
    borderRadius: 30,
    background: '#ffffff',
    padding: 22,
    boxShadow: '0 18px 44px rgba(15,23,42,0.14)',
    color: '#0f172a',
  } as const;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchAlerts() {
      setLoading(true);

      const { data, error } = await supabase
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
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('expires_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error || !data) {
        setAlerts([]);
        setLoading(false);
        return;
      }

      setAlerts(
        data.map((alert) => ({
          id: alert.id,
          message: alert.message,
          created_at: alert.created_at,
          expires_at: alert.expires_at,
          is_active: alert.is_active,
          attachments: [...(alert.alert_attachments || [])].sort((a, b) => a.sort_order - b.sort_order),
        }))
      );
      setLoading(false);
    }

    void fetchAlerts();
  }, []);

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
        {loading && <div style={cardStyle()}>Loading...</div>}

        {!loading && alerts.length === 0 && <div style={cardStyle()}>No alerts posted yet.</div>}

        {!loading &&
          alerts.map((alert) => (
            <article key={alert.id} style={cardStyle()}>
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

              {alert.attachments.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <DocumentAttachmentListViewer
                    attachments={alert.attachments}
                    buttonLabel={alert.attachments.length === 1 ? 'Open Attachment' : 'Open Attachments'}
                  />
                </div>
              )}
            </article>
          ))}
      </section>
    </div>
  );
}
