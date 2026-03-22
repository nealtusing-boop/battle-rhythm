export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

type ProfileRow = {
  id: string;
  full_name: string | null;
  rank: string | null;
  role: string | null;
};

type WeeklyEventRow = {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
};

type AlertRow = {
  id: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
};

type CqPartnerRow = {
  id: string;
  full_name: string | null;
  rank: string | null;
  role: string | null;
};

type CqShiftRow = {
  id: string;
  shift_date: string;
  soldier_one_id: string | null;
  soldier_two_id: string | null;
  soldier_one?: CqPartnerRow | CqPartnerRow[] | null;
  soldier_two?: CqPartnerRow | CqPartnerRow[] | null;
};

function formatShortDate(dateString: string) {
  return format(new Date(`${dateString}T00:00:00`), 'MMM d, yyyy');
}

function formatLongDate(dateString: string) {
  return format(new Date(`${dateString}T00:00:00`), 'EEEE, MMMM d, yyyy');
}

function normalizeJoinedProfile(
  value: CqPartnerRow | CqPartnerRow[] | null | undefined
): CqPartnerRow | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function priorityColors(priority: AlertRow['priority']) {
  if (priority === 'high') {
    return { bg: '#fee2e2', text: '#991b1b', label: 'High Priority' };
  }
  if (priority === 'medium') {
    return { bg: '#fef3c7', text: '#92400e', label: 'Medium Priority' };
  }
  return { bg: '#dcfce7', text: '#166534', label: 'Low Priority' };
}

