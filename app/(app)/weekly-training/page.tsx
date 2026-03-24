'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

type Attachment = {
  id: string;
  storage_path: string;
  file_name: string;
  sort_order: number;
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
        .select('*')
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

    fetchWeekly();
  }, []);

  function getPublicUrl(path: string) {
    const supabase = createClient();
    const { data } = supabase.storage
      .from('battle-rhythm-docs')
      .getPublicUrl(path);

    return data.publicUrl;
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
        Weekly Training
      </h1>

      {loading && <p>Loading...</p>}

      {!loading && attachments.length === 0 && (
        <p>No weekly training posted.</p>
      )}

      {!loading &&
        attachments.map((file) => {
          const url = getPublicUrl(file.storage_path);

          return (
            <div key={file.id} style={{ marginBottom: 16 }}>
              <img
                src={url}
                alt={file.file_name}
                style={{
                  width: '100%',
                  borderRadius: 12,
                }}
              />
            </div>
          );
        })}
    </div>
  );
}