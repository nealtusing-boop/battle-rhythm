export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

type ProfileRow = {
  id: string;
  full_name: string | null;
  rank: string | null;
};

type JoinedProfile = ProfileRow | ProfileRow[] | null | undefined;

type CqShiftRow = {
  id: string;
  shift_date: string;
  soldier_one_id: string | null;
  soldier_two_id: string | null;
  soldier_one?: JoinedProfile;
  soldier_two?: JoinedProfile;
};

function normalizeProfile(value: JoinedProfile): ProfileRow | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatShiftDate(dateString: string) {
  return format(new Date(`${dateString}T00:00:00`), 'EEEE, MMMM d, yyyy');
}

export default async function CqRosterPage() {
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
      .from('cq_shifts')
      .select(
        `
          id,
          shift_date,
          soldier_one_id,
          soldier_two_id,
          soldier_one:profiles!cq_shifts_soldier_one_id_fkey(id, full_name, rank),
          soldier_two:profiles!cq_shifts_soldier_two_id_fkey(id, full_name, rank)
        `
      )
      .gte('shift_date', today)
      .order('shift_date', { ascending: true }),
  ]);

  const shifts = (data as CqShiftRow[] | null) ?? [];
  const currentUserId = user?.id ?? null;

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
          CQ Roster
        </h1>
        <p
          style={{
            marginTop: 12,
            marginBottom: 0,
            fontSize: 15,
            color: 'rgba(255,255,255,0.82)',
          }}
        >

        </p>
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
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
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
              Upcoming Shifts
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
            CQ
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {shifts.length === 0 && (
            <div
              style={{
                borderRadius: 22,
                background: '#f8fafc',
                padding: 18,
                border: '1px solid rgba(15,23,42,0.08)',
              }}
            >
              <p style={{ margin: 0, fontSize: 15, color: '#475569' }}>
                No upcoming CQ shifts posted.
              </p>
            </div>
          )}

          {shifts.map((shift) => {
            const soldierOne = normalizeProfile(shift.soldier_one);
            const soldierTwo = normalizeProfile(shift.soldier_two);
            const soldierOneIsMe = Boolean(currentUserId && shift.soldier_one_id === currentUserId);
            const soldierTwoIsMe = Boolean(currentUserId && shift.soldier_two_id === currentUserId);

            return (
              <div
                key={shift.id}
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
                  <div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        color: '#0f172a',
                      }}
                    >
                      {formatShiftDate(shift.shift_date)}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 14,
                        color: '#64748b',
                      }}
                    >

                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 999,
                      background: '#ffffff',
                      padding: '7px 12px',
                      fontSize: 12,
                      color: '#475569',
                      border: '1px solid rgba(15,23,42,0.08)',
                    }}
                  >
                    {format(new Date(`${shift.shift_date}T00:00:00`), 'MMM d')}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 18,
                      background: soldierOneIsMe ? '#f8fafc' : '#ffffff',
                      border: soldierOneIsMe
                        ? '2px solid rgba(139,21,56,0.35)'
                        : '1px solid rgba(15,23,42,0.08)',
                      padding: '14px 16px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.14em',
                        color: soldierOneIsMe ? '#8b1538' : '#94a3b8',
                        marginBottom: 8,
                      }}
                    >
                      Soldier One
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: soldierOneIsMe ? 800 : 600,
                        color: '#0f172a',
                      }}
                    >
                      {soldierOne
                        ? [soldierOne.rank, soldierOne.full_name].filter(Boolean).join(' ')
                        : 'Unassigned'}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 18,
                      background: soldierTwoIsMe ? '#f8fafc' : '#ffffff',
                      border: soldierTwoIsMe
                        ? '2px solid rgba(139,21,56,0.35)'
                        : '1px solid rgba(15,23,42,0.08)',
                      padding: '14px 16px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.14em',
                        color: soldierTwoIsMe ? '#8b1538' : '#94a3b8',
                        marginBottom: 8,
                      }}
                    >
                      Soldier Two
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: soldierTwoIsMe ? 800 : 600,
                        color: '#0f172a',
                      }}
                    >
                      {soldierTwo
                        ? [soldierTwo.rank, soldierTwo.full_name].filter(Boolean).join(' ')
                        : 'Unassigned'}
                    </div>
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
