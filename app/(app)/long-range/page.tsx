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

type LongRangePost = {
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

export default function LongRangePage() {
  const [items, setItems] = useState<LongRangePost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchLongRange() {
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
        .eq('category', 'long_range')
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

    void fetchLongRange();
  }, []);

  return (
    <div style={pageShellStyle()}>
      <section>
        <h1 style={{ margin: 0, fontSize: 40, fontWeight: 800, letterSpacing: '-0.05em', color: '#ffffff' }}>
          Long Range Calendar
        </h1>
      </section>

      <section style={cardStyle()}>
        {loading ? (
          <p style={{ color: '#475569', margin: 0 }}>Loading...</p>
        ) : (
          <DocumentAttachmentListViewer
            items={items}
            emptyMessage="No long range calendar posted."
            autoOpenSingle
            buttonLabel="Open Long Range Calendar"
          />
        )}
      </section>
    </div>
  );
}