export default async function HomePage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: ProfileRow | null = null;
  let events: WeeklyEventRow[] = [];
  let latestAlert: AlertRow | null = null;
  let cq: CqShiftRow[] = [];

  if (user?.id) {
    const [profileResult, eventsResult, alertsResult, cqResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, rank, role')
        .eq('id', user.id)
        .maybeSingle(),

      supabase
        .from('weekly_training_events')
        .select('id, title, event_date, start_time, end_time, location, description')
        .eq('event_date', today)
        .order('start_time', { ascending: true }),

      supabase
        .from('alerts')
        .select('id, message, priority, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from('cq_shifts')
        .select(
          `
            id,
            shift_date,
            soldier_one_id,
            soldier_two_id,
            soldier_one:profiles!cq_shifts_soldier_one_id_fkey(id, full_name, rank, role),
            soldier_two:profiles!cq_shifts_soldier_two_id_fkey(id, full_name, rank, role)
          `
        )
        .gte('shift_date', today)
        .order('shift_date', { ascending: true }),
    ]);

    profile = (profileResult.data as ProfileRow | null) ?? null;
    events = (eventsResult.data as WeeklyEventRow[] | null) ?? [];
    latestAlert = (alertsResult.data as AlertRow | null) ?? null;
    cq = (cqResult.data as CqShiftRow[] | null) ?? [];
  }

  const myUpcomingShift =
    cq.find((shift) => {
      if (!user?.id) return false;
      return shift.soldier_one_id === user.id || shift.soldier_two_id === user.id;
    }) ?? null;

  let cqMessage = 'No upcoming CQ duty';
  let cqPartner = '';
  let cqDate = '';

  if (myUpcomingShift && user?.id) {
    const now = new Date(`${today}T00:00:00`);
    const shiftDate = new Date(`${myUpcomingShift.shift_date}T00:00:00`);
    const diffDays = Math.round((shiftDate.getTime() - now.getTime()) / 86400000);

    cqDate = myUpcomingShift.shift_date;

    const partner =
      myUpcomingShift.soldier_one_id === user.id
        ? normalizeJoinedProfile(myUpcomingShift.soldier_two)
        : normalizeJoinedProfile(myUpcomingShift.soldier_one);

    cqPartner = partner ? [partner.rank, partner.full_name].filter(Boolean).join(' ') : '';

    if (diffDays <= 0) cqMessage = 'You have CQ duty today';
    else if (diffDays === 1) cqMessage = 'You have CQ duty tomorrow';
    else if (diffDays <= 3) cqMessage = `You have CQ duty in ${diffDays} days`;
    else cqMessage = `Next CQ duty is ${formatShortDate(myUpcomingShift.shift_date)}`;
  }

  const displayName =
    [profile?.rank, profile?.full_name].filter(Boolean).join(' ').trim() || 'Soldier';

  return (
    <div style={{ display: 'grid', gap: 20, paddingBottom: 8 }}>
      <section style={{ padding: '4px 2px 0 2px' }}>
        <div style={{ maxWidth: 620 }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: 'rgba(255,255,255,0.72)',
            }}
          >
            Home
          </p>

          <h1
            style={{
              marginTop: 14,
              marginBottom: 0,
              fontSize: 42,
              lineHeight: 1.02,
              fontWeight: 800,
              letterSpacing: '-0.05em',
              color: '#ffffff',
            }}
          >
            Welcome back
          </h1>

          <p
            style={{
              marginTop: 14,
              marginBottom: 0,
              fontSize: 16,
              color: 'rgba(255,255,255,0.82)',
            }}
          >
            {formatLongDate(today)}
          </p>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gap: 20,
        }}
      >
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
              marginBottom: 18,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
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
                Today&apos;s Schedule
              </h2>
              <p
                style={{
                  marginTop: 6,
                  marginBottom: 0,
                  fontSize: 14,
                  color: '#64748b',
                }}
              >
                {displayName ? '' : ''}
              </p>
            </div>

            <div
              style={{
                borderRadius: 999,
                background: '#fff1f2',
                color: '#8b1538',
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Today
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {events.length === 0 && (
              <div
                style={{
                  borderRadius: 22,
                  background: '#f8fafc',
                  padding: 18,
                  border: '1px solid rgba(15,23,42,0.08)',
                }}
              >
                <p style={{ margin: 0, fontSize: 15, color: '#475569' }}>
                  No training events scheduled for today.
                </p>
              </div>
            )}

            {events.map((event) => (
              <div
                key={event.id}
                style={{
                  borderRadius: 22,
                  background: '#f8fafc',
                  padding: 18,
                  border: '1px solid rgba(15,23,42,0.08)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: '#0f172a',
                        fontSize: 18,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {event.title}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 14,
                        color: '#64748b',
                      }}
                    >
                      {event.start_time && event.end_time
                        ? `${event.start_time} - ${event.end_time}`
                        : 'Time TBD'}
                    </div>
                  </div>

                  {event.location && (
                    <div
                      style={{
                        borderRadius: 999,
                        background: '#ffffff',
                        padding: '7px 12px',
                        fontSize: 12,
                        color: '#475569',
                        border: '1px solid rgba(15,23,42,0.08)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {event.location}
                    </div>
                  )}
                </div>

                {event.description && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 14,
                      color: '#475569',
                      lineHeight: 1.55,
                    }}
                  >
                    {event.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gap: 20,
          }}
        >
          <section
            style={{
              background: '#ffffff',
              borderRadius: 30,
              padding: 22,
              boxShadow: '0 18px 44px rgba(15,23,42,0.14)',
              color: '#0f172a',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: '#0f172a',
              }}
            >
              CQ Duty
            </h2>

            <p
              style={{
                marginTop: 6,
                marginBottom: 0,
                fontSize: 14,
                color: '#64748b',
              }}
            >
              {' '}
            </p>

            <div
              style={{
                marginTop: 16,
                borderRadius: 24,
                background: 'linear-gradient(180deg, #fff1f2 0%, #ffffff 100%)',
                padding: 16,
                border: '1px solid #ffe4e6',
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#8b1538',
                  letterSpacing: '-0.02em',
                }}
              >
                {cqMessage}
              </div>

              {cqDate && (
                <div style={{ marginTop: 10, fontSize: 14, color: '#475569' }}>
                  Date: {formatShortDate(cqDate)}
                </div>
              )}

              {cqPartner && (
                <div style={{ marginTop: 6, fontSize: 14, color: '#475569' }}>
                  Partner: {cqPartner}
                </div>
              )}
            </div>
          </section>

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
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 16,
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
                  Latest Alert
                </h2>

                <p
                  style={{
                    marginTop: 6,
                    marginBottom: 0,
                    fontSize: 14,
                    color: '#64748b',
                  }}
                >
                  {' '}
                </p>
              </div>

              <Link
                href="/alerts"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 999,
                  background: '#8b1538',
                  color: '#ffffff',
                  padding: '10px 14px',
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                View All →
              </Link>
            </div>

            {!latestAlert && (
              <div
                style={{
                  borderRadius: 22,
                  background: '#f8fafc',
                  padding: 18,
                  border: '1px solid rgba(15,23,42,0.08)',
                }}
              >
                <p style={{ margin: 0, fontSize: 15, color: '#475569' }}>
                  No active alerts.
                </p>
              </div>
            )}

            {latestAlert && (
              <div
                style={{
                  borderRadius: 22,
                  background: '#ffffff',
                  padding: 18,
                  border: '1px solid rgba(15,23,42,0.08)',
                  boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
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
                    background: priorityColors(latestAlert.priority).bg,
                    color: priorityColors(latestAlert.priority).text,
                  }}
                >
                  {priorityColors(latestAlert.priority).label}
                </div>

                <p
                  style={{
                    marginTop: 12,
                    marginBottom: 0,
                    fontSize: 15,
                    color: '#0f172a',
                    lineHeight: 1.55,
                  }}
                >
                  {latestAlert.message}
                </p>

                <p
                  style={{
                    marginTop: 10,
                    marginBottom: 0,
                    fontSize: 12,
                    color: '#64748b',
                  }}
                >
                  {new Date(latestAlert.created_at).toLocaleString()}
                </p>
              </div>
            )}
          </section>
        </section>
      </section>
    </div>
  );
}
