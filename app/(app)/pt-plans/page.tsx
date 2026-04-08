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

type PTPost = {
  id: string;
  title: string;
  attachments: Attachment[];
};

const squads = [
  { label: '1st Squad', value: '1st_squad' },
  { label: '2nd Squad', value: '2nd_squad' },
  { label: '3rd Squad', value: '3rd_squad' },
  { label: 'WPNS Squad', value: 'wpns_squad' },
] as const;

function cardStyle() {
  return {
    borderRadius: 28,
    background: '#ffffff',
    padding: 22,
    boxShadow: '0 18px 40px rgba(15,23,42,0.14)',
    color: '#0f172a',
  } as const;
}

function pageTitleStyle() {
  return {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.04,
    fontWeight: 800,
    letterSpacing: '-0.05em',
    color: '#ffffff',
  } as const;
}

function squadButtonStyle(isSelected: boolean) {
  return {
    padding: '12px 16px',
    minHeight: 48,
    borderRadius: 16,
    border: isSelected ? '1px solid #0f172a' : '1px solid rgba(15,23,42,0.10)',
    background: isSelected ? '#0f172a' : '#f8fafc',
    color: isSelected ? '#ffffff' : '#0f172a',
    fontWeight: 800,
    fontSize: 14,
    letterSpacing: '-0.02em',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  } as const;
}

export default function PTPlansPage() {
  const [selectedSquad, setSelectedSquad] = useState<(typeof squads)[number]['value']>('1st_squad');
  const [posts, setPosts] = useState<PTPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchPT() {
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
        .eq('category', 'pt_plan')
        .eq('subcategory', selectedSquad)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error || !data) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const normalized = data.map((post) => ({
        id: post.id,
        title: post.title,
        attachments: [...(post.attachments || [])].sort((a, b) => a.sort_order - b.sort_order),
      }));

      setPosts(normalized);
      setLoading(false);
    }

    void fetchPT();
  }, [selectedSquad]);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ padding: '4px 2px 0 2px' }}>
        <h1 style={{ ...pageTitleStyle(), maxWidth: 620 }}>PT Plans</h1>
      </section>

      <section style={cardStyle()}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
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
          <p style={{ color: '#475569', margin: 0, fontSize: 14 }}>Loading...</p>
        ) : (
          <DocumentAttachmentListViewer
            items={posts}
            emptyMessage="No PT plan posted for this squad."
            buttonLabel={`Open ${squads.find((squad) => squad.value === selectedSquad)?.label || 'PT'} Plan`}
          />
        )}
      </section>
    </div>
  );
}
