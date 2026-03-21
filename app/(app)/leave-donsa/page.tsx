export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

type LeaveDonsaRow = {
  id: string;
  title: string;
  period_type: 'leave' | 'donsa';
  start_date: string;
  end_date: string;
};

function formatShortDate(dateString: string) {
  return format(new Date(`${dateString}T00:00:00`), 'MMM d, yyyy');
}

function renderPeriodCard(
  title: string,
  subtitle: string,
  badge: string,
  badgeBg: string,
  badgeColor: string,
  items: LeaveDonsaRow[]
) {
  return (
    <section
      style={{
        background: '#ffffff',
        borderRadius: 30,
        padding: 22,
        boxShadow: '0 18px 44px rgba(15,23,42,0.14)',
        color: '#0f172a',
      }}
    >
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: '#0f172a',
            }}
          >
            {title}
          </h2>
          <p
            style={{
              marginTop: 6,
              marginBottom: 0,
              fontSize: 14,
              color: '#64748b',
            }}
          >
            {subtitle}
          </p>
        </div>

        <div
          style={{
            borderRadius: 999,
            background: badgeBg,
            color: badgeColor,
            padding: '6px 12px',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {badge}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {items.length === 0 && (
          <div
            style={{
              borderRadius: 22,
              background: '#f8fafc',
              padding: 16,
              border: '1px solid rgba(15,23,42,0.08)',
            }}
          >
            <p style={{ margin: 0, fontSize: 14, color: '#475569' }}>
              Nothing posted.
            </p>
          </div>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            style={{
              borderRadius: 22,
              background: '#f8fafc',
              padding: 18,
              border: '1px solid rgba(15,23,42,0.08)',
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#0f172a',
              }}
            >
              {item.title}
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 14,
                color: '#475569',
              }}
            >
              {formatShortDate(item.start_date)} - {formatShortDate(item.end_date)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function LeaveDonsaPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('leave_donsa_periods')
    .select('id, title, period_type, start_date, end_date')
    .gte('end_date', new Date().toISOString().slice(0, 10))
    .order('start_date', { ascending: true });

  const rows = (data ?? []) as LeaveDonsaRow[];
  const leaveItems = rows.filter((item) => item.period_type === 'leave');
  const donsaItems = rows.filter((item) => item.period_type === 'donsa');

  return (
    <div style={{ display: 'grid', gap: 20 }}>
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
          Leave & DONSAs
        </h1>
        <p
          style={{
            marginTop: 12,
            marginBottom: 0,
            fontSize: 15,
            color: 'rgba(255,255,255,0.82)',
          }}
        >
          Upcoming leave windows and long weekends in a clean two-section view.
        </p>
      </section>

      {renderPeriodCard(
        'Leave',
        'Upcoming leave periods',
        'Leave',
        '#dbeafe',
        '#1d4ed8',
        leaveItems
      )}

      {renderPeriodCard(
        'DONSAs',
        'Upcoming DONSAs and long weekends',
        'DONSA',
        '#ecfccb',
        '#3f6212',
        donsaItems
      )}
    </div>
  );
}