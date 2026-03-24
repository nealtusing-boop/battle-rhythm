'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';

type ResourceAttachment = {
  id: string;
  storage_path: string;
  file_name: string;
  sort_order: number;
};

type ResourcePost = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  attachments: ResourceAttachment[];
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourcePost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchResources() {
      setLoading(true);

      const { data, error } = await supabase
        .from('document_posts')
        .select(`
          id,
          title,
          description,
          created_at,
          attachments:document_attachments (
            id,
            storage_path,
            file_name,
            sort_order
          )
        `)
        .eq('category', 'resource')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error || !data) {
        setResources([]);
        setLoading(false);
        return;
      }

      const normalized: ResourcePost[] = data.map((post) => ({
        id: post.id,
        title: post.title,
        description: post.description,
        created_at: post.created_at,
        attachments: [...(post.attachments || [])].sort(
          (a, b) => a.sort_order - b.sort_order
        ),
      }));

      setResources(normalized);
      setLoading(false);
    }

    fetchResources();
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
      <h1
        style={{
          fontSize: 20,
          fontWeight: 700,
          marginTop: 0,
          marginBottom: 16,
          color: '#ffffff',
        }}
      >
        Resources
      </h1>

      {loading && (
        <p style={{ color: '#ffffff', margin: 0 }}>
          Loading...
        </p>
      )}

      {!loading && resources.length === 0 && (
        <p style={{ color: '#ffffff', margin: 0 }}>
          No resources posted.
        </p>
      )}

      {!loading &&
        resources.map((resource) => (
          <div
            key={resource.id}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                marginTop: 0,
                marginBottom: 8,
                color: '#111827',
              }}
            >
              {resource.title}
            </h2>

            {resource.description ? (
              <p
                style={{
                  marginTop: 0,
                  marginBottom: 12,
                  color: '#4b5563',
                  lineHeight: 1.5,
                }}
              >
                {resource.description}
              </p>
            ) : null}

            {resource.attachments.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  color: '#6b7280',
                }}
              >
                No files attached.
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {resource.attachments.map((file) => {
                  const url = getPublicUrl(file.storage_path);

                  return (
                    <div
                      key={file.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '12px 14px',
                        borderRadius: 12,
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <div
                        style={{
                          color: '#111827',
                          fontWeight: 500,
                          wordBreak: 'break-word',
                          flex: 1,
                        }}
                      >
                        {file.file_name}
                      </div>

                      <Link
                        href={url}
                        target="_blank"
                        style={{
                          flexShrink: 0,
                          padding: '8px 14px',
                          borderRadius: 10,
                          backgroundColor: '#111827',
                          color: '#ffffff',
                          textDecoration: 'none',
                          fontWeight: 600,
                          fontSize: 14,
                        }}
                      >
                        Open
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}