export type AppRole = 'soldier' | 'admin';
export type AlertPriority = 'high' | 'medium' | 'low';
export type PeriodType = 'leave' | 'donsa';
export type JumpType = 'Hollywood' | 'Combat';

export type Profile = {
  id: string;
  full_name: string;
  rank: string;
  role: AppRole;
  is_active?: boolean;
  created_at?: string;
};

export type AlertItem = {
  id: string;
  message: string;
  priority: AlertPriority;
  created_at: string;
  created_by?: string | null;
  requires_ack?: boolean | null;
};

export type AlertAcknowledgement = {
  id?: string;
  alert_id: string;
  user_id: string;
  acknowledged_at?: string;
};

export type WeeklyTrainingEvent = {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  created_at?: string;
};

export type LongRangeEvent = {
  id: string;
  title: string;
  event_date: string;
  description: string | null;
  location: string | null;
};

export type LeaveDonsaEvent = {
  id: string;
  title: string;
  period_type: PeriodType;
  start_date: string;
  end_date: string;
};

export type Jump = {
  id: string;
  name: string;
  location: string;
  jump_date: string;
  jump_type: JumpType;
  equipment_list: string[] | null;
  manifest?: JumpManifestEntry[];
};

export type JumpManifestEntry = {
  id: string;
  jump_id: string;
  soldier_id: string;
  sort_order: number;
  soldier?: Profile;
};

export type CQShift = {
  id: string;
  shift_date: string;
  soldier_one_id: string;
  soldier_two_id: string;
  soldier_one?: Profile;
  soldier_two?: Profile;
};
