'use client';

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import type { AlertPriority, JumpType, Profile } from '@/lib/types';

const tabs = [
  { id: 'alerts', label: 'Alerts' },
  { id: 'weekly', label: 'Weekly Schedule' },
  { id: 'calendar', label: 'Long Range' },
  { id: 'leave', label: 'Leave & DONSAs' },
  { id: 'jump', label: 'Jump Schedule' },
  { id: 'cq', label: 'CQ Roster' },
  { id: 'details', label: 'Details' },
  { id: 'users', label: 'Users' },
] as const;

type TabId = (typeof tabs)[number]['id'];

type AlertExpirationOption = '24h' | '3d' | '7d' | 'never';

type ExistingAlert = {
  id: string;
  message: string;
  priority: AlertPriority;
  created_at: string;
  requires_ack: boolean | null;
  created_by: string | null;
  expires_at: string | null;
  is_active: boolean | null;
};

type ManagedProfile = Profile & {
  is_active?: boolean;
};

type AlertAcknowledgementRow = {
  alert_id: string;
  user_id: string;
  acknowledged_at: string;
  profiles?: { full_name: string; rank: string } | { full_name: string; rank: string }[] | null;
};

type AlertAckSummary = {
  eligibleCount: number | null;
  acknowledgedCount: number;
  rows: AlertAcknowledgementRow[];
};

type ExistingPeriod = {
  id: string;
  title: string;
  period_type: 'leave' | 'donsa';
  start_date: string;
  end_date: string;
};

type ExistingCqShift = {
  id: string;
  shift_date: string;
  soldier_one_id: string | null;
  soldier_two_id: string | null;
  soldier_one?: Profile | Profile[] | null;
  soldier_two?: Profile | Profile[] | null;
};

type ExistingWeeklyEvent = {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
};

type ExistingLongRangeEvent = {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  description: string | null;
};

type DetailAssignment = {
  id: string;
  detail_id: string;
  user_id: string;
  user?: Profile | Profile[] | null;
};

type ExistingDetail = {
  id: string;
  title: string;
  detail_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  leader: string | null;
  notes: string | null;
  assignments?: DetailAssignment[] | null;
};

type JumpManifestEntry = {
  id: string;
  soldier_id: string;
  sort_order: number;
};

type ExistingJump = {
  id: string;
  name: string;
  location: string;
  jump_date: string;
  jump_type: JumpType;
  equipment_list?: string[] | null;
  manifest?: JumpManifestEntry[] | null;
};

type JumpFormState = {
  id: string;
  name: string;
  location: string;
  jump_date: string;
  jump_type: JumpType;
  equipment: string;
  manifestIds: string[];
};

type WeeklyFormState = {
  id: string;
  title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
};

type CalendarFormState = {
  id: string;
  title: string;
  event_date: string;
  location: string;
  description: string;
};

type PeriodFormState = {
  id: string;
  title: string;
  period_type: 'leave' | 'donsa';
  start_date: string;
  end_date: string;
};

type CqFormState = {
  id: string;
  shift_date: string;
  soldier_one_id: string;
  soldier_two_id: string;
};

type DetailFormState = {
  id: string;
  title: string;
  detail_date: string;
  start_time: string;
  end_time: string;
  location: string;
  leader: string;
  notes: string;
  assignmentIds: string[];
};

type JumpFormSetter = Dispatch<SetStateAction<JumpFormState>>;
type WeeklyFormSetter = Dispatch<SetStateAction<WeeklyFormState>>;
type CalendarFormSetter = Dispatch<SetStateAction<CalendarFormState>>;
type PeriodFormSetter = Dispatch<SetStateAction<PeriodFormState>>;
type CqFormSetter = Dispatch<SetStateAction<CqFormState>>;
type DetailFormSetter = Dispatch<SetStateAction<DetailFormState>>;

function normalizeProfile(value: Profile | Profile[] | null | undefined): Profile | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function sectionStyle() {
  return {
    background: '#ffffff',
    borderRadius: 30,
    padding: 22,
    boxShadow: '0 18px 44px rgba(15,23,42,0.14)',
    color: '#0f172a',
    width: '100%',
    maxWidth: '100%',
    overflowX: 'hidden',
    boxSizing: 'border-box',
  } as const;
}

function inputStyle() {
  return {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    borderRadius: 18,
    border: '1px solid rgba(15,23,42,0.10)',
    background: '#f8fafc',
    padding: '14px 16px',
    fontSize: 15,
    color: '#0f172a',
    outline: 'none',
  } as const;
}

function buttonStyle(primary = true, danger = false) {
  return {
    borderRadius: 18,
    border: primary ? 'none' : '1px solid rgba(15,23,42,0.10)',
    background: danger
      ? 'linear-gradient(180deg, #b91c1c 0%, #991b1b 100%)'
      : primary
        ? 'linear-gradient(180deg, #8b1538 0%, #6f102d 100%)'
        : '#f8fafc',
    color: primary || danger ? '#ffffff' : '#0f172a',
    padding: '14px 18px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: danger
      ? '0 14px 30px rgba(185,28,28,0.24)'
      : primary
        ? '0 14px 30px rgba(139,21,56,0.28)'
        : 'none',
    maxWidth: '100%',
  } as const;
}

function secondaryButtonStyle() {
  return {
    borderRadius: 18,
    border: '1px solid rgba(15,23,42,0.10)',
    background: '#f8fafc',
    color: '#0f172a',
    padding: '14px 18px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    maxWidth: '100%',
  } as const;
}

function priorityStyle(priority: AlertPriority) {
  if (priority === 'high') {
    return { background: '#fee2e2', color: '#991b1b', label: 'High' };
  }
  if (priority === 'medium') {
    return { background: '#fef3c7', color: '#92400e', label: 'Medium' };
  }
  return { background: '#dcfce7', color: '#166534', label: 'Low' };
}

function getExpirationTimestamp(option: AlertExpirationOption) {
  if (option === 'never') {
    return null;
  }

  const now = Date.now();
  const durations: Record<Exclude<AlertExpirationOption, 'never'>, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '3d': 3 * 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  };

  return new Date(now + durations[option]).toISOString();
}

function expirationOptionLabel(option: AlertExpirationOption) {
  if (option === '24h') return '24 Hours';
  if (option === '3d') return '3 Days';
  if (option === '7d') return '7 Days';
  return 'Never';
}

function inferExpirationOption(expiresAt: string | null) {
  if (!expiresAt) {
    return 'never' as AlertExpirationOption;
  }

  const now = Date.now();
  const diff = new Date(expiresAt).getTime() - now;
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (diff <= 36 * hour) return '24h';
  if (diff <= 5 * day) return '3d';
  return '7d';
}

function isAlertCurrentlyActive(alert: ExistingAlert) {
  if (alert.is_active === false) {
    return false;
  }

  if (!alert.expires_at) {
    return true;
  }

  return new Date(alert.expires_at).getTime() > Date.now();
}

function alertExpirationSummary(alert: ExistingAlert) {
  if (!alert.expires_at) {
    return 'Never expires';
  }

  return `Expires ${new Date(alert.expires_at).toLocaleString()}`;
}

function alertInactiveReason(alert: ExistingAlert) {
  if (alert.is_active === false && alert.expires_at) {
    return `Expired ${new Date(alert.expires_at).toLocaleString()}`;
  }

  if (alert.is_active === false) {
    return 'Inactive';
  }

  if (alert.expires_at && new Date(alert.expires_at).getTime() <= Date.now()) {
    return `Expired ${new Date(alert.expires_at).toLocaleString()}`;
  }

  return 'Inactive';
}


