'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
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
] as const;

type TabId = (typeof tabs)[number]['id'];

type ExistingAlert = {
  id: string;
  message: string;
  priority: AlertPriority;
  created_at: string;
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
  } as const;
}

function inputStyle() {
  return {
    width: '100%',
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

type JumpFormSetter = Dispatch<SetStateAction<JumpFormState | null>>;

function renderJumpForm(form: JumpFormState, setForm: JumpFormSetter, soldiers: Profile[]) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <input
        value={form.name}
        onChange={(e) =>
          setForm((current) => (current ? { ...current, name: e.target.value } : current))
        }
        placeholder="Jump name"
        style={inputStyle()}
      />
      <input
        value={form.location}
        onChange={(e) =>
          setForm((current) => (current ? { ...current, location: e.target.value } : current))
        }
        placeholder="Location"
        style={inputStyle()}
      />
      <input
        value={form.jump_date}
        onChange={(e) =>
          setForm((current) => (current ? { ...current, jump_date: e.target.value } : current))
        }
        type="date"
        style={inputStyle()}
      />
      <select
        value={form.jump_type}
        onChange={(e) =>
          setForm((current) =>
            current ? { ...current, jump_type: e.target.value as JumpType } : current
          )
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
            setForm((current) => (current ? { ...current, equipment: e.target.value } : current))
          }
          placeholder="Equipment list, separated by commas"
          style={{ ...inputStyle(), minHeight: 110, resize: 'vertical' }}
        />
      )}

      <div>
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
            paddingRight: 2,
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
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    setForm((current) => {
                      if (!current) return current;

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
                <span style={{ fontSize: 15, color: '#0f172a' }}>
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

export function AdminClient() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [active, setActive] = useState<TabId>('alerts');
  const [soldiers, setSoldiers] = useState<Profile[]>([]);
  const [upcomingJumps, setUpcomingJumps] = useState<ExistingJump[]>([]);
  const [existingAlerts, setExistingAlerts] = useState<ExistingAlert[]>([]);
  const [existingPeriods, setExistingPeriods] = useState<ExistingPeriod[]>([]);
  const [existingCqShifts, setExistingCqShifts] = useState<ExistingCqShift[]>([]);
  const [existingWeeklyEvents, setExistingWeeklyEvents] = useState<ExistingWeeklyEvent[]>([]);
  const [existingLongRangeEvents, setExistingLongRangeEvents] = useState<ExistingLongRangeEvent[]>(
    []
  );

  const [status, setStatus] = useState<string | null>(null);
  const [busyDeletingAlertId, setBusyDeletingAlertId] = useState<string | null>(null);
  const [busyDeletingPeriodId, setBusyDeletingPeriodId] = useState<string | null>(null);
  const [busyDeletingShiftId, setBusyDeletingShiftId] = useState<string | null>(null);
  const [busyDeletingWeeklyId, setBusyDeletingWeeklyId] = useState<string | null>(null);
  const [busyDeletingCalendarId, setBusyDeletingCalendarId] = useState<string | null>(null);
  const [busyDeletingJumpId, setBusyDeletingJumpId] = useState<string | null>(null);

  const [alertMessage, setAlertMessage] = useState('');
  const [alertPriority, setAlertPriority] = useState<AlertPriority>('medium');

  const [weeklyForm, setWeeklyForm] = useState({
    id: '',
    title: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    description: '',
  });

  const [calendarForm, setCalendarForm] = useState({
    id: '',
    title: '',
    event_date: '',
    location: '',
    description: '',
  });

  const [periodForm, setPeriodForm] = useState({
    id: '',
    title: '',
    period_type: 'leave',
    start_date: '',
    end_date: '',
  });

  const [cqForm, setCqForm] = useState({
    id: '',
    shift_date: '',
    soldier_one_id: '',
    soldier_two_id: '',
  });

  const [jumpForm, setJumpForm] = useState<JumpFormState>(emptyJumpForm());
  const [editingJumpForm, setEditingJumpForm] = useState<JumpFormState | null>(null);
  const [busySavingJumpEdit, setBusySavingJumpEdit] = useState(false);

  useEffect(() => {
    loadInitial();
  }, []);

  async function loadInitial() {
    const [
      { data: profiles },
      { data: jumps },
      { data: alerts },
      { data: periods },
      { data: cqShifts },
      { data: weeklyEvents },
      { data: longRangeEvents },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, rank, role')
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
        .select('id, message, priority, created_at')
        .order('created_at', { ascending: false }),
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
    ]);

    setSoldiers((profiles ?? []) as Profile[]);
    setUpcomingJumps((jumps ?? []) as ExistingJump[]);
    setExistingAlerts((alerts ?? []) as ExistingAlert[]);
    setExistingPeriods((periods ?? []) as ExistingPeriod[]);
    setExistingCqShifts((cqShifts ?? []) as ExistingCqShift[]);
    setExistingWeeklyEvents((weeklyEvents ?? []) as ExistingWeeklyEvent[]);
    setExistingLongRangeEvents((longRangeEvents ?? []) as ExistingLongRangeEvent[]);
  }

  async function createAlert() {
    setStatus(null);

    const trimmed = alertMessage.trim();
    if (!trimmed) {
      setStatus('Enter an alert message first.');
      return;
    }

    const { data, error } = await supabase
      .from('alerts')
      .insert({
        message: trimmed,
        priority: alertPriority,
      })
      .select('id, message, priority, created_at')
      .single();

    if (error) {
      setStatus(error.message);
      return;
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

    setAlertMessage('');
    setAlertPriority('medium');
    setStatus('Alert posted.');
    await loadInitial();
    router.refresh();
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

  async function saveWeeklyEvent() {
    setStatus(null);

    if (weeklyForm.start_time && !isValid24HourTime(weeklyForm.start_time)) {
      setStatus('Start time must be in 24-hour HH:MM format.');
      return;
    }

    if (weeklyForm.end_time && !isValid24HourTime(weeklyForm.end_time)) {
      setStatus('End time must be in 24-hour HH:MM format.');
      return;
    }

    const payload = {
      title: weeklyForm.title,
      event_date: weeklyForm.event_date,
      start_time: weeklyForm.start_time || null,
      end_time: weeklyForm.end_time || null,
      location: weeklyForm.location || null,
      description: weeklyForm.description || null,
    };

    if (weeklyForm.id) {
      const { error } = await supabase
        .from('weekly_training_events')
        .update(payload)
        .eq('id', weeklyForm.id);

      if (error) {
        setStatus(error.message);
        return;
      }

      setStatus('Weekly training event updated.');
    } else {
      const { error } = await supabase.from('weekly_training_events').insert(payload);

      if (error) {
        setStatus(error.message);
        return;
      }

      setStatus('Weekly training event created.');
    }

    setWeeklyForm({
      id: '',
      title: '',
      event_date: '',
      start_time: '',
      end_time: '',
      location: '',
      description: '',
    });

    await loadInitial();
    router.refresh();
  }

  function editWeeklyEvent(event: ExistingWeeklyEvent) {
    setActive('weekly');
    setWeeklyForm({
      id: event.id,
      title: event.title,
      event_date: event.event_date,
      start_time: event.start_time ?? '',
      end_time: event.end_time ?? '',
      location: event.location ?? '',
      description: event.description ?? '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
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

    setStatus('Weekly training event deleted.');
    setBusyDeletingWeeklyId(null);
    await loadInitial();
    router.refresh();
  }

  async function saveCalendarEvent() {
    setStatus(null);

    const payload = {
      title: calendarForm.title,
      event_date: calendarForm.event_date,
      location: calendarForm.location || null,
      description: calendarForm.description || null,
    };

    if (calendarForm.id) {
      const { error } = await supabase
        .from('long_range_events')
        .update(payload)
        .eq('id', calendarForm.id);

      if (error) {
        setStatus(error.message);
        return;
      }

      setStatus('Long range event updated.');
    } else {
      const { error } = await supabase.from('long_range_events').insert(payload);

      if (error) {
        setStatus(error.message);
        return;
      }

      setStatus('Long range event created.');
    }

    setCalendarForm({
      id: '',
      title: '',
      event_date: '',
      location: '',
      description: '',
    });

    await loadInitial();
    router.refresh();
  }

  function editCalendarEvent(event: ExistingLongRangeEvent) {
    setActive('calendar');
    setCalendarForm({
      id: event.id,
      title: event.title,
      event_date: event.event_date,
      location: event.location ?? '',
      description: event.description ?? '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
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

    setStatus('Long range event deleted.');
    setBusyDeletingCalendarId(null);
    await loadInitial();
    router.refresh();
  }

  async function savePeriod() {
    setStatus(null);

    const payload = {
      title: periodForm.title,
      period_type: periodForm.period_type,
      start_date: periodForm.start_date,
      end_date: periodForm.end_date,
    };

    if (periodForm.id) {
      const { error } = await supabase
        .from('leave_donsa_periods')
        .update(payload)
        .eq('id', periodForm.id);

      if (error) {
        setStatus(error.message);
        return;
      }

      setStatus('Leave / DONSA updated.');
    } else {
      const { error } = await supabase.from('leave_donsa_periods').insert(payload);

      if (error) {
        setStatus(error.message);
        return;
      }

      setStatus('Leave / DONSA created.');
    }

    setPeriodForm({
      id: '',
      title: '',
      period_type: 'leave',
      start_date: '',
      end_date: '',
    });

    await loadInitial();
    router.refresh();
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

    setStatus('Leave / DONSA deleted.');
    setBusyDeletingPeriodId(null);
    await loadInitial();
    router.refresh();
  }

  function editPeriod(period: ExistingPeriod) {
    setActive('leave');
    setPeriodForm({
      id: period.id,
      title: period.title,
      period_type: period.period_type,
      start_date: period.start_date,
      end_date: period.end_date,
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveCQShift() {
    setStatus(null);

    const payload = {
      shift_date: cqForm.shift_date,
      soldier_one_id: cqForm.soldier_one_id,
      soldier_two_id: cqForm.soldier_two_id,
    };

    if (cqForm.id) {
      const { error } = await supabase.from('cq_shifts').update(payload).eq('id', cqForm.id);

      if (error) {
        setStatus(error.message);
        return;
      }

      setStatus('CQ shift updated.');
    } else {
      const { error } = await supabase.from('cq_shifts').insert(payload);

      if (error) {
        setStatus(error.message);
        return;
      }

      setStatus('CQ shift created.');
    }

    setCqForm({
      id: '',
      shift_date: '',
      soldier_one_id: '',
      soldier_two_id: '',
    });

    await loadInitial();
    router.refresh();
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

    setStatus('CQ shift deleted.');
    setBusyDeletingShiftId(null);
    await loadInitial();
    router.refresh();
  }

  function editCQShift(shift: ExistingCqShift) {
    setActive('cq');
    setCqForm({
      id: shift.id,
      shift_date: shift.shift_date,
      soldier_one_id: shift.soldier_one_id ?? '',
      soldier_two_id: shift.soldier_two_id ?? '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const jumpFormAdapter: JumpFormSetter = (value) => {
    setJumpForm((current) => {
      if (typeof value === 'function') {
        const next = value(current);
        return next ?? current;
      }
      return value ?? current;
    });
  };

  return (
    <>
      <div style={{ display: 'grid', gap: 20 }}>
        <section style={sectionStyle()}>
          <div style={{ marginBottom: 16 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: '#0f172a',
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
              }}
            >
              Manage alerts, schedules, leave, jumps, manifests, and CQ in one place.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 2,
            }}
          >
            {tabs.map((tab) => {
              const activeTab = active === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  style={{
                    borderRadius: 18,
                    border: activeTab ? 'none' : '1px solid rgba(15,23,42,0.08)',
                    background: activeTab
                      ? 'linear-gradient(180deg, #8b1538 0%, #6f102d 100%)'
                      : '#f8fafc',
                    color: activeTab ? '#ffffff' : '#334155',
                    padding: '12px 16px',
                    fontSize: 14,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    boxShadow: activeTab ? '0 14px 28px rgba(139,21,56,0.24)' : 'none',
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

              <div style={{ display: 'grid', gap: 14 }}>
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

                <button onClick={createAlert} style={buttonStyle(true)}>
                  Post Alert
                </button>
              </div>
            </section>

            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 800 }}>
                Existing Alerts
              </h2>

              <div style={{ display: 'grid', gap: 12 }}>
                {existingAlerts.length === 0 && (
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
                    No alerts posted yet.
                  </div>
                )}

                {existingAlerts.map((alert) => {
                  const pill = priorityStyle(alert.priority);

                  return (
                    <div
                      key={alert.id}
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
                          gap: 16,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 220 }}>
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
                            }}
                          >
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>

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
                Add or Edit Weekly Training Event
              </h2>

              <div style={{ display: 'grid', gap: 14 }}>
                <input
                  value={weeklyForm.title}
                  onChange={(e) => setWeeklyForm({ ...weeklyForm, title: e.target.value })}
                  placeholder="Title"
                  style={inputStyle()}
                />

                <input
                  value={weeklyForm.event_date}
                  onChange={(e) => setWeeklyForm({ ...weeklyForm, event_date: e.target.value })}
                  type="date"
                  style={inputStyle()}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input
                    value={weeklyForm.start_time}
                    onChange={(e) => setWeeklyForm({ ...weeklyForm, start_time: e.target.value })}
                    placeholder="HH:MM"
                    inputMode="numeric"
                    style={inputStyle()}
                  />
                  <input
                    value={weeklyForm.end_time}
                    onChange={(e) => setWeeklyForm({ ...weeklyForm, end_time: e.target.value })}
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
                  value={weeklyForm.location}
                  onChange={(e) => setWeeklyForm({ ...weeklyForm, location: e.target.value })}
                  placeholder="Location"
                  style={inputStyle()}
                />

                <textarea
                  value={weeklyForm.description}
                  onChange={(e) => setWeeklyForm({ ...weeklyForm, description: e.target.value })}
                  placeholder="Description"
                  style={{ ...inputStyle(), minHeight: 110, resize: 'vertical' }}
                />

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button onClick={saveWeeklyEvent} style={buttonStyle(true)}>
                    {weeklyForm.id ? 'Update Event' : 'Save Event'}
                  </button>

                  {weeklyForm.id && (
                    <button
                      onClick={() =>
                        setWeeklyForm({
                          id: '',
                          title: '',
                          event_date: '',
                          start_time: '',
                          end_time: '',
                          location: '',
                          description: '',
                        })
                      }
                      style={secondaryButtonStyle()}
                    >
                      Clear Edit
                    </button>
                  )}
                </div>
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
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 17,
                            fontWeight: 700,
                            color: '#0f172a',
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
                            }}
                          >
                            {event.description}
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => editWeeklyEvent(event)}
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
                Add or Edit Long Range Event
              </h2>

              <div style={{ display: 'grid', gap: 14 }}>
                <input
                  value={calendarForm.title}
                  onChange={(e) => setCalendarForm({ ...calendarForm, title: e.target.value })}
                  placeholder="Title"
                  style={inputStyle()}
                />
                <input
                  value={calendarForm.event_date}
                  onChange={(e) => setCalendarForm({ ...calendarForm, event_date: e.target.value })}
                  type="date"
                  style={inputStyle()}
                />
                <input
                  value={calendarForm.location}
                  onChange={(e) => setCalendarForm({ ...calendarForm, location: e.target.value })}
                  placeholder="Location"
                  style={inputStyle()}
                />
                <textarea
                  value={calendarForm.description}
                  onChange={(e) => setCalendarForm({ ...calendarForm, description: e.target.value })}
                  placeholder="Description"
                  style={{ ...inputStyle(), minHeight: 110, resize: 'vertical' }}
                />

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button onClick={saveCalendarEvent} style={buttonStyle(true)}>
                    {calendarForm.id ? 'Update Event' : 'Save Event'}
                  </button>

                  {calendarForm.id && (
                    <button
                      onClick={() =>
                        setCalendarForm({
                          id: '',
                          title: '',
                          event_date: '',
                          location: '',
                          description: '',
                        })
                      }
                      style={secondaryButtonStyle()}
                    >
                      Clear Edit
                    </button>
                  )}
                </div>
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
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 17,
                            fontWeight: 700,
                            color: '#0f172a',
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
                            }}
                          >
                            {event.description}
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => editCalendarEvent(event)}
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
                Add or Edit Leave / DONSA
              </h2>

              <div style={{ display: 'grid', gap: 14 }}>
                <input
                  value={periodForm.title}
                  onChange={(e) => setPeriodForm({ ...periodForm, title: e.target.value })}
                  placeholder="Title"
                  style={inputStyle()}
                />
                <select
                  value={periodForm.period_type}
                  onChange={(e) =>
                    setPeriodForm({
                      ...periodForm,
                      period_type: e.target.value as 'leave' | 'donsa',
                    })
                  }
                  style={inputStyle()}
                >
                  <option value="leave">Leave</option>
                  <option value="donsa">DONSA</option>
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input
                    value={periodForm.start_date}
                    onChange={(e) => setPeriodForm({ ...periodForm, start_date: e.target.value })}
                    type="date"
                    style={inputStyle()}
                  />
                  <input
                    value={periodForm.end_date}
                    onChange={(e) => setPeriodForm({ ...periodForm, end_date: e.target.value })}
                    type="date"
                    style={inputStyle()}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button onClick={savePeriod} style={buttonStyle(true)}>
                    {periodForm.id ? 'Update Leave / DONSA' : 'Save Leave / DONSA'}
                  </button>

                  {periodForm.id && (
                    <button
                      onClick={() =>
                        setPeriodForm({
                          id: '',
                          title: '',
                          period_type: 'leave',
                          start_date: '',
                          end_date: '',
                        })
                      }
                      style={secondaryButtonStyle()}
                    >
                      Clear Edit
                    </button>
                  )}
                </div>
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
                      <div style={{ flex: 1, minWidth: 220 }}>
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
                          }}
                        >
                          {period.start_date} - {period.end_date}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => editPeriod(period)}
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
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <div
                          style={{
                            fontSize: 17,
                            fontWeight: 700,
                            color: '#0f172a',
                          }}
                        >
                          {jump.name}
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 14,
                            color: '#64748b',
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
                Add or Edit CQ Shift
              </h2>

              <div style={{ display: 'grid', gap: 14 }}>
                <input
                  value={cqForm.shift_date}
                  onChange={(e) => setCqForm({ ...cqForm, shift_date: e.target.value })}
                  type="date"
                  style={inputStyle()}
                />

                <select
                  value={cqForm.soldier_one_id}
                  onChange={(e) => setCqForm({ ...cqForm, soldier_one_id: e.target.value })}
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
                  value={cqForm.soldier_two_id}
                  onChange={(e) => setCqForm({ ...cqForm, soldier_two_id: e.target.value })}
                  style={inputStyle()}
                >
                  <option value="">Select second soldier</option>
                  {soldiers.map((soldier) => (
                    <option key={soldier.id} value={soldier.id}>
                      {soldier.rank} {soldier.full_name}
                    </option>
                  ))}
                </select>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button onClick={saveCQShift} style={buttonStyle(true)}>
                    {cqForm.id ? 'Update CQ Shift' : 'Save CQ Shift'}
                  </button>

                  {cqForm.id && (
                    <button
                      onClick={() =>
                        setCqForm({
                          id: '',
                          shift_date: '',
                          soldier_one_id: '',
                          soldier_two_id: '',
                        })
                      }
                      style={secondaryButtonStyle()}
                    >
                      Clear Edit
                    </button>
                  )}
                </div>
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
                        <div style={{ flex: 1, minWidth: 240 }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 17,
                              fontWeight: 700,
                              color: '#0f172a',
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
                            onClick={() => editCQShift(shift)}
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

      {editingJumpForm && (
        <div
          onClick={closeJumpEditor}
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
              background: '#ffffff',
              borderRadius: 30,
              padding: 22,
              boxShadow: '0 24px 60px rgba(15,23,42,0.28)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
                  Edit Jump
                </h2>
                <p
                  style={{
                    marginTop: 8,
                    marginBottom: 0,
                    fontSize: 14,
                    color: '#64748b',
                  }}
                >
                  Update jump details and manifest without changing the main add form.
                </p>
              </div>

              <button
                type="button"
                onClick={closeJumpEditor}
                style={{
                  ...secondaryButtonStyle(),
                  padding: '10px 14px',
                  lineHeight: 1,
                }}
              >
                Close
              </button>
            </div>

            {renderJumpForm(editingJumpForm, setEditingJumpForm, soldiers)}

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
          </div>
        </div>
      )}
    </>
  );
}