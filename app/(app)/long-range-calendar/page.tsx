import Link from 'next/link';
import { addMonths, endOfMonth, format, parse, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

type LongRangeEvent = {
  id: string;
  title: string;
  location: string | null;
  description: string | null;
  event_date: string;
};

export default async function LongRangeCalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const selectedMonth = params.month
    ? parse(params.month, 'yyyy-MM', new Date())
    : new Date();

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  const supabase = await createClient();

  const { data } = await supabase
    .from('long_range_events')
    .select('id, title, location, description, event_date')
    .gte('event_date', format(monthStart, 'yyyy-MM-dd'))
    .lte('event_date', format(monthEnd, 'yyyy-MM-dd'))
    .order('event_date', { ascending: true });

  const events = (data as LongRangeEvent[] | null) ?? [];

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
          Long Range Calendar
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
            marginBottom: 20,
          }}
        >
          <Link
            href={`/long-range-calendar?month=${format(addMonths(selectedMonth, -1), 'yyyy-MM')}`}
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
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#0f172a',
              }}
            >
              {format(selectedMonth, 'MMMM yyyy')}
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 14,
                color: '#64748b',
              }}
            >
              
            </div>
          </div>

          <Link
            href={`/long-range-calendar?month=${format(addMonths(selectedMonth, 1), 'yyyy-MM')}`}
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

        {events.length === 0 ? (
          <div
            style={{
              borderRadius: 22,
              background: '#f8fafc',
              border: '1px solid rgba(15,23,42,0.08)',
              padding: 18,
            }}
          >
            <p style={{ margin: 0, fontSize: 16, color: '#334155' }}>
              No events posted for this month.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {events.map((event) => (
              <div
                key={event.id}
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
                      {event.title}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 14,
                        color: '#64748b',
                      }}
                    >
                      {format(new Date(`${event.event_date}T00:00:00`), 'MMMM d, yyyy')}
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
                      lineHeight: 1.55,
                      color: '#475569',
                    }}
                  >
                    {event.description}
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