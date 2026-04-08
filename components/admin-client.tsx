'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import type { Profile } from '@/lib/types';

const DOC_BUCKET = 'battle-rhythm-docs';

const tabs = [
  { id: 'alerts', label: 'Alerts' },
  { id: 'weekly_training', label: 'PLT Training' },
  { id: 'long_range', label: 'Long Range' },
  { id: 'cq_roster', label: 'CQ / Staff' },
  { id: 'pt_plans', label: 'PT Plans' },
  { id: 'resources', label: 'SOPs & Resources' },
  { id: 'users', label: 'Users' },
] as const;

type TabId = (typeof tabs)[number]['id'];
type DocumentCategory = 'weekly_training' | 'long_range' | 'cq_roster' | 'pt_plan' | 'resource';
type PtSubcategory = '1st_squad' | '2nd_squad' | '3rd_squad' | 'wpns_squad';
type CqRosterSubcategory = 'cq' | 'staff_duty';

type ExistingAlert = {
  id: string;
  message: string;
  created_at: string;
  created_by: string | null;
  expires_at: string | null;
  is_active: boolean | null;
  alert_attachments?: DocumentAttachment[] | null;
};

type ManagedProfile = Profile & {
  is_active?: boolean;
};

type DocumentAttachment = {
  id: string;
  post_id: string;
  storage_path: string;
  file_name: string;
  file_type: string | null;
  sort_order: number;
  created_at: string;
};

type DocumentPost = {
  id: string;
  title: string;
  category: DocumentCategory;
  subcategory: string | null;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  attachments?: DocumentAttachment[] | null;
};

