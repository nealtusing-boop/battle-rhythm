'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

type Attachment = {
  id: string;
  storage_path: string;
  file_name: string;
  sort_order: number;
};

type Post = {
  id: string;
  title: string;
  description: string | null;
};

export default function LongRangePage() {
  const [post, setPost] = useState<Post | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchLongRange() {
      setLoading(true);

      const { data: activePost, error: postError } = await supabase
        .from('document_posts')
        .select('id, title, description')
        .eq('category', 'long_range')
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
        .select('id, storage_path, file_name, sort_order')
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

    fetchLongRange();
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
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
        Long Range Calendar
      </h1>

      {post?.title ? (
        <p style={{ marginTop: 0, marginBottom: 8, fontWeight: 500 }}>
          {post.title}
        </p>
      ) : null}

      {post?.description ? (
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.8 }}>
          {post.description}
        </p>
      ) : null}

      {loading && <p>Loading...</p>}

      {!loading && attachments.length === 0 && (
        <p>No long range calendar posted.</p>
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
                  display: 'block',
                }}
              />
            </div>
          );
        })}
    </div>
  );
}