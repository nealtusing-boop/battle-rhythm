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

type TrainingPost = {
  id: string;
  title: string;
  attachments: Attachment[];
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

export default function WeeklyTrainingPage() {
  const [items, setItems] = useState<TrainingPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchWeekly() {
      setLoading(true);

      const { data, error } = await supabase
        .from('document_posts')
        .select(
          `
            id,
            title,
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
        .eq('category', 'weekly_training')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error || !data) {
        setItems([]);
        setLoading(false);
        return;
      }

      const normalized = data.map((post) => ({
        id: post.id,
        title: post.title,
        attachments: [...(post.attachments || [])].sort((a, b) => a.sort_order - b.sort_order),
      }));

      setItems(normalized);
      setLoading(false);
    }

    void fetchWeekly();
  }, []);

  return (
    <div style={pageShellStyle()}>
      <section>
        <h1 style={{ margin: 0, fontSize: 40, fontWeight: 800, letterSpacing: '-0.05em', color: '#ffffff' }}>
          PLT Training Calendar
        </h1>
      </section>

      <section style={cardStyle()}>
        {loading ? (
          <p style={{ color: '#475569', margin: 0 }}>Loading...</p>
        ) : (
          <DocumentAttachmentListViewer
            items={items}
            emptyMessage="No PLT training calendar posted."
            autoOpenSingle
            buttonLabel="Open PLT Training Calendar"
          />
        )}
      </section>
    </div>
  );
}
