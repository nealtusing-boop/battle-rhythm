'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { DocumentAttachmentViewer } from '@/components/document-attachment-viewer';

type Attachment = {
  id: string;
  storage_path: string;
  file_name: string;
  sort_order: number;
  file_type?: string | null;
};

function pageShellStyle() {
  return {
    padding: 16,
    display: 'grid',
    gap: 16,
  } as const;
}

function cardStyle() {
  return {
    borderRadius: 30,
    background: '#ffffff',
    padding: 22,
    boxShadow: '0 18px 44px rgba(15,23,42,0.14)',
    color: '#0f172a',
  } as const;
}

function sectionLabelStyle() {
  return {
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#64748b',
    margin: 0,
  };
}

export default function CQRosterPage() {
  const [cqFiles, setCqFiles] = useState<Attachment[]>([]);
  const [staffFiles, setStaffFiles] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchRosterFiles(subcategory: 'cq' | 'staff_duty') {
      const { data: post } = await supabase
        .from('document_posts')
        .select('id')
        .eq('category', 'cq_roster')
        .eq('subcategory', subcategory)
        .eq('is_active', true)
        .single();

      if (!post) return [] as Attachment[];

      const { data: files } = await supabase
        .from('document_attachments')
        .select('id, storage_path, file_name, sort_order, file_type')
        .eq('post_id', post.id)
        .order('sort_order', { ascending: true });

      return files || [];
    }

    async function fetchData() {
      setLoading(true);
      const [nextCqFiles, nextStaffFiles] = await Promise.all([
        fetchRosterFiles('cq'),
        fetchRosterFiles('staff_duty'),
      ]);

      setCqFiles(nextCqFiles);
      setStaffFiles(nextStaffFiles);
      setLoading(false);
    }

    void fetchData();
  }, []);

  return (
    <div style={pageShellStyle()}>
      <section>
        <h1 style={{ margin: 0, fontSize: 40, fontWeight: 800, letterSpacing: '-0.05em', color: '#ffffff' }}>
          CQ / Staff Duty Roster
        </h1>
      </section>

      <section style={cardStyle()}>
        {loading ? (
          <p style={{ color: '#475569', margin: 0 }}>Loading...</p>
        ) : (
          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gap: 10 }}>
              <p style={sectionLabelStyle()}>CQ</p>
              <DocumentAttachmentViewer
                attachments={cqFiles}
                emptyMessage="No CQ roster posted."
                buttonLabel="Open CQ Roster"
              />
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <p style={sectionLabelStyle()}>Staff Duty</p>
              <DocumentAttachmentViewer
                attachments={staffFiles}
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
