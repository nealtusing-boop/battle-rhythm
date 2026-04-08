'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { DocumentAttachmentListViewer } from '@/components/document-attachment-viewer';

type Attachment = {
  id: string;
  storage_path: string;
  file_name: string;
  sort_order: number;
  file_type?: string | null;
};

type RosterPost = {
  id: string;
  title: string;
  subcategory: 'cq' | 'staff_duty';
  attachments: Attachment[];
};

function cardStyle() {
  return {
    borderRadius: 28,
    background: '#ffffff',
    padding: 22,
    boxShadow: '0 18px 40px rgba(15,23,42,0.14)',
    color: '#0f172a',
  } as const;
}

function pageTitleStyle() {
  return {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.04,
    fontWeight: 800,
    letterSpacing: '-0.05em',
    color: '#ffffff',
  } as const;
}

function sectionLabelStyle() {
  return {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: '#64748b',
    margin: 0,
  } as const;
}

export default function CQRosterPage() {
  const [cqPosts, setCqPosts] = useState<RosterPost[]>([]);
  const [staffDutyPosts, setStaffDutyPosts] = useState<RosterPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchData() {
      setLoading(true);

      const { data, error } = await supabase
        .from('document_posts')
        .select(
          `
            id,
            title,
            subcategory,
            created_at,
            attachments:document_attachments (
              id,
              storage_path,
              file_name,
              sort_order,
              file_type
            )
          `
        )
        .eq('category', 'cq_roster')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error || !data) {
        setCqPosts([]);
        setStaffDutyPosts([]);
        setLoading(false);
        return;
      }

      const normalized = data.map((post) => ({
        id: post.id,
        title: post.title,
        subcategory: (post.subcategory ?? 'cq') as 'cq' | 'staff_duty',
        attachments: [...(post.attachments || [])].sort((a, b) => a.sort_order - b.sort_order),
      }));

      setCqPosts(normalized.filter((post) => post.subcategory === 'cq'));
      setStaffDutyPosts(normalized.filter((post) => post.subcategory === 'staff_duty'));
      setLoading(false);
    }

    void fetchData();
  }, []);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ padding: '4px 2px 0 2px' }}>
        <h1 style={{ ...pageTitleStyle(), maxWidth: 620 }}>CQ / Staff Duty Roster</h1>
      </section>

      <section style={cardStyle()}>
        {loading ? (
          <p style={{ color: '#475569', margin: 0, fontSize: 14 }}>Loading...</p>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ display: 'grid', gap: 10 }}>
              <p style={sectionLabelStyle()}>CQ</p>
              <DocumentAttachmentListViewer
                items={cqPosts}
                emptyMessage="No CQ roster posted."
                buttonLabel="Open CQ Roster"
              />
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <p style={sectionLabelStyle()}>Staff Duty</p>
              <DocumentAttachmentListViewer
                items={staffDutyPosts}
                emptyMessage="No Staff Duty roster posted."
                buttonLabel="Open Staff Duty Roster"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
