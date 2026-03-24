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

function heroCardStyle() {
  return {
    borderRadius: 24,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.10)',
    padding: 18,
    color: '#ffffff',
    backdropFilter: 'blur(8px)',
  } as const;
}

function sectionCardStyle() {
  return {
    display: 'grid',
    gap: 12,
  } as const;
}

export default function CQRosterPage() {
  const [cqFiles, setCqFiles] = useState<Attachment[]>([]);
  const [staffFiles, setStaffFiles] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchData() {
      setLoading(true);

      const { data: cqPost } = await supabase
        .from('document_posts')
        .select('id')
        .eq('category', 'cq_roster')
        .eq('subcategory', 'cq')
        .eq('is_active', true)
        .single();

      const { data: staffPost } = await supabase
        .from('document_posts')
        .select('id')
        .eq('category', 'cq_roster')
        .eq('subcategory', 'staff_duty')
        .eq('is_active', true)
        .single();

      if (cqPost) {
        const { data: files } = await supabase
          .from('document_attachments')
          .select('id, storage_path, file_name, sort_order, file_type')
          .eq('post_id', cqPost.id)
          .order('sort_order', { ascending: true });

        setCqFiles(files || []);
      } else {
        setCqFiles([]);
      }

      if (staffPost) {
        const { data: files } = await supabase
          .from('document_attachments')
          .select('id, storage_path, file_name, sort_order, file_type')
          .eq('post_id', staffPost.id)
          .order('sort_order', { ascending: true });

        setStaffFiles(files || []);
      } else {
        setStaffFiles([]);
      }

      setLoading(false);
    }

    void fetchData();
  }, []);

  return (
    <div style={pageShellStyle()}>
      <section style={heroCardStyle()}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            marginTop: 0,
            marginBottom: 0,
            color: '#ffffff',
          }}
        >
          CQ / Staff Duty
        </h1>
      </section>

      {loading ? (
        <p style={{ color: '#ffffff', margin: 0 }}>Loading...</p>
      ) : (
        <div style={{ display: 'grid', gap: 24 }}>
          <section style={sectionCardStyle()}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#ffffff' }}>CQ</h2>
            <DocumentAttachmentViewer attachments={cqFiles} emptyMessage="No CQ roster posted." />
          </section>

          <section style={sectionCardStyle()}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#ffffff' }}>Staff Duty</h2>
            <DocumentAttachmentViewer attachments={staffFiles} emptyMessage="No Staff Duty roster posted." />
          </section>
        </div>
      )}
    </div>
  );
}
