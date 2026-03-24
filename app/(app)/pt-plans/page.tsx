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

const squads = [
  { label: '1st Squad', value: '1st_squad' },
  { label: '2nd Squad', value: '2nd_squad' },
  { label: '3rd Squad', value: '3rd_squad' },
  { label: 'WPNS Squad', value: 'wpns_squad' },
] as const;

function pageShellStyle() {
  return {
    padding: 16,
    display: 'grid',
    gap: 16,
  } as const;
}

function squadButtonStyle(isSelected: boolean) {
  return {
    padding: '10px 12px',
    borderRadius: 14,
    border: isSelected ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.10)',
    background: isSelected ? '#ffffff' : 'rgba(255,255,255,0.08)',
    color: isSelected ? '#111827' : '#ffffff',
    fontWeight: 800,
    fontSize: 13,
    cursor: 'pointer',
  } as const;
}

export default function PTPlansPage() {
  const [selectedSquad, setSelectedSquad] = useState<(typeof squads)[number]['value']>('1st_squad');
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
        .select('id, storage_path, file_name, sort_order, file_type')
        .eq('post_id', post.id)
        .order('sort_order', { ascending: true });

      setAttachments(files || []);
      setLoading(false);
    }

    void fetchPT();
  }, [selectedSquad]);

  return (
    <div style={pageShellStyle()}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {squads.map((squad) => {
          const isSelected = selectedSquad === squad.value;

          return (
            <button
              key={squad.value}
              type="button"
              onClick={() => setSelectedSquad(squad.value)}
              style={squadButtonStyle(isSelected)}
            >
              {squad.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p style={{ color: '#ffffff', margin: 0 }}>Loading...</p>
      ) : (
        <DocumentAttachmentViewer
          attachments={attachments}
          emptyMessage="No PT plan posted for this squad."
          buttonLabel={`Open ${squads.find((squad) => squad.value === selectedSquad)?.label || 'PT'} Plan`}
        />
      )}
    </div>
  );
}
