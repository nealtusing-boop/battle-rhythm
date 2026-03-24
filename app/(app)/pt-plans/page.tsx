'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

type Attachment = {
  id: string;
  storage_path: string;
  file_name: string;
  sort_order: number;
};

const squads = [
  { label: '1st Squad', value: '1st_squad' },
  { label: '2nd Squad', value: '2nd_squad' },
  { label: '3rd Squad', value: '3rd_squad' },
  { label: 'WPNS Squad', value: 'wpns_squad' },
];

export default function PTPlansPage() {
  const [selectedSquad, setSelectedSquad] = useState('1st_squad');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchPT() {
      setLoading(true);

      const { data: post } = await supabase
        .from('document_posts')
        .select('id')
        .eq('category', 'pt_plan')
        .eq('subcategory', selectedSquad)
        .eq('is_active', true)
        .single();

      if (!post) {
        setAttachments([]);
        setLoading(false);
        return;
      }

      const { data: files } = await supabase
        .from('document_attachments')
        .select('id, storage_path, file_name, sort_order')
        .eq('post_id', post.id)
        .order('sort_order', { ascending: true });

      setAttachments(files || []);
      setLoading(false);
    }

    fetchPT();
  }, [selectedSquad]);

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
        PT Plans
      </h1>

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        {squads.map((squad) => {
          const isSelected = selectedSquad === squad.value;

          return (
            <button
              key={squad.value}
              type="button"
              onClick={() => setSelectedSquad(squad.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: isSelected ? '2px solid #4CAF50' : '1px solid #d1d5db',
                backgroundColor: isSelected ? '#e8f5e9' : '#ffffff',
                color: '#111827',
                fontWeight: isSelected ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              {squad.label}
            </button>
          );
        })}
      </div>

      {loading && <p>Loading...</p>}

      {!loading && attachments.length === 0 && (
        <p>No PT plan posted for this squad.</p>
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