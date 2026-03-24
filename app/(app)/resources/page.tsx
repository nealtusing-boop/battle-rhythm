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
      <h1
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 800,
          color: '#ffffff',
        }}
      >
        Resources
      </h1>

      {loading ? (
        <p style={{ color: '#ffffff', margin: 0 }}>Loading...</p>
      ) : (
        <DocumentAttachmentListViewer items={resources} emptyMessage="No resources posted." />
      )}
    </div>
  );
}