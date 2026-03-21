import Link from 'next/link';
import { addDays, format, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

type WeeklyTrainingEvent = {
  id: string;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  event_date: string;
  location: string | null;
};

function formatTimeRange(start: string | null, end: string | null) {
  if (!start && !end) return null;
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

export default async function WeeklySchedulePage({
  searchParams,
}: {
  searchParams?: Promise<{ day?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const selectedDate = params.day ? parseISO(params.day) : new Date();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const supabase = await createClient();

  const start = format(weekStart, 'yyyy-MM-dd');
  const end = format(addDays(weekStart, 6), 'yyyy-MM-dd');

  const { data } = await supabase
    .from('weekly_training_events')
    .select('id, title, description, start_time, end_time, event_date, location')
    .gte('event_date', start)
    .lte('event_date', end)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true });

  const items = (data as WeeklyTrainingEvent[] | null) ?? [];

  const selectedItems = items.filter((item) =>
    isSameDay(parseISO(item.event_date), selectedDate)
  );

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section style={{ color: '#ffffff' }}>
        <h1
          style={{
            margin: 0,
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: '-0.05em',
            color: '#ffffff',
          }}
        >
          Weekly Schedule
        </h1>

        <p
          style={{
            marginTop: 12,
            marginBottom: 0,
            fontSize: 15,
            color: 'rgba(255,255,255,0.82)',
          }}
        >
          Move left or right through the week, then tap a day to view that day’s training.
        </p>
      </section>

      <section
        style={{
          background: '#ffffff',
          color: '#0f172a',
          borderRadius: 30,
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: '0 18px 44px rgba(15,23,42,0.14)',
          padding: 22,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <Link
            href={`/weekly-schedule?day=${format(addDays(selectedDate, -1), 'yyyy-MM-dd')}`}
            style={{
              height: 46,
              width: 46,
              borderRadius: 16,
              border: '1px solid rgba(15,23,42,0.08)',
              background: '#f8fafc',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            <ChevronLeft size={20} />
          </Link>

          <div style={{ textAlign: 'center', flex: 1 }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#0f172a',
              }}
            >
              {format(selectedDate, 'EEEE')}
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 14,
                color: '#64748b',
              }}
            >
              {format(selectedDate, 'MMMM d, yyyy')}
            </div>
          </div>

          <Link
            href={`/weekly-schedule?day=${format(addDays(selectedDate, 1), 'yyyy-MM-dd')}`}
            style={{
              height: 46,
              width: 46,
              borderRadius: 16,
              border: '1px solid rgba(15,23,42,0.08)',
              background: '#f8fafc',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            <ChevronRight size={20} />
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: 8,
            marginBottom: 20,
          }}
        >
          {weekDays.map((day) => {
            const active = isSameDay(day, selectedDate);

            return (
              <Link
                key={day.toISOString()}
                href={`/weekly-schedule?day=${format(day, 'yyyy-MM-dd')}`}
                style={{
                  borderRadius: 18,
                  border: active ? '1px solid #7a0f2f' : '1px solid rgba(15,23,42,0.08)',
                  background: active ? '#7a0f2f' : '#f8fafc',
                  color: active ? '#ffffff' : '#0f172a',
                  padding: '12px 6px',
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    opacity: active ? 0.9 : 0.6,
                    letterSpacing: '0.08em',
                  }}
                >
                  {format(day, 'EEE')}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {format(day, 'd')}
                </div>
              </Link>
            );
          })}
        </div>

        {selectedItems.length === 0 ? (
          <div
            style={{
              borderRadius: 22,
              background: '#f8fafc',
              border: '1px solid rgba(15,23,42,0.08)',
              padding: 18,
            }}
          >
            <p style={{ margin: 0, fontSize: 16, color: '#334155' }}>
              No training events scheduled for this day.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {selectedItems.map((item) => (
              <div
                key={item.id}
                style={{
                  borderRadius: 22,
                  background: '#f8fafc',
                  border: '1px solid rgba(15,23,42,0.08)',
                  padding: 18,
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
                        color: '#0f172a',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {item.title}
                    </div>

                    {formatTimeRange(item.start_time, item.end_time) && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 14,
                          color: '#64748b',
                        }}
                      >
                        {formatTimeRange(item.start_time, item.end_time)}
                      </div>
                    )}
                  </div>

                  {item.location && (
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
                      {item.location}
                    </div>
                  )}
                </div>

                {item.description && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: '#475569',
                    }}
                  >
                    {item.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}