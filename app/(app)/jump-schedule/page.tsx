export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

type ProfileRow = {
  id: string;
  full_name: string | null;
  rank: string | null;
};

type ManifestEntry = {
  id: string;
  jump_id: string;
  soldier_id: string;
  sort_order: number;
  soldier?: ProfileRow | ProfileRow[] | null;
};

type JumpRow = {
  id: string;
  name: string;
  location: string;
  jump_date: string;
  jump_type: 'Hollywood' | 'Combat';
  equipment_list: string[] | null;
  manifest?: ManifestEntry[] | null;
};

function formatShortDate(dateString: string) {
  return format(new Date(`${dateString}T00:00:00`), 'EEEE, MMMM d, yyyy');
}

function normalizeProfile(value: ProfileRow | ProfileRow[] | null | undefined) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function JumpSchedulePage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('jumps')
    .select(
      `
        id,
        name,
        location,
        jump_date,
        jump_type,
        equipment_list,
        manifest:jump_manifest(
          id,
          jump_id,
          soldier_id,
          sort_order,
          soldier:profiles(id, full_name, rank)
        )
      `
    )
    .gte('jump_date', new Date().toISOString().slice(0, 10))
    .order('jump_date', { ascending: true });

  const jumps = (data as JumpRow[] | null) ?? [];

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
          Jump Schedule
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

      {jumps.length === 0 && (
        <section
          style={{
            background: '#ffffff',
            borderRadius: 30,
            padding: 22,
            boxShadow: '0 18px 44px rgba(15,23,42,0.14)',
            color: '#0f172a',
          }}
        >
          <p style={{ margin: 0, fontSize: 15, color: '#475569' }}>
            No upcoming jumps posted.
          </p>
        </section>
      )}

      {jumps.map((jump) => {
        const manifest = [...(jump.manifest ?? [])].sort((a, b) => a.sort_order - b.sort_order);

        return (
          <section
            key={jump.id}
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
                  {jump.name}
                </h2>

                <p
                  style={{
                    marginTop: 8,
                    marginBottom: 0,
                    fontSize: 15,
                    color: '#475569',
                  }}
                >
                  {jump.location}
                </p>

                <p
                  style={{
                    marginTop: 6,
                    marginBottom: 0,
                    fontSize: 14,
                    color: '#64748b',
                  }}
                >
                  {formatShortDate(jump.jump_date)}
                </p>
              </div>

              <div
                style={{
                  borderRadius: 999,
                  padding: '8px 12px',
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  background: jump.jump_type === 'Combat' ? '#fee2e2' : '#dcfce7',
                  color: jump.jump_type === 'Combat' ? '#991b1b' : '#166534',
                }}
              >
                {jump.jump_type}
              </div>
            </div>

            {jump.jump_type === 'Combat' && (jump.equipment_list?.length ?? 0) > 0 && (
              <div
                style={{
                  marginTop: 18,
                  borderRadius: 24,
                  background: '#fff7ed',
                  padding: 16,
                  border: '1px solid #fed7aa',
                }}
              >
                <div
                  style={{
                    marginBottom: 10,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#9a3412',
                  }}
                >
                  Equipment
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  {(jump.equipment_list ?? []).map((item) => (
                    <div
                      key={item}
                      style={{
                        borderRadius: 16,
                        background: '#ffffff',
                        padding: '10px 12px',
                        border: '1px solid rgba(154,52,18,0.10)',
                        fontSize: 14,
                        color: '#7c2d12',
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  marginBottom: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#64748b',
                }}
              >
                Manifest ({manifest.length})
              </div>

              {manifest.length === 0 ? (
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
                  No manifest posted yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {manifest.map((entry, index) => {
                    const soldier = normalizeProfile(entry.soldier);

                    return (
                      <div
                        key={entry.id}
                        style={{
                          borderRadius: 20,
                          background: '#f8fafc',
                          padding: '14px 16px',
                          border: '1px solid rgba(15,23,42,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 999,
                              background: '#ffffff',
                              border: '1px solid rgba(15,23,42,0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#64748b',
                            }}
                          >
                            {index + 1}
                          </div>

                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 600,
                              color: '#0f172a',
                            }}
                          >
                            {soldier
                              ? [soldier.rank, soldier.full_name].filter(Boolean).join(' ')
                              : 'Unassigned'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}