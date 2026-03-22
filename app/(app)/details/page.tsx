export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

type AssignmentProfileRow = Pick<Profile, 'id' | 'full_name' | 'rank' | 'role'>;

type DetailAssignmentRow = {
  id: string;
  detail_id: string;
  user_id: string;
  user?: AssignmentProfileRow | AssignmentProfileRow[] | null;
};

type DetailRow = {
  id: string;
  title: string;
  detail_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  leader: string | null;
  notes: string | null;
  assignments?: DetailAssignmentRow[] | null;
};

function normalizeProfile(
  value: AssignmentProfileRow | AssignmentProfileRow[] | null | undefined
): AssignmentProfileRow | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatShortDate(dateString: string) {
  return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeRange(startTime: string | null, endTime: string | null) {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  if (startTime) return startTime;
  if (endTime) return `Until ${endTime}`;
  return 'Time TBD';
}

export default async function DetailsPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    {
      data: { user },
    },
    { data },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('details')
      .select(
        `
          id,
          title,
          detail_date,
          start_time,
          end_time,
          location,
          leader,
          notes,
          assignments:detail_assignments(
            id,
            detail_id,
            user_id,
            user:profiles(id, full_name, rank, role)
          )
        `
      )
      .gte('detail_date', today)
      .order('detail_date', { ascending: true })
      .order('start_time', { ascending: true }),
  ]);

  const details = (data as DetailRow[] | null) ?? [];
  const currentUserId = user?.id ?? null;

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
            Details
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
            Upcoming Details
          </h1>

          <p
            style={{
              marginTop: 14,
              marginBottom: 0,
              fontSize: 16,
              color: 'rgba(255,255,255,0.82)',
            }}
          >

          </p>
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
            marginBottom: 18,
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
            Detail Schedule
          </h2>

          <p
            style={{
              marginTop: 6,
              marginBottom: 0,
              fontSize: 14,
              color: '#64748b',
            }}
          >

          </p>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          {details.length === 0 && (
            <div
              style={{
                borderRadius: 22,
                background: '#f8fafc',
                padding: 18,
                border: '1px solid rgba(15,23,42,0.08)',
              }}
            >
              <p style={{ margin: 0, fontSize: 15, color: '#475569' }}>
                No upcoming details posted.
              </p>
            </div>
          )}

          {details.map((detail) => {
            const roster = (detail.assignments ?? [])
              .map((assignment) => ({
                assignmentId: assignment.id,
                userId: assignment.user_id,
                profile: normalizeProfile(assignment.user),
              }))
              .filter(
                (entry): entry is { assignmentId: string; userId: string; profile: AssignmentProfileRow } =>
                  Boolean(entry.profile)
              );

            return (
              <div
                key={detail.id}
                style={{
                  borderRadius: 24,
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
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: '#0f172a',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {detail.title}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 14,
                        color: '#64748b',
                        lineHeight: 1.6,
                      }}
                    >
                      {formatShortDate(detail.detail_date)} • {formatTimeRange(detail.start_time, detail.end_time)}
                      {detail.location ? ` • ${detail.location}` : ''}
                    </div>

                    {detail.leader && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 14,
                          color: '#475569',
                        }}
                      >
                        OIC / NCOIC: {detail.leader}
                      </div>
                    )}
                  </div>
                </div>

                {detail.notes && (
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 14,
                      color: '#475569',
                      lineHeight: 1.55,
                    }}
                  >
                    {detail.notes}
                  </div>
                )}

                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      marginBottom: 10,
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      color: '#64748b',
                    }}
                  >
                    Assigned Personnel
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    {roster.length === 0 && (
                      <div
                        style={{
                          borderRadius: 18,
                          background: '#ffffff',
                          padding: 14,
                          border: '1px solid rgba(15,23,42,0.08)',
                          fontSize: 14,
                          color: '#64748b',
                        }}
                      >
                        No one assigned yet.
                      </div>
                    )}

                    {roster.map(({ assignmentId, userId, profile }) => {
                      const isMe = Boolean(currentUserId && userId === currentUserId);

                      return (
                        <div
                          key={assignmentId}
                          style={{
                            borderRadius: 18,
                            background: isMe ? '#dcfce7' : '#ffffff',
                            padding: 14,
                            border: isMe
                              ? '1.5px solid #86efac'
                              : '1px solid rgba(15,23,42,0.08)',
                            fontSize: 14,
                            color: isMe ? '#166534' : '#0f172a',
                            fontWeight: isMe ? 700 : 600,
                          }}
                        >
                          {[profile.rank, profile.full_name].filter(Boolean).join(' ')}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
