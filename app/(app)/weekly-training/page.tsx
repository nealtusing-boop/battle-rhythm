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

type Post = {
  id: string;
  title: string;
  description: string | null;
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

export default function WeeklyTrainingPage() {
  const [post, setPost] = useState<Post | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchWeekly() {
      setLoading(true);

      const { data: activePost, error: postError } = await supabase
        .from('document_posts')
        .select('id, title, description')
        .eq('category', 'weekly_training')
        .eq('is_active', true)
        .single();

      if (postError || !activePost) {
        setPost(null);
        setAttachments([]);
        setLoading(false);
        return;
      }

      setPost(activePost);

      const { data: files, error: filesError } = await supabase
        .from('document_attachments')
        .select('id, storage_path, file_name, sort_order, file_type')
        .eq('post_id', activePost.id)
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
    <div style={pageShellStyle()}>
      <section style={heroCardStyle()}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            marginTop: 0,
            marginBottom: 8,
            color: '#ffffff',
          }}
        >
          Weekly Training
        </h1>

        {post?.title ? (
          <p style={{ marginTop: 0, marginBottom: post.description ? 8 : 0, fontWeight: 700, color: '#ffffff' }}>
            {post.title}
          </p>
        ) : null}

        {post?.description ? (
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.82)', lineHeight: 1.55 }}>{post.description}</p>
        ) : null}
      </section>

      {loading ? (
        <p style={{ color: '#ffffff', margin: 0 }}>Loading...</p>
      ) : (
        <DocumentAttachmentViewer attachments={attachments} emptyMessage="No weekly training posted." />
      )}
    </div>
  );
}