function formatMilitaryTime(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function isValid24HourTime(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function emptyJumpForm(): JumpFormState {
  return {
    id: '',
    name: '',
    location: '',
    jump_date: '',
    jump_type: 'Hollywood',
    equipment: '',
    manifestIds: [],
  };
}

function emptyWeeklyForm(): WeeklyFormState {
  return {
    id: '',
    title: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    description: '',
  };
}

function emptyCalendarForm(): CalendarFormState {
  return {
    id: '',
    title: '',
    event_date: '',
    location: '',
    description: '',
  };
}

function emptyPeriodForm(): PeriodFormState {
  return {
    id: '',
    title: '',
    period_type: 'leave',
    start_date: '',
    end_date: '',
  };
}

function emptyCqForm(): CqFormState {
  return {
    id: '',
    shift_date: '',
    soldier_one_id: '',
    soldier_two_id: '',
  };
}

function emptyDetailForm(): DetailFormState {
  return {
    id: '',
    title: '',
    detail_date: '',
    start_time: '',
    end_time: '',
    location: '',
    leader: '',
    notes: '',
    assignmentIds: [],
  };
}

function buildDetailForm(detail: ExistingDetail): DetailFormState {
  return {
    id: detail.id,
    title: detail.title,
    detail_date: detail.detail_date,
    start_time: detail.start_time ?? '',
    end_time: detail.end_time ?? '',
    location: detail.location ?? '',
    leader: detail.leader ?? '',
    notes: detail.notes ?? '',
    assignmentIds: (detail.assignments ?? []).map((assignment) => assignment.user_id),
  };
}

function buildJumpForm(jump: ExistingJump): JumpFormState {
  return {
    id: jump.id,
    name: jump.name,
    location: jump.location,
    jump_date: jump.jump_date,
    jump_type: jump.jump_type,
    equipment: (jump.equipment_list ?? []).join(', '),
    manifestIds: (jump.manifest ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((entry) => entry.soldier_id),
  };
}

function buildWeeklyForm(event: ExistingWeeklyEvent): WeeklyFormState {
  return {
    id: event.id,
    title: event.title,
    event_date: event.event_date,
    start_time: event.start_time ?? '',
    end_time: event.end_time ?? '',
    location: event.location ?? '',
    description: event.description ?? '',
  };
}

function buildCalendarForm(event: ExistingLongRangeEvent): CalendarFormState {
  return {
    id: event.id,
    title: event.title,
    event_date: event.event_date,
    location: event.location ?? '',
    description: event.description ?? '',
  };
}

function buildPeriodForm(period: ExistingPeriod): PeriodFormState {
  return {
    id: period.id,
    title: period.title,
    period_type: period.period_type,
    start_date: period.start_date,
    end_date: period.end_date,
  };
}

function buildCqForm(shift: ExistingCqShift): CqFormState {
  return {
    id: shift.id,
    shift_date: shift.shift_date,
    soldier_one_id: shift.soldier_one_id ?? '',
    soldier_two_id: shift.soldier_two_id ?? '',
  };
}

function renderJumpForm(form: JumpFormState, setForm: JumpFormSetter, soldiers: Profile[]) {
  return (
    <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
      <input
        value={form.name}
        onChange={(e) =>
          setForm((current) => ({ ...current, name: e.target.value }))
        }
        placeholder="Jump name"
        style={inputStyle()}
      />
      <input
        value={form.location}
        onChange={(e) =>
          setForm((current) => ({ ...current, location: e.target.value }))
        }
        placeholder="Location"
        style={inputStyle()}
      />
      <input
        value={form.jump_date}
        onChange={(e) =>
          setForm((current) => ({ ...current, jump_date: e.target.value }))
        }
        type="date"
        style={inputStyle()}
      />
      <select
        value={form.jump_type}
        onChange={(e) =>
          setForm((current) => ({
            ...current,
            jump_type: e.target.value as JumpType,
          }))
        }
        style={inputStyle()}
      >
        <option value="Hollywood">Hollywood</option>
        <option value="Combat">Combat</option>
      </select>

      {form.jump_type === 'Combat' && (
        <textarea
          value={form.equipment}
          onChange={(e) =>
            setForm((current) => ({ ...current, equipment: e.target.value }))
          }
          placeholder="Equipment list, separated by commas"
          style={{ ...inputStyle(), minHeight: 110, resize: 'vertical' }}
        />
      )}

      <div style={{ minWidth: 0 }}>
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
          Manifest
        </div>

        <div
          style={{
            display: 'grid',
            gap: 10,
            maxHeight: 280,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: 2,
            minWidth: 0,
          }}
        >
          {soldiers.map((soldier) => {
            const checked = form.manifestIds.includes(soldier.id);

            return (
              <label
                key={soldier.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  borderRadius: 18,
                  background: '#f8fafc',
                  border: '1px solid rgba(15,23,42,0.08)',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  minWidth: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    setForm((current) => {
                      if (e.target.checked) {
                        return {
                          ...current,
                          manifestIds: [...current.manifestIds, soldier.id],
                        };
                      }

                      return {
                        ...current,
                        manifestIds: current.manifestIds.filter((id) => id !== soldier.id),
                      };
                    });
                  }}
                />
                <span
                  style={{
                    fontSize: 15,
                    color: '#0f172a',
                    minWidth: 0,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {soldier.rank} {soldier.full_name}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function renderWeeklyForm(form: WeeklyFormState, setForm: WeeklyFormSetter) {
  return (
    <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
      <input
        value={form.title}
        onChange={(e) =>
          setForm((current) => ({ ...current, title: e.target.value }))
        }
        placeholder="Title"
        style={inputStyle()}
      />

      <input
        value={form.event_date}
        onChange={(e) =>
          setForm((current) => ({ ...current, event_date: e.target.value }))
        }
        type="date"
        style={inputStyle()}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        <input
          value={form.start_time}
          onChange={(e) =>
            setForm((current) => ({ ...current, start_time: formatMilitaryTime(e.target.value) }))
          }
          placeholder="HH:MM"
          inputMode="numeric"
          style={inputStyle()}
        />
        <input
          value={form.end_time}
          onChange={(e) =>
            setForm((current) => ({ ...current, end_time: formatMilitaryTime(e.target.value) }))
          }
          placeholder="HH:MM"
          inputMode="numeric"
          style={inputStyle()}
        />
      </div>

      <div
        style={{
          marginTop: -4,
          fontSize: 13,
          color: '#64748b',
        }}
      >
        Use 24-hour time format like 06:30, 13:00, or 18:45.
      </div>

      <input
        value={form.location}
        onChange={(e) =>
          setForm((current) => ({ ...current, location: e.target.value }))
        }
        placeholder="Location"
        style={inputStyle()}
      />

      <textarea
        value={form.description}
        onChange={(e) =>
          setForm((current) => ({ ...current, description: e.target.value }))
        }
        placeholder="Description"
        style={{ ...inputStyle(), minHeight: 110, resize: 'vertical' }}
      />
    </div>
  );
}

function renderCalendarForm(form: CalendarFormState, setForm: CalendarFormSetter) {
  return (
    <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
      <input
        value={form.title}
        onChange={(e) =>
          setForm((current) => ({ ...current, title: e.target.value }))
        }
        placeholder="Title"
        style={inputStyle()}
      />
      <input
        value={form.event_date}
        onChange={(e) =>
          setForm((current) => ({ ...current, event_date: e.target.value }))
        }
        type="date"
        style={inputStyle()}
      />
      <input
        value={form.location}
        onChange={(e) =>
          setForm((current) => ({ ...current, location: e.target.value }))
        }
        placeholder="Location"
        style={inputStyle()}
      />
      <textarea
        value={form.description}
        onChange={(e) =>
          setForm((current) => ({ ...current, description: e.target.value }))
        }
        placeholder="Description"
        style={{ ...inputStyle(), minHeight: 110, resize: 'vertical' }}
      />
    </div>
  );
}

function renderPeriodForm(form: PeriodFormState, setForm: PeriodFormSetter) {
  return (
    <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
      <input
        value={form.title}
        onChange={(e) =>
          setForm((current) => ({ ...current, title: e.target.value }))
        }
        placeholder="Title"
        style={inputStyle()}
      />
      <select
        value={form.period_type}
        onChange={(e) =>
          setForm((current) => ({
            ...current,
            period_type: e.target.value as 'leave' | 'donsa',
          }))
        }
        style={inputStyle()}
      >
        <option value="leave">Leave</option>
        <option value="donsa">DONSA</option>
      </select>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        <input
          value={form.start_date}
          onChange={(e) =>
            setForm((current) => ({ ...current, start_date: e.target.value }))
          }
          type="date"
          style={inputStyle()}
        />
        <input
          value={form.end_date}
          onChange={(e) =>
            setForm((current) => ({ ...current, end_date: e.target.value }))
          }
          type="date"
          style={inputStyle()}
        />
      </div>
    </div>
  );
}

function renderCqForm(form: CqFormState, setForm: CqFormSetter, soldiers: Profile[]) {
  return (
    <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
      <input
        value={form.shift_date}
        onChange={(e) =>
          setForm((current) => ({ ...current, shift_date: e.target.value }))
        }
        type="date"
        style={inputStyle()}
      />

      <select
        value={form.soldier_one_id}
        onChange={(e) =>
          setForm((current) => ({ ...current, soldier_one_id: e.target.value }))
        }
        style={inputStyle()}
      >
        <option value="">Select first soldier</option>
        {soldiers.map((soldier) => (
          <option key={soldier.id} value={soldier.id}>
            {soldier.rank} {soldier.full_name}
          </option>
        ))}
      </select>

      <select
        value={form.soldier_two_id}
        onChange={(e) =>
          setForm((current) => ({ ...current, soldier_two_id: e.target.value }))
        }
        style={inputStyle()}
      >
        <option value="">Select second soldier</option>
        {soldiers.map((soldier) => (
          <option key={soldier.id} value={soldier.id}>
            {soldier.rank} {soldier.full_name}
          </option>
        ))}
      </select>
    </div>
  );
}

function renderDetailForm(form: DetailFormState, setForm: DetailFormSetter, soldiers: Profile[]) {
  return (
    <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
      <input
        value={form.title}
        onChange={(e) =>
          setForm((current) => ({ ...current, title: e.target.value }))
        }
        placeholder="Detail title"
        style={inputStyle()}
      />

      <input
        value={form.detail_date}
        onChange={(e) =>
          setForm((current) => ({ ...current, detail_date: e.target.value }))
        }
        type="date"
        style={inputStyle()}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        <input
          value={form.start_time}
          onChange={(e) =>
            setForm((current) => ({ ...current, start_time: formatMilitaryTime(e.target.value) }))
          }
          placeholder="HH:MM"
          inputMode="numeric"
          style={inputStyle()}
        />

        <input
          value={form.end_time}
          onChange={(e) =>
            setForm((current) => ({ ...current, end_time: formatMilitaryTime(e.target.value) }))
          }
          placeholder="HH:MM"
          inputMode="numeric"
          style={inputStyle()}
        />
      </div>

      <div
        style={{
          marginTop: -4,
          fontSize: 13,
          color: '#64748b',
        }}
      >
        Use 24-hour time format like 06:30, 13:00, or 18:45.
      </div>

      <input
        value={form.location}
        onChange={(e) =>
          setForm((current) => ({ ...current, location: e.target.value }))
        }
        placeholder="Location"
        style={inputStyle()}
      />

      <input
        value={form.leader}
        onChange={(e) =>
          setForm((current) => ({ ...current, leader: e.target.value }))
        }
        placeholder="OIC / NCOIC"
        style={inputStyle()}
      />

      <textarea
        value={form.notes}
        onChange={(e) =>
          setForm((current) => ({ ...current, notes: e.target.value }))
        }
        placeholder="Notes"
        style={{ ...inputStyle(), minHeight: 110, resize: 'vertical' }}
      />

      <div style={{ minWidth: 0 }}>
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
          Assigned Personnel
        </div>

        <div
          style={{
            display: 'grid',
            gap: 10,
            maxHeight: 280,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: 2,
            minWidth: 0,
          }}
        >
          {soldiers
            .filter((soldier) => soldier.is_active !== false)
            .map((soldier) => {
              const checked = form.assignmentIds.includes(soldier.id);

              return (
                <label
                  key={soldier.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    borderRadius: 18,
                    background: '#f8fafc',
                    border: '1px solid rgba(15,23,42,0.08)',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    minWidth: 0,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setForm((current) => {
                        if (e.target.checked) {
                          return {
                            ...current,
                            assignmentIds: [...current.assignmentIds, soldier.id],
                          };
                        }

                        return {
                          ...current,
                          assignmentIds: current.assignmentIds.filter((id) => id !== soldier.id),
                        };
                      });
                    }}
                  />
                  <span
                    style={{
                      fontSize: 15,
                      color: '#0f172a',
                      minWidth: 0,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {soldier.rank} {soldier.full_name}
                  </span>
                </label>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function ModalShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          background: '#ffffff',
          borderRadius: 30,
          padding: 22,
          boxShadow: '0 24px 60px rgba(15,23,42,0.28)',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
              {title}
            </h2>
            <p
              style={{
                marginTop: 8,
                marginBottom: 0,
                fontSize: 14,
                color: '#64748b',
                overflowWrap: 'anywhere',
              }}
            >
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              ...secondaryButtonStyle(),
              padding: '10px 14px',
              lineHeight: 1,
            }}
          >
            Close
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

export function AdminClient() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [active, setActive] = useState<TabId>('alerts');
  const [soldiers, setSoldiers] = useState<ManagedProfile[]>([]);
  const [upcomingJumps, setUpcomingJumps] = useState<ExistingJump[]>([]);
  const [existingAlerts, setExistingAlerts] = useState<ExistingAlert[]>([]);
  const [existingPeriods, setExistingPeriods] = useState<ExistingPeriod[]>([]);
  const [existingCqShifts, setExistingCqShifts] = useState<ExistingCqShift[]>([]);
  const [existingWeeklyEvents, setExistingWeeklyEvents] = useState<ExistingWeeklyEvent[]>([]);
  const [existingLongRangeEvents, setExistingLongRangeEvents] = useState<ExistingLongRangeEvent[]>(
    []
  );
  const [existingDetails, setExistingDetails] = useState<ExistingDetail[]>([]);

  const [status, setStatus] = useState<string | null>(null);
  const [busyDeletingAlertId, setBusyDeletingAlertId] = useState<string | null>(null);
  const [busyDeletingPeriodId, setBusyDeletingPeriodId] = useState<string | null>(null);
  const [busyDeletingShiftId, setBusyDeletingShiftId] = useState<string | null>(null);
  const [busyDeletingWeeklyId, setBusyDeletingWeeklyId] = useState<string | null>(null);
  const [busyDeletingCalendarId, setBusyDeletingCalendarId] = useState<string | null>(null);
  const [busyDeletingJumpId, setBusyDeletingJumpId] = useState<string | null>(null);

  const [busySavingWeeklyEdit, setBusySavingWeeklyEdit] = useState(false);
  const [busySavingCalendarEdit, setBusySavingCalendarEdit] = useState(false);
  const [busySavingPeriodEdit, setBusySavingPeriodEdit] = useState(false);
  const [busySavingCqEdit, setBusySavingCqEdit] = useState(false);
  const [busySavingJumpEdit, setBusySavingJumpEdit] = useState(false);
  const [busyDeletingDetailId, setBusyDeletingDetailId] = useState<string | null>(null);
  const [busySavingDetailEdit, setBusySavingDetailEdit] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [alertRequiresAck, setAlertRequiresAck] = useState(false);
  const [alertAckSummaryByAlertId, setAlertAckSummaryByAlertId] = useState<Record<string, AlertAckSummary>>({});
  const [selectedAlertForAck, setSelectedAlertForAck] = useState<ExistingAlert | null>(null);
  const [busyUpdatingUserId, setBusyUpdatingUserId] = useState<string | null>(null);

  const [alertMessage, setAlertMessage] = useState('');
  const [alertPriority, setAlertPriority] = useState<AlertPriority>('medium');
  const [alertExpiration, setAlertExpiration] = useState<AlertExpirationOption>('24h');
  const [reactivatingAlert, setReactivatingAlert] = useState<ExistingAlert | null>(null);
  const [reactivationMessage, setReactivationMessage] = useState('');
  const [reactivationPriority, setReactivationPriority] = useState<AlertPriority>('medium');
  const [reactivationRequiresAck, setReactivationRequiresAck] = useState(false);
  const [reactivationExpiration, setReactivationExpiration] =
    useState<AlertExpirationOption>('24h');
  const [busyRepostingAlert, setBusyRepostingAlert] = useState(false);

  const [weeklyForm, setWeeklyForm] = useState<WeeklyFormState>(emptyWeeklyForm());
  const [calendarForm, setCalendarForm] = useState<CalendarFormState>(emptyCalendarForm());
  const [periodForm, setPeriodForm] = useState<PeriodFormState>(emptyPeriodForm());
  const [cqForm, setCqForm] = useState<CqFormState>(emptyCqForm());
  const [jumpForm, setJumpForm] = useState<JumpFormState>(emptyJumpForm());
  const [detailForm, setDetailForm] = useState<DetailFormState>(emptyDetailForm());

  const [editingWeeklyForm, setEditingWeeklyForm] = useState<WeeklyFormState | null>(null);
  const [editingCalendarForm, setEditingCalendarForm] = useState<CalendarFormState | null>(null);
  const [editingPeriodForm, setEditingPeriodForm] = useState<PeriodFormState | null>(null);
  const [editingCqForm, setEditingCqForm] = useState<CqFormState | null>(null);
  const [editingJumpForm, setEditingJumpForm] = useState<JumpFormState | null>(null);
  const [editingDetailForm, setEditingDetailForm] = useState<DetailFormState | null>(null);

  useEffect(() => {
    void loadInitial();
  }, []);

  async function loadInitial() {
    const [
      {
        data: { user },
      },
      { data: profiles },
      { data: jumps },
      { data: alerts },
      { data: alertAcknowledgements },
      { data: periods },
      { data: cqShifts },
      { data: weeklyEvents },
      { data: longRangeEvents },
      { data: details },
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('profiles')
        .select('id, full_name, rank, role, is_active')
        .order('rank', { ascending: true })
        .order('full_name', { ascending: true }),
      supabase
        .from('jumps')
        .select(
          'id, name, location, jump_date, jump_type, equipment_list, manifest:jump_manifest(id, soldier_id, sort_order)'
        )
        .gte('jump_date', new Date().toISOString().slice(0, 10))
        .order('jump_date', { ascending: true }),
      supabase
        .from('alerts')
        .select('id, message, priority, created_at, requires_ack, created_by, expires_at, is_active')
        .order('created_at', { ascending: false }),
      supabase
        .from('alert_acknowledgements')
        .select('alert_id, user_id, acknowledged_at, profiles(full_name, rank)'),
      supabase
        .from('leave_donsa_periods')
        .select('id, title, period_type, start_date, end_date')
        .order('start_date', { ascending: true }),
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
        .order('shift_date', { ascending: true }),
      supabase
        .from('weekly_training_events')
        .select('id, title, event_date, start_time, end_time, location, description')
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true }),
      supabase
        .from('long_range_events')
        .select('id, title, event_date, location, description')
        .order('event_date', { ascending: true }),
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
        .order('detail_date', { ascending: true })
        .order('start_time', { ascending: true }),
    ]);

    const safeProfiles = ((profiles ?? []) as ManagedProfile[]).map((profile) => ({
      ...profile,
      is_active: profile.is_active ?? true,
    }));
    const safeAlerts = (alerts ?? []) as ExistingAlert[];
    const safeAcknowledgements = (alertAcknowledgements ?? []) as AlertAcknowledgementRow[];

    const summaryByAlertId = safeAlerts.reduce<Record<string, AlertAckSummary>>((acc, alert) => {
      const rows = safeAcknowledgements
        .filter((row) => row.alert_id === alert.id)
        .filter((row) => row.user_id !== alert.created_by)
        .slice()
        .sort(
          (a, b) =>
            new Date(a.acknowledged_at).getTime() - new Date(b.acknowledged_at).getTime()
        );

      const acknowledgedCount = new Set(rows.map((row) => row.user_id)).size;
      const eligibleCount =
        alert.created_by
          ? safeProfiles.filter(
              (profile) => profile.is_active !== false && profile.id !== alert.created_by
            ).length
          : null;

      acc[alert.id] = {
        eligibleCount,
        acknowledgedCount,
        rows,
      };

      return acc;
    }, {});

    setCurrentUserId(user?.id ?? null);
    setSoldiers(safeProfiles);
    setUpcomingJumps((jumps ?? []) as ExistingJump[]);
    setExistingAlerts(safeAlerts);
    setAlertAckSummaryByAlertId(summaryByAlertId);
    setExistingPeriods((periods ?? []) as ExistingPeriod[]);
    setExistingCqShifts((cqShifts ?? []) as ExistingCqShift[]);
    setExistingWeeklyEvents((weeklyEvents ?? []) as ExistingWeeklyEvent[]);
    setExistingLongRangeEvents((longRangeEvents ?? []) as ExistingLongRangeEvent[]);
    setExistingDetails((details ?? []) as ExistingDetail[]);
  }

  async function postAlert(values: {
    message: string;
    priority: AlertPriority;
    requires_ack: boolean;
    expiration: AlertExpirationOption;
  }) {
    const trimmed = values.message.trim();

    if (!trimmed) {
      setStatus('Enter an alert message first.');
      return false;
    }

    const { data, error } = await supabase
      .from('alerts')
      .insert({
        message: trimmed,
        priority: values.priority,
        requires_ack: values.requires_ack,
        created_by: currentUserId,
        expires_at: getExpirationTimestamp(values.expiration),
        is_active: true,
      })
      .select('id, message, priority, created_at, requires_ack, created_by, expires_at, is_active')
      .single();

    if (error) {
      setStatus(error.message);
      return false;
    }

    try {
      await fetch('/api/push/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      // ignore push failure
    }

    await loadInitial();
    router.refresh();
    return true;
  }

  async function createAlert() {
    setStatus(null);

    const ok = await postAlert({
      message: alertMessage,
      priority: alertPriority,
      requires_ack: alertRequiresAck,
      expiration: alertExpiration,
    });

    if (!ok) {
      return;
    }

    setAlertMessage('');
    setAlertPriority('medium');
    setAlertRequiresAck(false);
    setAlertExpiration('24h');
    setStatus('Alert posted.');
  }

  async function repostAlert() {
    if (!reactivatingAlert) return;

    setStatus(null);
    setBusyRepostingAlert(true);

    const ok = await postAlert({
      message: reactivationMessage,
      priority: reactivationPriority,
      requires_ack: reactivationRequiresAck,
      expiration: reactivationExpiration,
    });

    setBusyRepostingAlert(false);

    if (!ok) {
      return;
    }

    closeReactivateAlert();
    setStatus('Alert reposted.');
  }

  async function deleteAlert(alertId: string) {
    setStatus(null);
    setBusyDeletingAlertId(alertId);

    const { error } = await supabase.from('alerts').delete().eq('id', alertId);

    if (error) {
      setStatus(error.message);
      setBusyDeletingAlertId(null);
      return;
    }

    setStatus('Alert deleted.');
    setBusyDeletingAlertId(null);
    await loadInitial();
    router.refresh();
  }


  async function updateUser(userId: string, updates: Partial<ManagedProfile>) {
    setStatus(null);
    setBusyUpdatingUserId(userId);

    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);

    if (error) {
      setStatus(error.message);
      setBusyUpdatingUserId(null);
      return;
    }

    setBusyUpdatingUserId(null);
    setStatus('User updated.');
    await loadInitial();
    router.refresh();
  }

  async function toggleUserActive(profile: ManagedProfile) {
    await updateUser(profile.id, { is_active: !(profile.is_active ?? true) });
  }

  async function toggleUserRole(profile: ManagedProfile) {
    const nextRole = profile.role === 'admin' ? 'soldier' : 'admin';
    await updateUser(profile.id, { role: nextRole });
  }

  function openAcknowledgements(alert: ExistingAlert) {
    setSelectedAlertForAck(alert);
  }

  function closeAcknowledgements() {
    setSelectedAlertForAck(null);
  }

  async function saveWeeklyEvent(formOverride?: WeeklyFormState) {
    setStatus(null);

    const form = formOverride ?? weeklyForm;

    if (form.start_time && !isValid24HourTime(form.start_time)) {
      setStatus('Start time must be in 24-hour HH:MM format.');
      return false;
    }

    if (form.end_time && !isValid24HourTime(form.end_time)) {
      setStatus('End time must be in 24-hour HH:MM format.');
      return false;
    }

    const payload = {
      title: form.title,
      event_date: form.event_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location || null,
      description: form.description || null,
    };

    if (form.id) {
      const { error } = await supabase
        .from('weekly_training_events')
        .update(payload)
        .eq('id', form.id);

      if (error) {
        setStatus(error.message);
        return false;
      }

      setStatus('Weekly training event updated.');
    } else {
      const { error } = await supabase.from('weekly_training_events').insert(payload);

      if (error) {
        setStatus(error.message);
        return false;
      }

      setStatus('Weekly training event created.');
    }

    if (!formOverride) {
      setWeeklyForm(emptyWeeklyForm());
    }

    await loadInitial();
    router.refresh();
    return true;
  }

  function openWeeklyEditor(event: ExistingWeeklyEvent) {
    setEditingWeeklyForm(buildWeeklyForm(event));
  }

  function closeWeeklyEditor() {
    setEditingWeeklyForm(null);
  }

  async function saveEditingWeeklyEvent() {
    if (!editingWeeklyForm) return;

    setBusySavingWeeklyEdit(true);
    const ok = await saveWeeklyEvent(editingWeeklyForm);
    setBusySavingWeeklyEdit(false);

    if (ok) {
      closeWeeklyEditor();
    }
  }

  async function deleteWeeklyEvent(eventId: string) {
    setStatus(null);
    setBusyDeletingWeeklyId(eventId);

    const { error } = await supabase.from('weekly_training_events').delete().eq('id', eventId);

    if (error) {
      setStatus(error.message);
      setBusyDeletingWeeklyId(null);
      return;
    }

    if (editingWeeklyForm?.id === eventId) {
      setEditingWeeklyForm(null);
    }

    setStatus('Weekly training event deleted.');
    setBusyDeletingWeeklyId(null);
    await loadInitial();
    router.refresh();
  }

  async function saveCalendarEvent(formOverride?: CalendarFormState) {
    setStatus(null);

    const form = formOverride ?? calendarForm;

    const payload = {
      title: form.title,
      event_date: form.event_date,
      location: form.location || null,
      description: form.description || null,
    };

    if (form.id) {
      const { error } = await supabase
        .from('long_range_events')
        .update(payload)
        .eq('id', form.id);

      if (error) {
        setStatus(error.message);
        return false;
      }

      setStatus('Long range event updated.');
    } else {
      const { error } = await supabase.from('long_range_events').insert(payload);

      if (error) {
        setStatus(error.message);
        return false;
      }

      setStatus('Long range event created.');
    }

    if (!formOverride) {
      setCalendarForm(emptyCalendarForm());
    }

    await loadInitial();
    router.refresh();
    return true;
  }

  function openCalendarEditor(event: ExistingLongRangeEvent) {
    setEditingCalendarForm(buildCalendarForm(event));
  }

  function closeCalendarEditor() {
    setEditingCalendarForm(null);
  }

  async function saveEditingCalendarEvent() {
    if (!editingCalendarForm) return;

    setBusySavingCalendarEdit(true);
    const ok = await saveCalendarEvent(editingCalendarForm);
    setBusySavingCalendarEdit(false);

    if (ok) {
      closeCalendarEditor();
    }
  }

  async function deleteCalendarEvent(eventId: string) {
    setStatus(null);
    setBusyDeletingCalendarId(eventId);

    const { error } = await supabase.from('long_range_events').delete().eq('id', eventId);

    if (error) {
      setStatus(error.message);
      setBusyDeletingCalendarId(null);
      return;
    }

    if (editingCalendarForm?.id === eventId) {
      setEditingCalendarForm(null);
    }

    setStatus('Long range event deleted.');
    setBusyDeletingCalendarId(null);
    await loadInitial();
    router.refresh();
  }

  async function savePeriod(formOverride?: PeriodFormState) {
    setStatus(null);

    const form = formOverride ?? periodForm;

    const payload = {
      title: form.title,
      period_type: form.period_type,
      start_date: form.start_date,
      end_date: form.end_date,
    };

    if (form.id) {
      const { error } = await supabase
        .from('leave_donsa_periods')
        .update(payload)
        .eq('id', form.id);

      if (error) {
        setStatus(error.message);
        return false;
      }

      setStatus('Leave / DONSA updated.');
    } else {
      const { error } = await supabase.from('leave_donsa_periods').insert(payload);

      if (error) {
        setStatus(error.message);
        return false;
      }

      setStatus('Leave / DONSA created.');
    }

    if (!formOverride) {
      setPeriodForm(emptyPeriodForm());
    }

    await loadInitial();
    router.refresh();
    return true;
  }

  function openPeriodEditor(period: ExistingPeriod) {
    setEditingPeriodForm(buildPeriodForm(period));
  }

  function closePeriodEditor() {
    setEditingPeriodForm(null);
  }

  async function saveEditingPeriod() {
    if (!editingPeriodForm) return;

    setBusySavingPeriodEdit(true);
    const ok = await savePeriod(editingPeriodForm);
    setBusySavingPeriodEdit(false);

    if (ok) {
      closePeriodEditor();
    }
  }

  async function deletePeriod(periodId: string) {
    setStatus(null);
    setBusyDeletingPeriodId(periodId);

    const { error } = await supabase.from('leave_donsa_periods').delete().eq('id', periodId);

    if (error) {
      setStatus(error.message);
      setBusyDeletingPeriodId(null);
      return;
    }

    if (editingPeriodForm?.id === periodId) {
      setEditingPeriodForm(null);
    }

    setStatus('Leave / DONSA deleted.');
    setBusyDeletingPeriodId(null);
    await loadInitial();
    router.refresh();
  }

  async function saveCQShift(formOverride?: CqFormState) {
    setStatus(null);

    const form = formOverride ?? cqForm;

    const payload = {
      shift_date: form.shift_date,
      soldier_one_id: form.soldier_one_id || null,
      soldier_two_id: form.soldier_two_id || null,
    };

    if (form.id) {
      const { error } = await supabase.from('cq_shifts').update(payload).eq('id', form.id);

      if (error) {
        setStatus(error.message);
        return false;
      }

      setStatus('CQ shift updated.');
    } else {
      const { error } = await supabase.from('cq_shifts').insert(payload);

      if (error) {
        setStatus(error.message);
        return false;
      }

      setStatus('CQ shift created.');
    }

    if (!formOverride) {
      setCqForm(emptyCqForm());
    }

    await loadInitial();
    router.refresh();
    return true;
  }

  function openCQEditor(shift: ExistingCqShift) {
    setEditingCqForm(buildCqForm(shift));
  }

  function closeCQEditor() {
    setEditingCqForm(null);
  }

  async function saveEditingCQShift() {
    if (!editingCqForm) return;

    setBusySavingCqEdit(true);
    const ok = await saveCQShift(editingCqForm);
    setBusySavingCqEdit(false);

    if (ok) {
      closeCQEditor();
    }
  }

  async function deleteCQShift(shiftId: string) {
    setStatus(null);
    setBusyDeletingShiftId(shiftId);

    const { error } = await supabase.from('cq_shifts').delete().eq('id', shiftId);

    if (error) {
      setStatus(error.message);
      setBusyDeletingShiftId(null);
      return;
    }

    if (editingCqForm?.id === shiftId) {
      setEditingCqForm(null);
    }

    setStatus('CQ shift deleted.');
    setBusyDeletingShiftId(null);
    await loadInitial();
    router.refresh();
  }

  async function saveJump(formOverride?: JumpFormState) {
    setStatus(null);

    const form = formOverride ?? jumpForm;
    let jumpId = form.id;

    const payload = {
      name: form.name,
      location: form.location,
      jump_date: form.jump_date,
      jump_type: form.jump_type,
      equipment_list:
        form.jump_type === 'Combat'
          ? form.equipment
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
    };

    if (jumpId) {
      const { error } = await supabase.from('jumps').update(payload).eq('id', jumpId);
      if (error) {
        setStatus(error.message);
        return false;
      }

      const { error: manifestDeleteError } = await supabase
        .from('jump_manifest')
        .delete()
        .eq('jump_id', jumpId);

      if (manifestDeleteError) {
        setStatus(manifestDeleteError.message);
        return false;
      }
    } else {
      const { data, error } = await supabase.from('jumps').insert(payload).select('id').single();
      if (error) {
        setStatus(error.message);
        return false;
      }
      jumpId = data.id;
    }

    if (form.manifestIds.length > 0) {
      const { error } = await supabase.from('jump_manifest').insert(
        form.manifestIds.map((soldier_id, index) => ({
          jump_id: jumpId,
          soldier_id,
          sort_order: index + 1,
        }))
      );

      if (error) {
        setStatus(error.message);
        return false;
      }
    }

    setStatus(form.id ? 'Jump updated.' : 'Jump created.');

    if (!formOverride) {
      setJumpForm(emptyJumpForm());
    }

    await loadInitial();
    router.refresh();
    return true;
  }

  function openJumpEditor(jump: ExistingJump) {
    setEditingJumpForm(buildJumpForm(jump));
  }

  function closeJumpEditor() {
    setEditingJumpForm(null);
  }

  async function saveEditingJump() {
    if (!editingJumpForm) return;

    setBusySavingJumpEdit(true);
    const ok = await saveJump(editingJumpForm);
    setBusySavingJumpEdit(false);

    if (ok) {
      closeJumpEditor();
    }
  }

  async function deleteJump(jumpId: string) {
    setStatus(null);
    setBusyDeletingJumpId(jumpId);

    const { error: manifestDeleteError } = await supabase
      .from('jump_manifest')
      .delete()
      .eq('jump_id', jumpId);

    if (manifestDeleteError) {
      setStatus(manifestDeleteError.message);
      setBusyDeletingJumpId(null);
      return;
    }

    const { error } = await supabase.from('jumps').delete().eq('id', jumpId);

    if (error) {
      setStatus(error.message);
      setBusyDeletingJumpId(null);
      return;
    }

    if (editingJumpForm?.id === jumpId) {
      setEditingJumpForm(null);
    }

    setStatus('Jump deleted.');
    setBusyDeletingJumpId(null);
    await loadInitial();
    router.refresh();
  }

    async function saveDetail(formOverride?: DetailFormState) {
    setStatus(null);

    const form = formOverride ?? detailForm;
    let detailId = form.id;

    if (form.start_time && !isValid24HourTime(form.start_time)) {
      setStatus('Start time must be in 24-hour HH:MM format.');
      return false;
    }

    if (form.end_time && !isValid24HourTime(form.end_time)) {
      setStatus('End time must be in 24-hour HH:MM format.');
      return false;
    }

    const payload = {
      title: form.title,
      detail_date: form.detail_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location || null,
      leader: form.leader || null,
      notes: form.notes || null,
    };

    if (detailId) {
      const { error } = await supabase.from('details').update(payload).eq('id', detailId);
      if (error) {
        setStatus(error.message);
        return false;
      }

      const { error: assignmentDeleteError } = await supabase
        .from('detail_assignments')
        .delete()
        .eq('detail_id', detailId);

      if (assignmentDeleteError) {
        setStatus(assignmentDeleteError.message);
        return false;
      }
    } else {
      const { data, error } = await supabase.from('details').insert(payload).select('id').single();
      if (error) {
        setStatus(error.message);
        return false;
      }
      detailId = data.id;
    }

    if (form.assignmentIds.length > 0) {
      const { error } = await supabase.from('detail_assignments').insert(
        form.assignmentIds.map((user_id) => ({
          detail_id: detailId,
          user_id,
        }))
      );

      if (error) {
        setStatus(error.message);
        return false;
      }
    }

    setStatus(form.id ? 'Detail updated.' : 'Detail created.');

    if (!formOverride) {
      setDetailForm(emptyDetailForm());
    }

    await loadInitial();
    router.refresh();
    return true;
  }

  function openDetailEditor(detail: ExistingDetail) {
    setEditingDetailForm(buildDetailForm(detail));
  }

  function closeDetailEditor() {
    setEditingDetailForm(null);
  }

  async function saveEditingDetail() {
    if (!editingDetailForm) return;

    setBusySavingDetailEdit(true);
    const ok = await saveDetail(editingDetailForm);
    setBusySavingDetailEdit(false);

    if (ok) {
      closeDetailEditor();
    }
  }

  async function deleteDetail(detailId: string) {
    setStatus(null);
    setBusyDeletingDetailId(detailId);

    const { error: assignmentsDeleteError } = await supabase
      .from('detail_assignments')
      .delete()
      .eq('detail_id', detailId);

    if (assignmentsDeleteError) {
      setStatus(assignmentsDeleteError.message);
      setBusyDeletingDetailId(null);
      return;
    }

    const { error } = await supabase.from('details').delete().eq('id', detailId);

    if (error) {
      setStatus(error.message);
      setBusyDeletingDetailId(null);
      return;
    }

    if (editingDetailForm?.id === detailId) {
      setEditingDetailForm(null);
    }

    setStatus('Detail deleted.');
    setBusyDeletingDetailId(null);
    await loadInitial();
    router.refresh();
  }

const jumpFormAdapter: JumpFormSetter = (value) => {
    setJumpForm((current) => {
      if (typeof value === 'function') {
        return value(current);
      }
      return value;
    });
  };

  const editingWeeklyFormAdapter: WeeklyFormSetter = (value) => {
    setEditingWeeklyForm((current) => {
      if (!current) return current;
      if (typeof value === 'function') {
        return value(current);
      }
      return value;
    });
  };

  const editingCalendarFormAdapter: CalendarFormSetter = (value) => {
    setEditingCalendarForm((current) => {
      if (!current) return current;
      if (typeof value === 'function') {
        return value(current);
      }
      return value;
    });
  };

  const editingPeriodFormAdapter: PeriodFormSetter = (value) => {
    setEditingPeriodForm((current) => {
      if (!current) return current;
      if (typeof value === 'function') {
        return value(current);
      }
      return value;
    });
  };

  const editingCqFormAdapter: CqFormSetter = (value) => {
    setEditingCqForm((current) => {
      if (!current) return current;
      if (typeof value === 'function') {
        return value(current);
      }
      return value;
    });
  };

  const editingJumpFormAdapter: JumpFormSetter = (value) => {
    setEditingJumpForm((current) => {
      if (!current) return current;
      if (typeof value === 'function') {
        return value(current);
      }
      return value;
    });
  };

  const detailFormAdapter: DetailFormSetter = (value) => {
    setDetailForm((current) => {
      if (typeof value === 'function') {
        return value(current);
      }
      return value;
    });
  };

  const editingDetailFormAdapter: DetailFormSetter = (value) => {
    setEditingDetailForm((current) => {
      if (!current) return current;
      if (typeof value === 'function') {
        return value(current);
      }
      return value;
    });
  };

  const activeAlerts = useMemo(
    () => existingAlerts.filter((alert) => isAlertCurrentlyActive(alert)),
    [existingAlerts]
  );

  const inactiveAlerts = useMemo(
    () => existingAlerts.filter((alert) => !isAlertCurrentlyActive(alert)),
    [existingAlerts]
  );

  function openReactivateAlert(alert: ExistingAlert) {
    setReactivatingAlert(alert);
    setReactivationMessage(alert.message);
    setReactivationPriority(alert.priority);
    setReactivationRequiresAck(alert.requires_ack ?? false);
    setReactivationExpiration(inferExpirationOption(alert.expires_at));
  }

  function closeReactivateAlert() {
    setReactivatingAlert(null);
    setReactivationMessage('');
    setReactivationPriority('medium');
    setReactivationRequiresAck(false);
    setReactivationExpiration('24h');
    setBusyRepostingAlert(false);
  }

  return (
    <>
      <div style={{ display: 'grid', gap: 20, width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
        <section style={sectionStyle()}>
          <div style={{ marginBottom: 16, minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: '#0f172a',
                minWidth: 0,
                overflowWrap: 'anywhere',
              }}
            >
              Admin Controls
            </h2>
            <p
              style={{
                marginTop: 8,
                marginBottom: 0,
                fontSize: 14,
                color: '#64748b',
                minWidth: 0,
                overflowWrap: 'anywhere',
              }}
            >
              Manage alerts, schedules, leave, jumps, manifests, and CQ in one place.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 10,
              width: '100%',
            }}
          >
            {tabs.map((tab) => {
              const activeTab = active === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  style={{
                    width: '100%',
                    minWidth: 0,
                    borderRadius: 18,
                    border: activeTab ? 'none' : '1px solid rgba(15,23,42,0.08)',
                    background: activeTab
                      ? 'linear-gradient(180deg, #8b1538 0%, #6f102d 100%)'
                      : '#f8fafc',
                    color: activeTab ? '#ffffff' : '#334155',
                    padding: '12px 14px',
                    fontSize: 13,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    boxShadow: activeTab ? '0 14px 28px rgba(139,21,56,0.24)' : 'none',
                    whiteSpace: 'normal',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        {status && (
          <div
            style={{
              borderRadius: 22,
              background: 'rgba(255,255,255,0.94)',
              padding: '14px 16px',
              color: '#334155',
              boxShadow: '0 10px 24px rgba(15,23,42,0.10)',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              overflowWrap: 'anywhere',
            }}
          >
            {status}
          </div>
        )}

        {active === 'alerts' && (
          <>
            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
                Send Alert
              </h2>

              <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
                <textarea
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  placeholder="Enter alert message..."
                  style={{ ...inputStyle(), minHeight: 140, resize: 'vertical' }}
                />

                <select
                  value={alertPriority}
                  onChange={(e) => setAlertPriority(e.target.value as AlertPriority)}
                  style={inputStyle()}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select
                  value={alertExpiration}
                  onChange={(e) => setAlertExpiration(e.target.value as AlertExpirationOption)}
                  style={inputStyle()}
                >
                  <option value="24h">24 Hours</option>
                  <option value="3d">3 Days</option>
                  <option value="7d">7 Days</option>
                  <option value="never">Never</option>
                </select>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    borderRadius: 18,
                    border: '1px solid rgba(15,23,42,0.10)',
                    background: '#f8fafc',
                    padding: '14px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={alertRequiresAck}
                    onChange={(e) => setAlertRequiresAck(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#8b1538' }}
                  />
                  Require acknowledgement
                </label>

                <button onClick={createAlert} style={buttonStyle(true)}>
                  Post Alert
                </button>
              </div>
            </section>

            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
                Active Alerts
              </h2>

              <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
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
                    No active alerts posted yet.
                  </div>
                )}

                {activeAlerts.map((alert) => {
                  const pill = priorityStyle(alert.priority);

                  return (
                    <div
                      key={alert.id}
                      style={{
                        borderRadius: 22,
                        background: '#f8fafc',
                        padding: 18,
                        border: '1px solid rgba(15,23,42,0.08)',
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 16,
                          flexWrap: 'wrap',
                          minWidth: 0,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
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

                          <p
                            style={{
                              marginTop: 12,
                              marginBottom: 0,
                              fontSize: 15,
                              lineHeight: 1.55,
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

                          <p
                            style={{
                              marginTop: 8,
                              marginBottom: 0,
                              fontSize: 12,
                              color: '#64748b',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {alertExpirationSummary(alert)}
                          </p>

                          {alert.requires_ack && (
                            <>
                              <div
                                style={{
                                  marginTop: 10,
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: '#334155',
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {alertAckSummaryByAlertId[alert.id]?.eligibleCount == null
                                  ? 'Acknowledgement count unavailable'
                                  : `${alertAckSummaryByAlertId[alert.id]?.acknowledgedCount ?? 0} / ${alertAckSummaryByAlertId[alert.id]?.eligibleCount ?? 0} acknowledged`}
                              </div>

                              <div
                                style={{
                                  marginTop: 8,
                                  display: 'inline-flex',
                                  borderRadius: 999,
                                  padding: '6px 10px',
                                  fontSize: 11,
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.12em',
                                  background: '#f1f5f9',
                                  color: '#334155',
                                }}
                              >
                                Requires acknowledgement
                              </div>
                            </>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {alert.requires_ack && (
                            <button
                              type="button"
                              onClick={() => openAcknowledgements(alert)}
                              style={secondaryButtonStyle()}
                            >
                              View acknowledgements
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => deleteAlert(alert.id)}
                            disabled={busyDeletingAlertId === alert.id}
                            style={{
                              ...buttonStyle(true, true),
                              opacity: busyDeletingAlertId === alert.id ? 0.7 : 1,
                            }}
                          >
                            {busyDeletingAlertId === alert.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
                Inactive Alerts
              </h2>

              <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
                {inactiveAlerts.length === 0 && (
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
                    No inactive alerts.
                  </div>
                )}

                {inactiveAlerts.map((alert) => {
                  const pill = priorityStyle(alert.priority);

                  return (
                    <div
                      key={alert.id}
                      style={{
                        borderRadius: 22,
                        background: '#f8fafc',
                        padding: 18,
                        border: '1px solid rgba(15,23,42,0.08)',
                        opacity: 0.82,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 16,
                          flexWrap: 'wrap',
                          minWidth: 0,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              gap: 8,
                              flexWrap: 'wrap',
                              alignItems: 'center',
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

                            <div
                              style={{
                                display: 'inline-flex',
                                borderRadius: 999,
                                padding: '6px 10px',
                                fontSize: 11,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.12em',
                                background: '#e2e8f0',
                                color: '#334155',
                              }}
                            >
                              Inactive
                            </div>
                          </div>

                          <p
                            style={{
                              marginTop: 12,
                              marginBottom: 0,
                              fontSize: 15,
                              lineHeight: 1.55,
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
                            Posted {new Date(alert.created_at).toLocaleString()}
                          </p>

                          <p
                            style={{
                              marginTop: 8,
                              marginBottom: 0,
                              fontSize: 12,
                              color: '#64748b',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {alertInactiveReason(alert)}
                          </p>

                          {alert.requires_ack && (
                            <div
                              style={{
                                marginTop: 8,
                                display: 'inline-flex',
                                borderRadius: 999,
                                padding: '6px 10px',
                                fontSize: 11,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.12em',
                                background: '#f1f5f9',
                                color: '#334155',
                              }}
                            >
                              Required acknowledgement
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => openReactivateAlert(alert)}
                            style={secondaryButtonStyle()}
                          >
                            Reactivate
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteAlert(alert.id)}
                            disabled={busyDeletingAlertId === alert.id}
                            style={{
                              ...buttonStyle(true, true),
                              opacity: busyDeletingAlertId === alert.id ? 0.7 : 1,
                            }}
                          >
                            {busyDeletingAlertId === alert.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}


        {active === 'details' && (
          <>
            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
                Add Detail
              </h2>

              {renderDetailForm(detailForm, detailFormAdapter, soldiers)}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                <button onClick={() => void saveDetail()} style={buttonStyle(true)}>
                  Save Detail
                </button>
              </div>
            </section>

            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
                Upcoming Details
              </h2>

              <div style={{ display: 'grid', gap: 12 }}>
                {existingDetails.length === 0 && (
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
                    No details posted yet.
                  </div>
                )}

                {existingDetails.map((detail) => (
                  <div
                    key={detail.id}
                    style={{
                      borderRadius: 22,
                      background: '#f8fafc',
                      padding: 18,
                      border: '1px solid rgba(15,23,42,0.08)',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                        minWidth: 0,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 17,
                            fontWeight: 700,
                            color: '#0f172a',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {detail.title}
                        </p>

                        <p
                          style={{
                            marginTop: 8,
                            marginBottom: 0,
                            fontSize: 14,
                            color: '#64748b',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {detail.detail_date}
                          {(detail.start_time || detail.end_time) &&
                            ` • ${[detail.start_time, detail.end_time].filter(Boolean).join(' - ')}`}
                          {detail.location ? ` • ${detail.location}` : ''}
                        </p>

                        {detail.leader && (
                          <p
                            style={{
                              marginTop: 10,
                              marginBottom: 0,
                              fontSize: 14,
                              color: '#475569',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            OIC / NCOIC: {detail.leader}
                          </p>
                        )}

                        {detail.notes && (
                          <p
                            style={{
                              marginTop: 10,
                              marginBottom: 0,
                              fontSize: 14,
                              color: '#475569',
                              lineHeight: 1.55,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {detail.notes}
                          </p>
                        )}

                        <div
                          style={{
                            marginTop: 12,
                            display: 'flex',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          {(detail.assignments ?? []).map((assignment) => {
                            const assignedProfile = normalizeProfile(assignment.user);

                            return (
                              <div
                                key={assignment.id}
                                style={{
                                  display: 'inline-flex',
                                  borderRadius: 999,
                                  padding: '6px 10px',
                                  fontSize: 11,
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.12em',
                                  background: '#ffffff',
                                  color: '#334155',
                                  border: '1px solid rgba(15,23,42,0.08)',
                                }}
                              >
                                {assignedProfile
                                  ? [assignedProfile.rank, assignedProfile.full_name].filter(Boolean).join(' ')
                                  : 'Unknown'}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => openDetailEditor(detail)}
                          style={secondaryButtonStyle()}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteDetail(detail.id)}
                          disabled={busyDeletingDetailId === detail.id}
                          style={{
                            ...buttonStyle(true, true),
                            opacity: busyDeletingDetailId === detail.id ? 0.7 : 1,
                          }}
                        >
                          {busyDeletingDetailId === detail.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {active === 'users' && (
          <>
            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
                User Control
              </h2>

              <p
                style={{
                  marginTop: 0,
                  marginBottom: 16,
                  fontSize: 14,
                  color: '#64748b',
                }}
              >
                Disable users who should no longer have access and promote or demote admins without
                deleting account history.
              </p>

              <div style={{ display: 'grid', gap: 12 }}>
                {soldiers.length === 0 && (
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
                    No users found.
                  </div>
                )}

                {soldiers.map((soldier) => {
                  const activeUser = soldier.is_active !== false;
                  const busy = busyUpdatingUserId === soldier.id;

                  return (
                    <div
                      key={soldier.id}
                      style={{
                        borderRadius: 22,
                        background: '#f8fafc',
                        padding: 18,
                        border: '1px solid rgba(15,23,42,0.08)',
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 16,
                          flexWrap: 'wrap',
                          minWidth: 0,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 17,
                              fontWeight: 700,
                              color: '#0f172a',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {[soldier.rank, soldier.full_name].filter(Boolean).join(' ')}
                          </p>

                          <div
                            style={{
                              marginTop: 10,
                              display: 'flex',
                              gap: 8,
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
                                background: soldier.role === 'admin' ? '#ede9fe' : '#e2e8f0',
                                color: soldier.role === 'admin' ? '#6d28d9' : '#334155',
                              }}
                            >
                              {soldier.role}
                            </div>

                            <div
                              style={{
                                display: 'inline-flex',
                                borderRadius: 999,
                                padding: '6px 10px',
                                fontSize: 11,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.12em',
                                background: activeUser ? '#dcfce7' : '#fee2e2',
                                color: activeUser ? '#166534' : '#991b1b',
                              }}
                            >
                              {activeUser ? 'Active' : 'Disabled'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => toggleUserRole(soldier)}
                            disabled={busy}
                            style={{
                              ...secondaryButtonStyle(),
                              opacity: busy ? 0.7 : 1,
                            }}
                          >
                            {soldier.role === 'admin' ? 'Make Soldier' : 'Make Admin'}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleUserActive(soldier)}
                            disabled={busy}
                            style={{
                              ...buttonStyle(true, !activeUser),
                              background: activeUser
                                ? 'linear-gradient(180deg, #b91c1c 0%, #991b1b 100%)'
                                : 'linear-gradient(180deg, #8b1538 0%, #6f102d 100%)',
                              boxShadow: activeUser
                                ? '0 14px 30px rgba(185,28,28,0.24)'
                                : '0 14px 30px rgba(139,21,56,0.28)',
                              opacity: busy ? 0.7 : 1,
                            }}
                          >
                            {activeUser ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {active === 'weekly' && (
          <>
            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
                Add Weekly Training Event
              </h2>

              {renderWeeklyForm(weeklyForm, setWeeklyForm)}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                <button onClick={() => void saveWeeklyEvent()} style={buttonStyle(true)}>
                  Save Event
                </button>
              </div>
            </section>

            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
                Existing Weekly Events
              </h2>

              <div style={{ display: 'grid', gap: 12 }}>
                {existingWeeklyEvents.length === 0 && (
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
                    No weekly events posted yet.
                  </div>
                )}

                {existingWeeklyEvents.map((event) => (
                  <div
                    key={event.id}
                    style={{
                      borderRadius: 22,
                      background: '#f8fafc',
                      padding: 18,
                      border: '1px solid rgba(15,23,42,0.08)',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                        minWidth: 0,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 17,
                            fontWeight: 700,
                            color: '#0f172a',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {event.title}
                        </p>

                        <p
                          style={{
                            marginTop: 8,
                            marginBottom: 0,
                            fontSize: 14,
                            color: '#64748b',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {event.event_date}
                          {(event.start_time || event.end_time) &&
                            ` • ${[event.start_time, event.end_time].filter(Boolean).join(' - ')}`}
                          {event.location ? ` • ${event.location}` : ''}
                        </p>

                        {event.description && (
                          <p
                            style={{
                              marginTop: 10,
                              marginBottom: 0,
                              fontSize: 14,
                              color: '#475569',
                              lineHeight: 1.55,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {event.description}
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => openWeeklyEditor(event)}
                          style={secondaryButtonStyle()}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteWeeklyEvent(event.id)}
                          disabled={busyDeletingWeeklyId === event.id}
                          style={{
                            ...buttonStyle(true, true),
                            opacity: busyDeletingWeeklyId === event.id ? 0.7 : 1,
                          }}
                        >
                          {busyDeletingWeeklyId === event.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {active === 'calendar' && (
          <>
            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
                Add Long Range Event
              </h2>

              {renderCalendarForm(calendarForm, setCalendarForm)}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                <button onClick={() => void saveCalendarEvent()} style={buttonStyle(true)}>
                  Save Event
                </button>
              </div>
            </section>

            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
                Existing Long Range Events
              </h2>

              <div style={{ display: 'grid', gap: 12 }}>
                {existingLongRangeEvents.length === 0 && (
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
                    No long range events posted yet.
                  </div>
                )}

                {existingLongRangeEvents.map((event) => (
                  <div
                    key={event.id}
                    style={{
                      borderRadius: 22,
                      background: '#f8fafc',
                      padding: 18,
                      border: '1px solid rgba(15,23,42,0.08)',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                        minWidth: 0,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 17,
                            fontWeight: 700,
                            color: '#0f172a',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {event.title}
                        </p>

                        <p
                          style={{
                            marginTop: 8,
                            marginBottom: 0,
                            fontSize: 14,
                            color: '#64748b',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {event.event_date}
                          {event.location ? ` • ${event.location}` : ''}
                        </p>

                        {event.description && (
                          <p
                            style={{
                              marginTop: 10,
                              marginBottom: 0,
                              fontSize: 14,
                              color: '#475569',
                              lineHeight: 1.55,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {event.description}
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => openCalendarEditor(event)}
                          style={secondaryButtonStyle()}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteCalendarEvent(event.id)}
                          disabled={busyDeletingCalendarId === event.id}
                          style={{
                            ...buttonStyle(true, true),
                            opacity: busyDeletingCalendarId === event.id ? 0.7 : 1,
                          }}
                        >
                          {busyDeletingCalendarId === event.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {active === 'leave' && (
          <>
            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
                Add Leave / DONSA
              </h2>

              {renderPeriodForm(periodForm, setPeriodForm)}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                <button onClick={() => void savePeriod()} style={buttonStyle(true)}>
                  Save Leave / DONSA
                </button>
              </div>
            </section>

            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
                Existing Leave / DONSA Items
              </h2>

              <div style={{ display: 'grid', gap: 12 }}>
                {existingPeriods.length === 0 && (
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
                    No leave or DONSA items posted yet.
                  </div>
                )}

                {existingPeriods.map((period) => (
                  <div
                    key={period.id}
                    style={{
                      borderRadius: 22,
                      background: '#f8fafc',
                      padding: 18,
                      border: '1px solid rgba(15,23,42,0.08)',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                        minWidth: 0,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            borderRadius: 999,
                            padding: '6px 10px',
                            fontSize: 11,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.12em',
                            background: period.period_type === 'leave' ? '#dbeafe' : '#ecfccb',
                            color: period.period_type === 'leave' ? '#1d4ed8' : '#3f6212',
                          }}
                        >
                          {period.period_type}
                        </div>

                        <p
                          style={{
                            marginTop: 12,
                            marginBottom: 0,
                            fontSize: 17,
                            fontWeight: 700,
                            color: '#0f172a',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {period.title}
                        </p>

                        <p
                          style={{
                            marginTop: 8,
                            marginBottom: 0,
                            fontSize: 14,
                            color: '#64748b',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {period.start_date} - {period.end_date}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => openPeriodEditor(period)}
                          style={secondaryButtonStyle()}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deletePeriod(period.id)}
                          disabled={busyDeletingPeriodId === period.id}
                          style={{
                            ...buttonStyle(true, true),
                            opacity: busyDeletingPeriodId === period.id ? 0.7 : 1,
                          }}
                        >
                          {busyDeletingPeriodId === period.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {active === 'jump' && (
          <>
            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
                Add Jump
              </h2>

              {renderJumpForm(jumpForm, jumpFormAdapter, soldiers)}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                <button onClick={() => void saveJump()} style={buttonStyle(true)}>
                  Create Jump
                </button>
              </div>
            </section>

            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
                Upcoming Jumps
              </h2>

              <div style={{ display: 'grid', gap: 12 }}>
                {upcomingJumps.length === 0 && (
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
                    No upcoming jumps posted yet.
                  </div>
                )}

                {upcomingJumps.map((jump) => (
                  <div
                    key={jump.id}
                    style={{
                      borderRadius: 22,
                      background: '#f8fafc',
                      border: '1px solid rgba(15,23,42,0.08)',
                      padding: '16px 18px',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                        minWidth: 0,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 17,
                            fontWeight: 700,
                            color: '#0f172a',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {jump.name}
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 14,
                            color: '#64748b',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {jump.location} • {jump.jump_date} • {jump.jump_type}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => openJumpEditor(jump)}
                          style={secondaryButtonStyle()}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteJump(jump.id)}
                          disabled={busyDeletingJumpId === jump.id}
                          style={{
                            ...buttonStyle(true, true),
                            opacity: busyDeletingJumpId === jump.id ? 0.7 : 1,
                          }}
                        >
                          {busyDeletingJumpId === jump.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {active === 'cq' && (
          <>
            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
                Add CQ Shift
              </h2>

              {renderCqForm(cqForm, setCqForm, soldiers)}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                <button onClick={() => void saveCQShift()} style={buttonStyle(true)}>
                  Save CQ Shift
                </button>
              </div>
            </section>

            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
                Full CQ Roster
              </h2>

              <div style={{ display: 'grid', gap: 12 }}>
                {existingCqShifts.length === 0 && (
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
                    No CQ shifts posted yet.
                  </div>
                )}

                {existingCqShifts.map((shift) => {
                  const soldierOne = normalizeProfile(shift.soldier_one);
                  const soldierTwo = normalizeProfile(shift.soldier_two);

                  return (
                    <div
                      key={shift.id}
                      style={{
                        borderRadius: 22,
                        background: '#f8fafc',
                        padding: 18,
                        border: '1px solid rgba(15,23,42,0.08)',
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 16,
                          flexWrap: 'wrap',
                          minWidth: 0,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 17,
                              fontWeight: 700,
                              color: '#0f172a',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {shift.shift_date}
                          </p>

                          <p
                            style={{
                              marginTop: 10,
                              marginBottom: 0,
                              fontSize: 14,
                              color: '#475569',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            Soldier One:{' '}
                            {soldierOne
                              ? [soldierOne.rank, soldierOne.full_name].filter(Boolean).join(' ')
                              : 'Unassigned'}
                          </p>

                          <p
                            style={{
                              marginTop: 6,
                              marginBottom: 0,
                              fontSize: 14,
                              color: '#475569',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            Soldier Two:{' '}
                            {soldierTwo
                              ? [soldierTwo.rank, soldierTwo.full_name].filter(Boolean).join(' ')
                              : 'Unassigned'}
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => openCQEditor(shift)}
                            style={secondaryButtonStyle()}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteCQShift(shift.id)}
                            disabled={busyDeletingShiftId === shift.id}
                            style={{
                              ...buttonStyle(true, true),
                              opacity: busyDeletingShiftId === shift.id ? 0.7 : 1,
                            }}
                          >
                            {busyDeletingShiftId === shift.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>


      {reactivatingAlert && (
        <ModalShell
          title="Reactivate Alert"
          description="Edit the alert, set a new expiration, then repost it as a fresh alert."
          onClose={closeReactivateAlert}
        >
          <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
            <textarea
              value={reactivationMessage}
              onChange={(e) => setReactivationMessage(e.target.value)}
              placeholder="Enter alert message..."
              style={{ ...inputStyle(), minHeight: 140, resize: 'vertical' }}
            />

            <select
              value={reactivationPriority}
              onChange={(e) => setReactivationPriority(e.target.value as AlertPriority)}
              style={inputStyle()}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={reactivationExpiration}
              onChange={(e) =>
                setReactivationExpiration(e.target.value as AlertExpirationOption)
              }
              style={inputStyle()}
            >
              <option value="24h">24 Hours</option>
              <option value="3d">3 Days</option>
              <option value="7d">7 Days</option>
              <option value="never">Never</option>
            </select>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                borderRadius: 18,
                border: '1px solid rgba(15,23,42,0.10)',
                background: '#f8fafc',
                padding: '14px 16px',
                fontSize: 14,
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={reactivationRequiresAck}
                onChange={(e) => setReactivationRequiresAck(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#8b1538' }}
              />
              Require acknowledgement
            </label>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
              <button
                type="button"
                onClick={repostAlert}
                disabled={busyRepostingAlert}
                style={{
                  ...buttonStyle(true),
                  opacity: busyRepostingAlert ? 0.7 : 1,
                }}
              >
                {busyRepostingAlert ? 'Reposting...' : 'Repost Alert'}
              </button>

              <button type="button" onClick={closeReactivateAlert} style={secondaryButtonStyle()}>
                Cancel
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {selectedAlertForAck && (
        <ModalShell
          title="Acknowledgements"
          description={
            selectedAlertForAck.requires_ack
              ? alertAckSummaryByAlertId[selectedAlertForAck.id]?.eligibleCount == null
                ? 'Count unavailable for older alerts posted before created by tracking was added.'
                : `${alertAckSummaryByAlertId[selectedAlertForAck.id]?.acknowledgedCount ?? 0} / ${alertAckSummaryByAlertId[selectedAlertForAck.id]?.eligibleCount ?? 0} acknowledged`
              : 'This alert does not require acknowledgement.'
          }
          onClose={closeAcknowledgements}
        >
          <div style={{ display: 'grid', gap: 12 }}>
            {(alertAckSummaryByAlertId[selectedAlertForAck.id]?.rows ?? []).length === 0 && (
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
                No one has acknowledged this alert yet.
              </div>
            )}

            {(alertAckSummaryByAlertId[selectedAlertForAck.id]?.rows ?? []).map((row) => {
              const profileValue = row.profiles;
              const acknowledgedProfile = Array.isArray(profileValue)
                ? (profileValue[0] ?? null)
                : (profileValue ?? null);

              return (
                <div
                  key={`${row.alert_id}-${row.user_id}`}
                  style={{
                    borderRadius: 22,
                    background: '#f8fafc',
                    padding: 16,
                    border: '1px solid rgba(15,23,42,0.08)',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#0f172a',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {acknowledgedProfile
                      ? [acknowledgedProfile.rank, acknowledgedProfile.full_name]
                          .filter(Boolean)
                          .join(' ')
                      : 'Unknown user'}
                  </p>

                  <p
                    style={{
                      marginTop: 8,
                      marginBottom: 0,
                      fontSize: 13,
                      color: '#64748b',
                    }}
                  >
                    {new Date(row.acknowledged_at).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </ModalShell>
      )}

      {editingWeeklyForm && (
        <ModalShell
          title="Edit Weekly Training Event"
          description="Update weekly event details without changing the main add form."
          onClose={closeWeeklyEditor}
        >
          {renderWeeklyForm(editingWeeklyForm, editingWeeklyFormAdapter)}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            <button
              type="button"
              onClick={saveEditingWeeklyEvent}
              disabled={busySavingWeeklyEdit}
              style={{
                ...buttonStyle(true),
                opacity: busySavingWeeklyEdit ? 0.7 : 1,
              }}
            >
              {busySavingWeeklyEdit ? 'Saving...' : 'Save Changes'}
            </button>

            <button type="button" onClick={closeWeeklyEditor} style={secondaryButtonStyle()}>
              Cancel
            </button>
          </div>
        </ModalShell>
      )}

      {editingCalendarForm && (
        <ModalShell
          title="Edit Long Range Event"
          description="Update long range event details without changing the main add form."
          onClose={closeCalendarEditor}
        >
          {renderCalendarForm(editingCalendarForm, editingCalendarFormAdapter)}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            <button
              type="button"
              onClick={saveEditingCalendarEvent}
              disabled={busySavingCalendarEdit}
              style={{
                ...buttonStyle(true),
                opacity: busySavingCalendarEdit ? 0.7 : 1,
              }}
            >
              {busySavingCalendarEdit ? 'Saving...' : 'Save Changes'}
            </button>

            <button type="button" onClick={closeCalendarEditor} style={secondaryButtonStyle()}>
              Cancel
            </button>
          </div>
        </ModalShell>
      )}

      {editingPeriodForm && (
        <ModalShell
          title="Edit Leave / DONSA"
          description="Update leave or DONSA details without changing the main add form."
          onClose={closePeriodEditor}
        >
          {renderPeriodForm(editingPeriodForm, editingPeriodFormAdapter)}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            <button
              type="button"
              onClick={saveEditingPeriod}
              disabled={busySavingPeriodEdit}
              style={{
                ...buttonStyle(true),
                opacity: busySavingPeriodEdit ? 0.7 : 1,
              }}
            >
              {busySavingPeriodEdit ? 'Saving...' : 'Save Changes'}
            </button>

            <button type="button" onClick={closePeriodEditor} style={secondaryButtonStyle()}>
              Cancel
            </button>
          </div>
        </ModalShell>
      )}

      {editingCqForm && (
        <ModalShell
          title="Edit CQ Shift"
          description="Update CQ details without changing the main add form."
          onClose={closeCQEditor}
        >
          {renderCqForm(editingCqForm, editingCqFormAdapter, soldiers)}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            <button
              type="button"
              onClick={saveEditingCQShift}
              disabled={busySavingCqEdit}
              style={{
                ...buttonStyle(true),
                opacity: busySavingCqEdit ? 0.7 : 1,
              }}
            >
              {busySavingCqEdit ? 'Saving...' : 'Save Changes'}
            </button>

            <button type="button" onClick={closeCQEditor} style={secondaryButtonStyle()}>
              Cancel
            </button>
          </div>
        </ModalShell>
      )}

      {editingDetailForm && (
        <ModalShell
          title="Edit Detail"
          description="Update detail information and assigned personnel without changing the main add form."
          onClose={closeDetailEditor}
        >
          {renderDetailForm(editingDetailForm, editingDetailFormAdapter, soldiers)}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            <button
              type="button"
              onClick={saveEditingDetail}
              disabled={busySavingDetailEdit}
              style={{
                ...buttonStyle(true),
                opacity: busySavingDetailEdit ? 0.7 : 1,
              }}
            >
              {busySavingDetailEdit ? 'Saving...' : 'Save Changes'}
            </button>

            <button type="button" onClick={closeDetailEditor} style={secondaryButtonStyle()}>
              Cancel
            </button>
          </div>
        </ModalShell>
      )}

      {editingJumpForm && (
        <ModalShell
          title="Edit Jump"
          description="Update jump details and manifest without changing the main add form."
          onClose={closeJumpEditor}
        >
          {renderJumpForm(editingJumpForm, editingJumpFormAdapter, soldiers)}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            <button
              type="button"
              onClick={saveEditingJump}
              disabled={busySavingJumpEdit}
              style={{
                ...buttonStyle(true),
                opacity: busySavingJumpEdit ? 0.7 : 1,
              }}
            >
              {busySavingJumpEdit ? 'Saving...' : 'Save Changes'}
            </button>

            <button type="button" onClick={closeJumpEditor} style={secondaryButtonStyle()}>
              Cancel
            </button>
          </div>
        </ModalShell>
      )}
    </>
  );
}