'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { DocumentAttachmentListViewer } from '@/components/document-attachment-viewer';

type ResourceAttachment = {
  id: string;
  storage_path: string;
  file_name: string;
  sort_order: number;
  file_type?: string | null;
};

type ResourcePost = {
  id: string;
  title: string;
  attachments: ResourceAttachment[];
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

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourcePost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchResources() {
      setLoading(true);

      const { data, error } = await supabase
        .from('document_posts')
        .select(
          `
            id,
            title,
            attachments:document_attachments (
              id,
              storage_path,
              file_name,
              sort_order,
              file_type
            )
          `
        )
        .eq('category', 'resource')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error || !data) {
        setResources([]);
        setLoading(false);
        return;
      }

      const normalized = data.map((post) => ({
        id: post.id,
        title: post.title,
        attachments: [...(post.attachments || [])].sort((a, b) => a.sort_order - b.sort_order),
      }));

      setResources(normalized);
      setLoading(false);
    }

    void fetchResources();
  }, []);

  return (
    <div style={pageShellStyle()}>
      <section>
        <h1 style={{ margin: 0, fontSize: 40, fontWeight: 800, letterSpacing: '-0.05em', color: '#ffffff' }}>
          SOP's & Resources
        </h1>
      </section>

      <section style={cardStyle()}>
        {loading ? (
          <p style={{ color: '#475569', margin: 0 }}>Loading...</p>
        ) : (
          <DocumentAttachmentListViewer items={resources} emptyMessage="No resources posted." />
        )}
      </section>
    </div>
  );
}
