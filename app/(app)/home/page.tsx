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

type DetailAssignmentProfileRow = {
  id: string;
  full_name: string | null;
  rank: string | null;
  role: string | null;
};

type DetailAssignmentRow = {
  id: string;
  detail_id: string;
  user_id: string;
  user?: DetailAssignmentProfileRow | DetailAssignmentProfileRow[] | null;
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

function formatTimeRange(startTime: string | null, endTime: string | null) {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  if (startTime) return startTime;
  if (endTime) return `Until ${endTime}`;
  return 'Time TBD';
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
  let details: DetailRow[] = [];

  if (user?.id) {
    const [profileResult, eventsResult, alertsResult, cqResult, detailsResult] = await Promise.all([
      supabase.from('profiles').select('id, full_name, rank, role').eq('id', user.id).maybeSingle(),
      supabase.from('weekly_training_events').select('*').eq('event_date', today),
      supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('cq_shifts').select('*').gte('shift_date', today),
      supabase.from('details').select('*').gte('detail_date', today),
    ]);

    profile = profileResult.data ?? null;
    events = eventsResult.data ?? [];
    latestAlert = alertsResult.data ?? null;
    cq = cqResult.data ?? [];
    details = detailsResult.data ?? [];
  }

  return <div>Updated order applied</div>;
}