function sectionStyle() {
  return {
    background: '#ffffff',
    borderRadius: 28,
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

function textareaStyle() {
  return {
    ...inputStyle(),
    resize: 'vertical' as const,
    minHeight: 120,
    lineHeight: 1.55,
  };
}

function buttonStyle(primary = false, danger = false) {
  if (danger) {
    return {
      border: 'none',
      borderRadius: 18,
      padding: '14px 18px',
      minHeight: 50,
      fontSize: 15,
      fontWeight: 800,
      cursor: 'pointer',
      background: 'linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)',
      color: '#ffffff',
      boxShadow: '0 14px 28px rgba(220,38,38,0.22)',
    } as const;
  }

  if (primary) {
    return {
      border: 'none',
      borderRadius: 18,
      padding: '14px 18px',
      minHeight: 50,
      fontSize: 15,
      fontWeight: 800,
      cursor: 'pointer',
      background: 'linear-gradient(180deg, #8b1538 0%, #6f102d 100%)',
      color: '#ffffff',
      boxShadow: '0 14px 28px rgba(139,21,56,0.24)',
    } as const;
  }

  return {
    border: '1px solid rgba(15,23,42,0.10)',
    borderRadius: 18,
    padding: '14px 18px',
    minHeight: 50,
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
    background: '#f8fafc',
    color: '#334155',
  } as const;
}

function secondaryButtonStyle() {
  return buttonStyle(false, false);
}

function labelStyle() {
  return {
    display: 'grid',
    gap: 8,
    minWidth: 0,
  } as const;
}

function fieldLabelTextStyle() {
  return {
    fontSize: 13,
    fontWeight: 800,
    color: '#334155',
    letterSpacing: '0.04em',
  } as const;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function isAlertCurrentlyActive(alert: ExistingAlert) {
  if (alert.is_active === false) return false;
  if (!alert.expires_at) return true;
  return new Date(alert.expires_at).getTime() > Date.now();
}

function getFileFolder(category: DocumentCategory, subcategory: string | null) {
  if (category === 'pt_plan' && subcategory) {
    return `pt_plan/${subcategory}`;
  }
  return category;
}

function buildStoragePath(category: DocumentCategory, subcategory: string | null, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${getFileFolder(category, subcategory)}/${stamp}-${safeName}`;
}

function buildAlertStoragePath(fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `alerts/${stamp}-${safeName}`;
}

function inferDocumentTitle(category: DocumentCategory, subcategory: string | null) {
  if (category === 'weekly_training') return 'PLT Training Calendar';
  if (category === 'long_range') return 'Long Range Calendar';
  if (category === 'cq_roster') return subcategory === 'staff_duty' ? 'Staff Duty Roster' : 'CQ Roster';
  if (category === 'pt_plan') {
    if (!subcategory) return 'PT Plan';
    return `${subcategory.replace(/_/g, ' ')} PT Plan`;
  }
  return 'Resource';
}

function sortAttachments(items: DocumentAttachment[] | null | undefined) {
  return [...(items ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.file_name.localeCompare(b.file_name));
}

function toLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toLocalTimeInputValue(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function splitExpirationForForm(value: string | null) {
  if (!value) {
    const now = new Date();
    now.setHours(now.getHours() + 24);
    return {
      date: toLocalDateInputValue(now),
      time: toLocalTimeInputValue(now),
    };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date();
    fallback.setHours(fallback.getHours() + 24);
    return {
      date: toLocalDateInputValue(fallback),
      time: toLocalTimeInputValue(fallback),
    };
  }

  return {
    date: toLocalDateInputValue(date),
    time: toLocalTimeInputValue(date),
  };
}

function normalizeMilitaryTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function finalizeMilitaryTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length !== 4) return '';

  const hours = Number(digits.slice(0, 2));
  const minutes = Number(digits.slice(2, 4));

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return '';

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function buildExpirationIso(dateValue: string, timeValue: string) {
  const finalTime = finalizeMilitaryTimeInput(timeValue);
  if (!dateValue || !finalTime) return null;
  const combined = new Date(`${dateValue}T${finalTime}`);
  if (Number.isNaN(combined.getTime())) return null;
  return combined.toISOString();
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
          borderRadius: 28,
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
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{title}</h2>
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

          <button type="button" onClick={onClose} style={{ ...secondaryButtonStyle(), padding: '10px 14px' }}>
            Close
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function DocumentPostCard({
  post,
  onOpenAttachment,
  onDeletePost,
  busyDeleting,
}: {
  post: DocumentPost;
  onOpenAttachment: (attachment: DocumentAttachment) => Promise<void>;
  onDeletePost: (post: DocumentPost) => Promise<void>;
  busyDeleting: boolean;
}) {
  const attachments = sortAttachments(post.attachments);

  return (
    <div
      style={{
        borderRadius: 22,
        background: '#f8fafc',
        border: '1px solid rgba(15,23,42,0.08)',
        padding: '18px 18px',
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
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <div
              style={{
                display: 'inline-flex',
                borderRadius: 999,
                padding: '6px 10px',
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                background: post.is_active ? '#dcfce7' : '#e2e8f0',
                color: post.is_active ? '#166534' : '#334155',
              }}
            >
              {post.is_active ? 'Active' : 'Inactive'}
            </div>
            {post.subcategory && (
              <div
                style={{
                  display: 'inline-flex',
                  borderRadius: 999,
                  padding: '6px 10px',
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  background: '#ede9fe',
                  color: '#6d28d9',
                }}
              >
                {post.subcategory.replace(/_/g, ' ')}
              </div>
            )}
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 800,
              color: '#0f172a',
              overflowWrap: 'anywhere',
            }}
          >
            {post.title}
          </p>

          {post.description && (
            <p
              style={{
                marginTop: 10,
                marginBottom: 0,
                fontSize: 14,
                lineHeight: 1.55,
                color: '#475569',
                overflowWrap: 'anywhere',
              }}
            >
              {post.description}
            </p>
          )}

          <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: '#64748b' }}>
            Posted {formatDateTime(post.created_at)}
          </p>

          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            {attachments.length === 0 && (
              <div
                style={{
                  borderRadius: 18,
                  background: '#ffffff',
                  border: '1px solid rgba(15,23,42,0.08)',
                  padding: 14,
                  fontSize: 14,
                  color: '#475569',
                }}
              >
                No files attached.
              </div>
            )}

            {attachments.map((attachment, index) => (
              <div
                key={attachment.id}
                style={{
                  borderRadius: 18,
                  background: '#ffffff',
                  border: '1px solid rgba(15,23,42,0.08)',
                  padding: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#0f172a',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {attachments.length > 1 ? `Page ${index + 1}: ` : ''}
                    {attachment.file_name}
                  </p>
                  <p style={{ marginTop: 6, marginBottom: 0, fontSize: 12, color: '#64748b' }}>
                    {attachment.file_type || 'Unknown file type'}
                  </p>
                </div>
                <button type="button" onClick={() => void onOpenAttachment(attachment)} style={secondaryButtonStyle()}>
                  View File
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => void onDeletePost(post)}
            disabled={busyDeleting}
            style={{ ...buttonStyle(false, true), opacity: busyDeleting ? 0.7 : 1 }}
          >
            {busyDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function normalizeDocumentPosts(rows: any[] | null | undefined): DocumentPost[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    subcategory: row.subcategory,
    description: row.description,
    is_active: row.is_active ?? true,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    attachments: (row.document_attachments ?? row.attachments ?? []) as DocumentAttachment[],
  }));
}

function normalizeAlerts(rows: any[] | null | undefined): ExistingAlert[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    message: row.message,
    created_at: row.created_at,
    created_by: row.created_by,
    expires_at: row.expires_at,
    is_active: row.is_active ?? true,
    alert_attachments: (row.alert_attachments ?? []) as DocumentAttachment[],
  }));
}

export function AdminClient() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [active, setActive] = useState<TabId>('alerts');
  const [status, setStatus] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [soldiers, setSoldiers] = useState<ManagedProfile[]>([]);
  const [existingAlerts, setExistingAlerts] = useState<ExistingAlert[]>([]);
  const [documentPosts, setDocumentPosts] = useState<DocumentPost[]>([]);

  const defaultExpiry = splitExpirationForForm(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertExpiresDate, setAlertExpiresDate] = useState(defaultExpiry.date);
  const [alertExpiresTime, setAlertExpiresTime] = useState(defaultExpiry.time);
  const [reactivatingAlert, setReactivatingAlert] = useState<ExistingAlert | null>(null);
  const [reactivationMessage, setReactivationMessage] = useState('');
  const [reactivationExpiresDate, setReactivationExpiresDate] = useState(defaultExpiry.date);
  const [reactivationExpiresTime, setReactivationExpiresTime] = useState(defaultExpiry.time);
  const [busyDeletingAlertId, setBusyDeletingAlertId] = useState<string | null>(null);
  const [busyRepostingAlert, setBusyRepostingAlert] = useState(false);
  const [busyUpdatingUserId, setBusyUpdatingUserId] = useState<string | null>(null);

  const [docTitle, setDocTitle] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [ptSubcategory, setPtSubcategory] = useState<PtSubcategory>('1st_squad');
  const [cqSubcategory, setCqSubcategory] = useState<CqRosterSubcategory>('cq');
  const [ptWeekLabel, setPtWeekLabel] = useState('');
  const [cqMonthLabel, setCqMonthLabel] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [alertSelectedFiles, setAlertSelectedFiles] = useState<File[]>([]);
  const [busyUploading, setBusyUploading] = useState(false);
  const [busyDeletingPostId, setBusyDeletingPostId] = useState<string | null>(null);

  const selectedFilesRef = useRef<File[]>([]);
  const alertSelectedFilesRef = useRef<File[]>([]);
  const uploadInFlightRef = useRef(false);
  const alertPostInFlightRef = useRef(false);

  useEffect(() => {
    void loadInitial();
  }, []);

  async function loadInitial() {
    const [
      {
        data: { user },
      },
      { data: profiles, error: profilesError },
      { data: alerts, error: alertsError },
      { data: posts, error: postsError },
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('profiles')
        .select('id, full_name, rank, role, is_active')
        .order('rank', { ascending: true })
        .order('full_name', { ascending: true }),
      supabase
        .from('alerts')
        .select(
          `
            id,
            message,
            created_at,
            created_by,
            expires_at,
            is_active,
            alert_attachments (
              id,
              storage_path,
              file_name,
              file_type,
              sort_order,
              created_at
            )
          `
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('document_posts')
        .select(
          `
            id,
            title,
            category,
            subcategory,
            description,
            is_active,
            created_by,
            created_at,
            updated_at,
            document_attachments(
              id,
              post_id,
              storage_path,
              file_name,
              file_type,
              sort_order,
              created_at
            )
          `
        )
        .order('created_at', { ascending: false }),
    ]);

    if (profilesError || alertsError || postsError) {
      setStatus(profilesError?.message || alertsError?.message || postsError?.message || 'Failed to load admin data.');
      return;
    }

    const safeProfiles = ((profiles ?? []) as ManagedProfile[]).map((profile) => ({
      ...profile,
      is_active: profile.is_active ?? true,
    }));

    setCurrentUserId(user?.id ?? null);
    setSoldiers(safeProfiles);
    setExistingAlerts(normalizeAlerts(alerts));
    setDocumentPosts(normalizeDocumentPosts(posts));
  }

  const activeAlerts = useMemo(() => existingAlerts.filter((alert) => isAlertCurrentlyActive(alert)), [existingAlerts]);
  const inactiveAlerts = useMemo(() => existingAlerts.filter((alert) => !isAlertCurrentlyActive(alert)), [existingAlerts]);

  const currentWeeklyPost = useMemo(
    () => documentPosts.find((post) => post.category === 'weekly_training' && post.is_active) ?? null,
    [documentPosts]
  );

  const currentLongRangePost = useMemo(
    () => documentPosts.find((post) => post.category === 'long_range' && post.is_active) ?? null,
    [documentPosts]
  );

  const activeCqRosterPosts = useMemo(
    () =>
      documentPosts
        .filter((post) => post.category === 'cq_roster' && post.subcategory === 'cq' && post.is_active)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [documentPosts]
  );

  const activeStaffDutyPosts = useMemo(
    () =>
      documentPosts
        .filter((post) => post.category === 'cq_roster' && post.subcategory === 'staff_duty' && post.is_active)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [documentPosts]
  );

  const currentPtPosts = useMemo(
    () => documentPosts.filter((post) => post.category === 'pt_plan' && post.is_active),
    [documentPosts]
  );

  const resourcePosts = useMemo(
    () =>
      documentPosts
        .filter((post) => post.category === 'resource')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [documentPosts]
  );

  const weeklyTrainingPosts = useMemo(
    () =>
      documentPosts
        .filter((post) => post.category === 'weekly_training' && post.is_active)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [documentPosts]
  );

  const longRangePosts = useMemo(
    () =>
      documentPosts
        .filter((post) => post.category === 'long_range' && post.is_active)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [documentPosts]
  );

  function resetDocumentForm() {
    setDocTitle('');
    setDocDescription('');
    setPtWeekLabel('');
    setCqMonthLabel('');
    selectedFilesRef.current = [];
    setSelectedFiles([]);
  }

  function appendSelectedFiles(fileList: FileList | File[] | null) {
    if (!fileList) return;

    const incomingFiles = Array.isArray(fileList) ? fileList : Array.from(fileList);
    if (incomingFiles.length === 0) return;

    const mergeFiles = (current: File[]) => {
      const next = [...current];

      for (const file of incomingFiles) {
        const duplicate = next.some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size &&
            existing.lastModified === file.lastModified
        );

        if (!duplicate) {
          next.push(file);
        }
      }

      selectedFilesRef.current = next;
      return next;
    };

    selectedFilesRef.current = mergeFiles(selectedFilesRef.current);
    setSelectedFiles(selectedFilesRef.current);
  }

  function removeSelectedFile(indexToRemove: number) {
    setSelectedFiles((current) => {
      const next = current.filter((_, index) => index !== indexToRemove);
      selectedFilesRef.current = next;
      return next;
    });
  }

  function appendAlertFiles(fileList: FileList | File[] | null) {
    if (!fileList) return;

    const incomingFiles = Array.isArray(fileList) ? fileList : Array.from(fileList);
    if (incomingFiles.length === 0) return;

    const mergeFiles = (current: File[]) => {
      const next = [...current];

      for (const file of incomingFiles) {
        const duplicate = next.some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size &&
            existing.lastModified === file.lastModified
        );

        if (!duplicate) {
          next.push(file);
        }
      }

      alertSelectedFilesRef.current = next;
      return next;
    };

    alertSelectedFilesRef.current = mergeFiles(alertSelectedFilesRef.current);
    setAlertSelectedFiles(alertSelectedFilesRef.current);
  }

  function removeAlertFile(indexToRemove: number) {
    setAlertSelectedFiles((current) => {
      const next = current.filter((_, index) => index !== indexToRemove);
      alertSelectedFilesRef.current = next;
      return next;
    });
  }

  function resetAlertForm() {
    const next = splitExpirationForForm(null);
    setAlertMessage('');
    setAlertExpiresDate(next.date);
    setAlertExpiresTime(next.time);
    alertSelectedFilesRef.current = [];
    setAlertSelectedFiles([]);
  }

  function openReactivateAlert(alert: ExistingAlert) {
    const split = splitExpirationForForm(alert.expires_at);
    setReactivatingAlert(alert);
    setReactivationMessage(alert.message);
    setReactivationExpiresDate(split.date);
    setReactivationExpiresTime(split.time);
  }

  function closeReactivateAlert() {
    const next = splitExpirationForForm(null);
    setReactivatingAlert(null);
    setReactivationMessage('');
    setReactivationExpiresDate(next.date);
    setReactivationExpiresTime(next.time);
    setBusyRepostingAlert(false);
  }

  async function postAlert(values: {
    message: string;
    expiresDate: string;
    expiresTime: string;
    files?: File[];
  }) {
    const trimmed = values.message.trim();
    if (!trimmed) {
      setStatus('Enter an alert message first.');
      return false;
    }

    const expiresAt = buildExpirationIso(values.expiresDate, values.expiresTime);
    if (!expiresAt) {
      setStatus('Choose a valid expiration date and time.');
      return false;
    }

    const files = values.files ?? alertSelectedFilesRef.current;
    const uploadedPaths: string[] = [];
    let insertedAlertId: string | null = null;

    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert({
          message: trimmed,
          priority: 'medium',
          requires_ack: false,
          created_by: currentUserId,
          expires_at: expiresAt,
          is_active: true,
        })
        .select('id, message, created_at, created_by, expires_at, is_active')
        .single();

      if (error || !data) {
        setStatus(error?.message || 'Unable to create alert.');
        return false;
      }

      insertedAlertId = data.id;

      if (files.length > 0) {
        const attachmentRows = await Promise.all(
          files.map(async (file, index) => {
            const storagePath = buildAlertStoragePath(file.name);
            const { error: uploadError } = await supabase.storage.from(DOC_BUCKET).upload(storagePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

            if (uploadError) throw uploadError;

            uploadedPaths.push(storagePath);
            return {
              alert_id: data.id,
              storage_path: storagePath,
              file_name: file.name,
              file_type: file.type || null,
              sort_order: index,
            };
          })
        );

        const { error: attachmentError } = await supabase.from('alert_attachments').insert(attachmentRows);
        if (attachmentError) throw attachmentError;
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
      return true;
    } catch (error) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(DOC_BUCKET).remove(uploadedPaths);
      }

      if (insertedAlertId) {
        await supabase.from('alerts').delete().eq('id', insertedAlertId);
      }

      setStatus(error instanceof Error ? error.message : 'Unable to post alert.');
      return false;
    }
  }

  async function createAlert() {
    if (alertPostInFlightRef.current) return;

    alertPostInFlightRef.current = true;
    setStatus(null);

    try {
      const ok = await postAlert({
        message: alertMessage,
        expiresDate: alertExpiresDate,
        expiresTime: alertExpiresTime,
        files: alertSelectedFilesRef.current,
      });

      if (!ok) return;

      resetAlertForm();
      setStatus('Alert posted.');
    } finally {
      alertPostInFlightRef.current = false;
    }
  }

  async function repostAlert() {
    if (!reactivatingAlert) return;

    setStatus(null);
    setBusyRepostingAlert(true);

    const ok = await postAlert({
      message: reactivationMessage,
      expiresDate: reactivationExpiresDate,
      expiresTime: reactivationExpiresTime,
    });

    setBusyRepostingAlert(false);
    if (!ok) return;

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

    setBusyDeletingAlertId(null);
    setStatus('Alert deleted.');
    await loadInitial();
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
  }

  async function toggleUserActive(profile: ManagedProfile) {
    await updateUser(profile.id, { is_active: !(profile.is_active ?? true) });
  }

  async function toggleUserRole(profile: ManagedProfile) {
    const nextRole = profile.role === 'admin' ? 'soldier' : 'admin';
    await updateUser(profile.id, { role: nextRole as ManagedProfile['role'] });
  }

  async function openAttachment(attachment: DocumentAttachment) {
    setStatus(null);
    const { data, error } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(attachment.storage_path, 60);

    if (error || !data?.signedUrl) {
      setStatus(error?.message || 'Unable to open file.');
      return;
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function deactivateExistingPosts(category: DocumentCategory, subcategory: string | null) {
    let query = supabase
      .from('document_posts')
      .update({ is_active: false })
      .eq('category', category)
      .eq('is_active', true);

    if (subcategory) {
      query = query.eq('subcategory', subcategory);
    } else {
      query = query.is('subcategory', null);
    }

    const { error } = await query;
    if (error) throw error;
  }

  async function uploadDocumentPost(options: {
    category: DocumentCategory;
    subcategory?: string | null;
    title?: string;
    description?: string;
    allowMultiplePosts?: boolean;
  }) {
    if (uploadInFlightRef.current) return;

    setStatus(null);

    const filesToUpload = selectedFilesRef.current;
    if (filesToUpload.length === 0) {
      setStatus('Select at least one file first.');
      return;
    }

    const subcategory = options.subcategory ?? null;
    const trimmedTitle = (options.title ?? docTitle).trim() || inferDocumentTitle(options.category, subcategory);

    uploadInFlightRef.current = true;
    setBusyUploading(true);

    const description = (options.description ?? docDescription).trim() || null;
    const uploadedPaths: string[] = [];
    let insertedPostId: string | null = null;

    try {
      const { data: insertedPost, error: postError } = await supabase
        .from('document_posts')
        .insert({
          title: trimmedTitle,
          category: options.category,
          subcategory,
          description,
          is_active: options.allowMultiplePosts ? true : false,
          created_by: currentUserId,
        })
        .select('id')
        .single();

      if (postError || !insertedPost) {
        throw postError || new Error('Unable to create post.');
      }

      insertedPostId = insertedPost.id;

      const attachmentRows = await Promise.all(
        filesToUpload.map(async (file, index) => {
          const storagePath = buildStoragePath(options.category, subcategory, file.name);
          const { error: uploadError } = await supabase.storage.from(DOC_BUCKET).upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

          if (uploadError) throw uploadError;

          uploadedPaths.push(storagePath);
          return {
            post_id: insertedPost.id,
            storage_path: storagePath,
            file_name: file.name,
            file_type: file.type || null,
            sort_order: index,
          };
        })
      );

      const { error: attachmentError } = await supabase.from('document_attachments').insert(attachmentRows);
      if (attachmentError) throw attachmentError;

      if (!options.allowMultiplePosts) {
        await deactivateExistingPosts(options.category, subcategory);
        const { error: activateError } = await supabase
          .from('document_posts')
          .update({ is_active: true })
          .eq('id', insertedPost.id);

        if (activateError) throw activateError;
      }

      resetDocumentForm();
      setStatus('Document post uploaded.');
      await loadInitial();
    } catch (error) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(DOC_BUCKET).remove(uploadedPaths);
      }
      if (insertedPostId) {
        await supabase.from('document_attachments').delete().eq('post_id', insertedPostId);
        await supabase.from('document_posts').delete().eq('id', insertedPostId);
      }
      setStatus(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      uploadInFlightRef.current = false;
      setBusyUploading(false);
    }
  }

  async function deleteDocumentPost(post: DocumentPost) {
    setStatus(null);
    setBusyDeletingPostId(post.id);

    try {
      const paths = sortAttachments(post.attachments).map((attachment) => attachment.storage_path);
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from(DOC_BUCKET).remove(paths);
        if (storageError) throw storageError;
      }

      const { error } = await supabase.from('document_posts').delete().eq('id', post.id);
      if (error) throw error;

      setStatus('Document post deleted.');
      await loadInitial();
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to delete post.');
    } finally {
      setBusyDeletingPostId(null);
    }
  }

  function renderDocumentUploader({
    heading,
    description,
    category,
    currentPost,
    allowMultiplePosts = false,
    titlePlaceholder,
    buttonLabel,
    subcategory,
    titleValue,
    onTitleChange,
    showTitle = false,
    showDescription = false,
  }: {
    heading: string;
    description: string;
    category: DocumentCategory;
    currentPost?: DocumentPost | null;
    allowMultiplePosts?: boolean;
    titlePlaceholder: string;
    buttonLabel: string;
    subcategory?: string | null;
    titleValue?: string;
    onTitleChange?: (value: string) => void;
    showTitle?: boolean;
    showDescription?: boolean;
  }) {
    const controlledTitle = titleValue ?? docTitle;
    const setControlledTitle = onTitleChange ?? setDocTitle;

    return (
      <>
        <section style={sectionStyle()}>
          <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22, fontWeight: 800 }}>{heading}</h2>
          <p style={{ marginTop: 0, marginBottom: 18, fontSize: 14, color: '#64748b' }}>{description}</p>

          <div style={{ display: 'grid', gap: 14 }}>
            {showTitle && (
              <label style={labelStyle()}>
                <span style={fieldLabelTextStyle()}>Title</span>
                <input
                  value={controlledTitle}
                  onChange={(e) => setControlledTitle(e.target.value)}
                  placeholder={titlePlaceholder}
                  style={inputStyle()}
                />
              </label>
            )}

            {showDescription && (
              <label style={labelStyle()}>
                <span style={fieldLabelTextStyle()}>Description (optional)</span>
                <textarea
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Add an optional note for this upload."
                  style={textareaStyle()}
                />
              </label>
            )}

            <label style={labelStyle()}>
              <span style={fieldLabelTextStyle()}>
                Files {allowMultiplePosts || category === 'long_range' ? '(multiple allowed)' : ''}
              </span>
              <input
                type="file"
                accept=".pdf,image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.currentTarget.files ?? []);
                  appendSelectedFiles(files);
                  e.currentTarget.value = '';
                }}
                style={{ ...inputStyle(), padding: 12 }}
              />
            </label>

            {selectedFiles.length > 0 && (
              <div
                style={{
                  borderRadius: 20,
                  border: '1px solid rgba(15,23,42,0.08)',
                  background: '#f8fafc',
                  padding: 16,
                  display: 'grid',
                  gap: 8,
                }}
              >
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ fontSize: 14, color: '#334155', overflowWrap: 'anywhere', flex: 1, minWidth: 0 }}>
                      {selectedFiles.length > 1 ? `${index + 1}. ` : ''}
                      {file.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(index)}
                      style={{ ...secondaryButtonStyle(), padding: '8px 12px' }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() =>
                  void uploadDocumentPost({
                    category,
                    subcategory,
                    title: showTitle ? controlledTitle : inferDocumentTitle(category, subcategory ?? null),
                    description: showDescription ? docDescription : '',
                    allowMultiplePosts,
                  })
                }
                disabled={busyUploading}
                style={{ ...buttonStyle(true), opacity: busyUploading ? 0.7 : 1 }}
              >
                {busyUploading ? 'Uploading...' : buttonLabel}
              </button>

              <button type="button" onClick={resetDocumentForm} style={secondaryButtonStyle()}>
                Clear
              </button>
            </div>
          </div>
        </section>

        {!allowMultiplePosts && currentPost && (
          <section style={sectionStyle()}>
            <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 22, fontWeight: 800 }}>Current Active Post</h2>
            <DocumentPostCard
              post={currentPost}
              onOpenAttachment={openAttachment}
              onDeletePost={deleteDocumentPost}
              busyDeleting={busyDeletingPostId === currentPost.id}
            />
          </section>
        )}
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gap: 20, width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
        <section style={sectionStyle()}>
          <div style={{ marginBottom: 16, minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: '#0f172a',
                overflowWrap: 'anywhere',
              }}
            >
              Admin Controls
            </h2>
            <p style={{ marginTop: 8, marginBottom: 0, fontSize: 14, color: '#64748b' }}>
              
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
                  type="button"
                  onClick={() => {
                    setStatus(null);
                    resetDocumentForm();
                    setActive(tab.id);
                  }}
                  style={{
                    width: '100%',
                    minWidth: 0,
                    borderRadius: 18,
                    border: activeTab ? 'none' : '1px solid rgba(15,23,42,0.08)',
                    background: activeTab ? 'linear-gradient(180deg, #8b1538 0%, #6f102d 100%)' : '#f8fafc',
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
          <section style={{ ...sectionStyle(), padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#334155', overflowWrap: 'anywhere' }}>{status}</div>
          </section>
        )}

        {active === 'alerts' && (
          <>
            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22, fontWeight: 800 }}>Alert</h2>
              <p style={{ marginTop: 0, marginBottom: 18, fontSize: 14, color: '#64748b' }}>
                 
              </p>

              <div style={{ display: 'grid', gap: 14 }}>
                <label style={labelStyle()}>
                  <span style={fieldLabelTextStyle()}>Alert message</span>
                  <textarea
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    placeholder="Example: PT formation cancelled."
                    style={textareaStyle()}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
                  <label style={labelStyle()}>
                    <span style={fieldLabelTextStyle()}>Expiration date</span>
                    <input
                      type="date"
                      value={alertExpiresDate}
                      onChange={(e) => setAlertExpiresDate(e.target.value)}
                      style={{ ...inputStyle(), minHeight: 56, padding: '16px 18px', background: '#ffffff' }}
                    />
                  </label>

                  <label style={labelStyle()}>
                    <span style={fieldLabelTextStyle()}>Expiration time</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0000"
                      value={alertExpiresTime}
                      onChange={(e) => setAlertExpiresTime(normalizeMilitaryTimeInput(e.target.value))}
                      onBlur={() => setAlertExpiresTime((current) => finalizeMilitaryTimeInput(current) || current)}
                      maxLength={5}
                      style={{ ...inputStyle(), minHeight: 56, padding: '16px 18px', background: '#ffffff' }}
                    />
                  </label>
                </div>

                <label style={labelStyle()}>
                  <span style={fieldLabelTextStyle()}>Alert attachments</span>
                  <input
                    type="file"
                    accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.currentTarget.files ?? []);
                      appendAlertFiles(files);
                      e.currentTarget.value = '';
                    }}
                    style={{ ...inputStyle(), padding: 12 }}
                  />
                </label>

                {alertSelectedFiles.length > 0 && (
                  <div
                    style={{
                      borderRadius: 20,
                      border: '1px solid rgba(15,23,42,0.08)',
                      background: '#f8fafc',
                      padding: 16,
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    {alertSelectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ fontSize: 14, color: '#334155', overflowWrap: 'anywhere', flex: 1, minWidth: 0 }}>
                          {alertSelectedFiles.length > 1 ? `${index + 1}. ` : ''}
                          {file.name}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAlertFile(index)}
                          style={{ ...secondaryButtonStyle(), padding: '8px 12px' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button type="button" onClick={createAlert} disabled={alertPostInFlightRef.current} style={{ ...buttonStyle(true), opacity: alertPostInFlightRef.current ? 0.7 : 1 }}>
                    {alertPostInFlightRef.current ? 'Posting...' : 'Post Alert'}
                  </button>
                  <button type="button" onClick={resetAlertForm} style={secondaryButtonStyle()}>
                    Clear
                  </button>
                </div>
              </div>
            </section>

            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 22, fontWeight: 800 }}>Active Alerts</h2>

              <div style={{ display: 'grid', gap: 12 }}>
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
                    No active alerts.
                  </div>
                )}

                {activeAlerts.map((alert) => (
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
                    <p
                      style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#0f172a',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {alert.message}
                    </p>

                    <p style={{ marginTop: 12, marginBottom: 0, fontSize: 13, color: '#64748b' }}>
                      Posted {formatDateTime(alert.created_at)}
                      {alert.expires_at ? ` • Expires ${formatDateTime(alert.expires_at)}` : ''}
                    </p>

                    {sortAttachments(alert.alert_attachments).length > 0 && (
                      <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                        {sortAttachments(alert.alert_attachments).map((attachment) => (
                          <div
                            key={attachment.id}
                            style={{
                              borderRadius: 18,
                              background: '#ffffff',
                              border: '1px solid rgba(15,23,42,0.08)',
                              padding: 14,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              flexWrap: 'wrap',
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a', overflowWrap: 'anywhere' }}>
                                {attachment.file_name}
                              </p>
                              <p style={{ marginTop: 6, marginBottom: 0, fontSize: 12, color: '#64748b' }}>
                                {attachment.file_type || 'Unknown file type'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void openAttachment(attachment)}
                              style={secondaryButtonStyle()}
                            >
                              View File
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => openReactivateAlert(alert)} style={secondaryButtonStyle()}>
                        Repost
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteAlert(alert.id)}
                        disabled={busyDeletingAlertId === alert.id}
                        style={{ ...buttonStyle(false, true), opacity: busyDeletingAlertId === alert.id ? 0.7 : 1 }}
                      >
                        {busyDeletingAlertId === alert.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 22, fontWeight: 800 }}>Inactive / Expired Alerts</h2>

              <div style={{ display: 'grid', gap: 12 }}>
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

                {inactiveAlerts.map((alert) => (
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
                    <p
                      style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#0f172a',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {alert.message}
                    </p>
                    <p style={{ marginTop: 12, marginBottom: 0, fontSize: 13, color: '#64748b' }}>
                      Posted {formatDateTime(alert.created_at)}
                      {alert.expires_at ? ` • Expired ${formatDateTime(alert.expires_at)}` : ''}
                    </p>

                    {sortAttachments(alert.alert_attachments).length > 0 && (
                      <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                        {sortAttachments(alert.alert_attachments).map((attachment) => (
                          <div
                            key={attachment.id}
                            style={{
                              borderRadius: 18,
                              background: '#ffffff',
                              border: '1px solid rgba(15,23,42,0.08)',
                              padding: 14,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              flexWrap: 'wrap',
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a', overflowWrap: 'anywhere' }}>
                                {attachment.file_name}
                              </p>
                              <p style={{ marginTop: 6, marginBottom: 0, fontSize: 12, color: '#64748b' }}>
                                {attachment.file_type || 'Unknown file type'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void openAttachment(attachment)}
                              style={secondaryButtonStyle()}
                            >
                              View File
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => openReactivateAlert(alert)} style={secondaryButtonStyle()}>
                        Reactivate
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteAlert(alert.id)}
                        disabled={busyDeletingAlertId === alert.id}
                        style={{ ...buttonStyle(false, true), opacity: busyDeletingAlertId === alert.id ? 0.7 : 1 }}
                      >
                        {busyDeletingAlertId === alert.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {active === 'weekly_training' && (
          <>
            {renderDocumentUploader({
              heading: 'PLT Training Calendar',
              description:   '',
              category: 'weekly_training',
              currentPost: currentWeeklyPost,
              allowMultiplePosts: true,
              titlePlaceholder: 'Example: 15 - 22 APR 2026',
              buttonLabel: 'Upload',
              showTitle: true,
              showDescription: false,
            })}

            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 22, fontWeight: 800 }}>Current Calendar Posts</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {weeklyTrainingPosts.length === 0 && (
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
                    No calendar posts uploaded.
                  </div>
                )}

                {weeklyTrainingPosts.map((post) => (
                  <DocumentPostCard
                    key={post.id}
                    post={post}
                    onOpenAttachment={openAttachment}
                    onDeletePost={deleteDocumentPost}
                    busyDeleting={busyDeletingPostId === post.id}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {active === 'long_range' && (
          <>
            {renderDocumentUploader({
              heading: 'Long Range Calendar',
              description:  '',
              category: 'long_range',
              currentPost: currentLongRangePost,
              allowMultiplePosts: true,
              titlePlaceholder: 'Example: April - May 2026',
              buttonLabel: 'Upload',
              showTitle: true,
            })}

            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 22, fontWeight: 800 }}>Current Calendar Posts</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {longRangePosts.length === 0 && (
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
                    No calendar posts uploaded yet.
                  </div>
                )}

                {longRangePosts.map((post) => (
                  <DocumentPostCard
                    key={post.id}
                    post={post}
                    onOpenAttachment={openAttachment}
                    onDeletePost={deleteDocumentPost}
                    busyDeleting={busyDeletingPostId === post.id}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {active === 'cq_roster' && (
          <>
            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22, fontWeight: 800 }}>CQ / Staff Duty</h2>
              <p style={{ marginTop: 0, marginBottom: 18, fontSize: 14, color: '#64748b' }}>

              </p>

              <div style={{ display: 'grid', gap: 14 }}>
                <label style={labelStyle()}>
                  <span style={fieldLabelTextStyle()}>Roster Type</span>
                  <select value={cqSubcategory} onChange={(e) => setCqSubcategory(e.target.value as CqRosterSubcategory)} style={inputStyle()}>
                    <option value="cq">CQ</option>
                    <option value="staff_duty">Staff Duty</option>
                  </select>
                </label>

                <label style={labelStyle()}>
                  <span style={fieldLabelTextStyle()}>Month</span>
                  <input
                    value={cqMonthLabel}
                    onChange={(e) => setCqMonthLabel(e.target.value)}
                    placeholder="Example: April 2026"
                    style={inputStyle()}
                  />
                </label>

                <label style={labelStyle()}>
                  <span style={fieldLabelTextStyle()}>Files</span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.currentTarget.files ?? []);
                      appendSelectedFiles(files);
                      e.currentTarget.value = '';
                    }}
                    style={{ ...inputStyle(), padding: 12 }}
                  />
                </label>

                {selectedFiles.length > 0 && (
                  <div
                    style={{
                      borderRadius: 20,
                      border: '1px solid rgba(15,23,42,0.08)',
                      background: '#f8fafc',
                      padding: 16,
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ fontSize: 14, color: '#334155', overflowWrap: 'anywhere', flex: 1, minWidth: 0 }}>
                          {selectedFiles.length > 1 ? `${index + 1}. ` : ''}
                          {file.name}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(index)}
                          style={{ ...secondaryButtonStyle(), padding: '8px 12px' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() =>
                      void uploadDocumentPost({
                        category: 'cq_roster',
                        subcategory: cqSubcategory,
                        title: cqMonthLabel.trim() || (cqSubcategory === 'cq' ? 'CQ Roster' : 'Staff Duty Roster'),
                        description: '',
                        allowMultiplePosts: true,
                      })
                    }
                    disabled={busyUploading}
                    style={{ ...buttonStyle(true), opacity: busyUploading ? 0.7 : 1 }}
                  >
                    {busyUploading ? 'Uploading...' : `Upload ${cqSubcategory === 'cq' ? 'CQ' : 'Staff Duty'}`}
                  </button>

                  <button type="button" onClick={resetDocumentForm} style={secondaryButtonStyle()}>
                    Clear
                  </button>
                </div>
              </div>
            </section>

            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 22, fontWeight: 800 }}>Current Rosters</h2>
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>CQ</div>
                  {activeCqRosterPosts.length > 0 ? (
                    activeCqRosterPosts.map((post) => (
                      <DocumentPostCard
                        key={post.id}
                        post={post}
                        onOpenAttachment={openAttachment}
                        onDeletePost={deleteDocumentPost}
                        busyDeleting={busyDeletingPostId === post.id}
                      />
                    ))
                  ) : (
                    <div style={{ borderRadius: 22, background: '#f8fafc', padding: 16, border: '1px solid rgba(15,23,42,0.08)', fontSize: 14, color: '#475569' }}>
                      No CQ roster posted.
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>Staff Duty</div>
                  {activeStaffDutyPosts.length > 0 ? (
                    activeStaffDutyPosts.map((post) => (
                      <DocumentPostCard
                        key={post.id}
                        post={post}
                        onOpenAttachment={openAttachment}
                        onDeletePost={deleteDocumentPost}
                        busyDeleting={busyDeletingPostId === post.id}
                      />
                    ))
                  ) : (
                    <div style={{ borderRadius: 22, background: '#f8fafc', padding: 16, border: '1px solid rgba(15,23,42,0.08)', fontSize: 14, color: '#475569' }}>
                      No Staff Duty roster posted.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {active === 'pt_plans' && (
          <>
            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22, fontWeight: 800 }}>PT Plans</h2>
              <p style={{ marginTop: 0, marginBottom: 18, fontSize: 14, color: '#64748b' }}>

              </p>

              <div style={{ display: 'grid', gap: 14 }}>
                <label style={labelStyle()}>
                  <span style={fieldLabelTextStyle()}>Squad</span>
                  <select value={ptSubcategory} onChange={(e) => setPtSubcategory(e.target.value as PtSubcategory)} style={inputStyle()}>
                    <option value="1st_squad">1st Squad</option>
                    <option value="2nd_squad">2nd Squad</option>
                    <option value="3rd_squad">3rd Squad</option>
                    <option value="wpns_squad">WPNS Squad</option>
                  </select>
                </label>

                <label style={labelStyle()}>
                  <span style={fieldLabelTextStyle()}>Week</span>
                  <input
                    value={ptWeekLabel}
                    onChange={(e) => setPtWeekLabel(e.target.value)}
                    placeholder="Example: Week of 15 APR 2026"
                    style={inputStyle()}
                  />
                </label>

                <label style={labelStyle()}>
                  <span style={fieldLabelTextStyle()}>Files</span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.currentTarget.files ?? []);
                      appendSelectedFiles(files);
                      e.currentTarget.value = '';
                    }}
                    style={{ ...inputStyle(), padding: 12 }}
                  />
                </label>

                {selectedFiles.length > 0 && (
                  <div
                    style={{
                      borderRadius: 20,
                      border: '1px solid rgba(15,23,42,0.08)',
                      background: '#f8fafc',
                      padding: 16,
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ fontSize: 14, color: '#334155', overflowWrap: 'anywhere', flex: 1, minWidth: 0 }}>
                          {selectedFiles.length > 1 ? `${index + 1}. ` : ''}
                          {file.name}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(index)}
                          style={{ ...secondaryButtonStyle(), padding: '8px 12px' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() =>
                      void uploadDocumentPost({
                        category: 'pt_plan',
                        subcategory: ptSubcategory,
                        title: ptWeekLabel.trim() || `${ptSubcategory.replace(/_/g, ' ')} PT Plan`,
                        description: '',
                        allowMultiplePosts: true,
                      })
                    }
                    disabled={busyUploading}
                    style={{ ...buttonStyle(true), opacity: busyUploading ? 0.7 : 1 }}
                  >
                    {busyUploading ? 'Uploading...' : 'Upload PT Plan'}
                  </button>
                  <button type="button" onClick={resetDocumentForm} style={secondaryButtonStyle()}>
                    Clear
                  </button>
                </div>
              </div>
            </section>

            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 22, fontWeight: 800 }}>Current PT Plans</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {currentPtPosts.length === 0 && (
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
                    No PT plans uploaded yet.
                  </div>
                )}

                {currentPtPosts.map((post) => (
                  <DocumentPostCard
                    key={post.id}
                    post={post}
                    onOpenAttachment={openAttachment}
                    onDeletePost={deleteDocumentPost}
                    busyDeleting={busyDeletingPostId === post.id}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {active === 'resources' && (
          <>
            {renderDocumentUploader({
              heading: "SOP's & Resources",
              description: ' ',
              category: 'resource',
              allowMultiplePosts: true,
              titlePlaceholder: 'Example: Platoon SOP',
              buttonLabel: 'Upload Resource',
              showTitle: true,
              showDescription: false,
            })}

            <section style={sectionStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 22, fontWeight: 800 }}>Current SOP's & Resources</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {resourcePosts.length === 0 && (
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
                    No resources uploaded yet.
                  </div>
                )}

                {resourcePosts.map((post) => (
                  <DocumentPostCard
                    key={post.id}
                    post={post}
                    onOpenAttachment={openAttachment}
                    onDeletePost={deleteDocumentPost}
                    busyDeleting={busyDeletingPostId === post.id}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {active === 'users' && (
          <section style={sectionStyle()}>
            <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 22, fontWeight: 800 }}>User Control</h2>
            <p style={{ marginTop: 0, marginBottom: 16, fontSize: 14, color: '#64748b' }}>
            
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
                        display: 'grid',
                        gap: 14,
                        minWidth: 0,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 16,
                            fontWeight: 700,
                            color: '#0f172a',
                            lineHeight: 1.3,
                            wordBreak: 'break-word',
                          }}
                        >
                          {[soldier.rank, soldier.full_name].filter(Boolean).join(' ')}
                        </p>

                        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                          gap: 10,
                          width: '100%',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => void toggleUserRole(soldier)}
                          disabled={busy}
                          style={{
                            ...secondaryButtonStyle(),
                            opacity: busy ? 0.7 : 1,
                            width: '100%',
                            minWidth: 0,
                            textAlign: 'center',
                          }}
                        >
                          {soldier.role === 'admin' ? 'Make Soldier' : 'Make Admin'}
                        </button>

                        <button
                          type="button"
                          onClick={() => void toggleUserActive(soldier)}
                          disabled={busy}
                          style={{
                            ...buttonStyle(true, !activeUser),
                            opacity: busy ? 0.7 : 1,
                            width: '100%',
                            minWidth: 0,
                            textAlign: 'center',
                            background: activeUser
                              ? 'linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)'
                              : 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
                            boxShadow: activeUser
                              ? '0 14px 28px rgba(220,38,38,0.22)'
                              : '0 14px 28px rgba(22,163,74,0.22)',
                          }}
                        >
                          {activeUser ? 'Disable User' : 'Enable User'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {reactivatingAlert && (
        <ModalShell
          title="Reactivate Alert"
          description="Repost this alert with a fresh expiration date and time."
          onClose={closeReactivateAlert}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <label style={labelStyle()}>
              <span style={fieldLabelTextStyle()}>Alert message</span>
              <textarea value={reactivationMessage} onChange={(e) => setReactivationMessage(e.target.value)} style={textareaStyle()} />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
              <label style={labelStyle()}>
                <span style={fieldLabelTextStyle()}>Expiration date</span>
                <input
                  type="date"
                  value={reactivationExpiresDate}
                  onChange={(e) => setReactivationExpiresDate(e.target.value)}
                  style={{ ...inputStyle(), minHeight: 56, padding: '16px 18px', background: '#ffffff' }}
                />
              </label>

              <label style={labelStyle()}>
                <span style={fieldLabelTextStyle()}>Expiration time (24-hour)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0000"
                  value={reactivationExpiresTime}
                  onChange={(e) => setReactivationExpiresTime(normalizeMilitaryTimeInput(e.target.value))}
                  onBlur={() => setReactivationExpiresTime((current) => finalizeMilitaryTimeInput(current) || current)}
                  maxLength={5}
                  style={{ ...inputStyle(), minHeight: 56, padding: '16px 18px', background: '#ffffff' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
              <button
                type="button"
                onClick={repostAlert}
                disabled={busyRepostingAlert}
                style={{ ...buttonStyle(true), opacity: busyRepostingAlert ? 0.7 : 1 }}
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
    </>
  );
}
