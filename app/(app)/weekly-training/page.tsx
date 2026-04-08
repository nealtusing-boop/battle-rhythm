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
    <div style={{ padding: 16, display: 'grid', gap: 16 }}>
      <h1
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 800,
          color: '#ffffff',
        }}
      >
        PLT Training Calendar
      </h1>

      {loading ? (
        <p style={{ color: '#ffffff', margin: 0 }}>Loading...</p>
      ) : (
        <DocumentAttachmentListViewer items={items} emptyMessage="No PLT training calendar posted." />
      )}
    </div>
  );
}
