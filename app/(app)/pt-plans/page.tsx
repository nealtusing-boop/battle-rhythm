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

function cardStyle() {
  return {
    borderRadius: 30,
    background: '#ffffff',
    padding: 22,
    boxShadow: '0 18px 44px rgba(15,23,42,0.14)',
    color: '#0f172a',
  } as const;
}

function squadButtonStyle(isSelected: boolean) {
  return {
    padding: '10px 12px',
    borderRadius: 14,
    border: isSelected ? '1px solid #0f172a' : '1px solid rgba(15,23,42,0.10)',
    background: isSelected ? '#0f172a' : '#f8fafc',
    color: isSelected ? '#ffffff' : '#0f172a',
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
      <section>
        <h1 style={{ margin: 0, fontSize: 40, fontWeight: 800, letterSpacing: '-0.05em', color: '#ffffff' }}>
          PT Plans
        </h1>
      </section>

      <section style={cardStyle()}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
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
          <p style={{ color: '#475569', margin: 0 }}>Loading...</p>
        ) : (
          <DocumentAttachmentViewer
            attachments={attachments}
            emptyMessage="No PT plan posted for this squad."
            buttonLabel={`Open ${squads.find((squad) => squad.value === selectedSquad)?.label || 'PT'} Plan`}
          />
        )}
      </section>
    </div>
  );
}
