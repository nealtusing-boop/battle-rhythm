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

export default function WeeklyTrainingPage() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchWeekly() {
      setLoading(true);

      const { data: post, error: postError } = await supabase
        .from('document_posts')
        .select('id')
        .eq('category', 'weekly_training')
        .eq('is_active', true)
        .single();

      if (postError || !post) {
        setAttachments([]);
        setLoading(false);
        return;
      }

      const { data: files, error: filesError } = await supabase
        .from('document_attachments')
        .select('id, storage_path, file_name, sort_order, file_type')
        .eq('post_id', post.id)
        .order('sort_order', { ascending: true });

      if (filesError || !files) {
        setAttachments([]);
        setLoading(false);
        return;
      }

      setAttachments(files);
      setLoading(false);
    }

    void fetchWeekly();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      {loading ? (
        <p style={{ color: '#ffffff', margin: 0 }}>Loading...</p>
      ) : (
        <DocumentAttachmentViewer
          attachments={attachments}
          emptyMessage="No weekly training posted."
          autoOpen
          onCloseHref="/home"
        />
      )}
    </div>
  );
}
