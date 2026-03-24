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
};

export default function CQRosterPage() {
  const [cqFiles, setCqFiles] = useState<Attachment[]>([]);
  const [staffFiles, setStaffFiles] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchData() {
      setLoading(true);

      // Fetch CQ post
      const { data: cqPost } = await supabase
        .from('document_posts')
        .select('id')
        .eq('category', 'cq_roster')
        .eq('subcategory', 'cq')
        .eq('is_active', true)
        .single();

      // Fetch Staff Duty post
      const { data: staffPost } = await supabase
        .from('document_posts')
        .select('id')
        .eq('category', 'cq_roster')
        .eq('subcategory', 'staff_duty')
        .eq('is_active', true)
        .single();

      // Fetch CQ files
      if (cqPost) {
        const { data: files } = await supabase
          .from('document_attachments')
          .select('*')
          .eq('post_id', cqPost.id)
          .order('sort_order', { ascending: true });

        setCqFiles(files || []);
      }

      // Fetch Staff files
      if (staffPost) {
        const { data: files } = await supabase
          .from('document_attachments')
          .select('*')
          .eq('post_id', staffPost.id)
          .order('sort_order', { ascending: true });

        setStaffFiles(files || []);
      }

      setLoading(false);
    }

    fetchData();
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
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
        CQ / Staff Duty
      </h1>

      {loading && <p>Loading...</p>}

      {!loading && (
        <>
          {/* CQ SECTION */}
          <div style={{ marginBottom: 32 }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              CQ
            </h2>

            {cqFiles.length === 0 && <p>No CQ roster posted.</p>}

            {cqFiles.map((file) => {
              const url = getPublicUrl(file.storage_path);

              return (
                <div key={file.id} style={{ marginBottom: 16 }}>
                  <img
                    src={url}
                    alt={file.file_name}
                    style={{
                      width: '100%',
                      borderRadius: 12,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* STAFF DUTY SECTION */}
          <div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              Staff Duty
            </h2>

            {staffFiles.length === 0 && (
              <p>No Staff Duty roster posted.</p>
            )}

            {staffFiles.map((file) => {
              const url = getPublicUrl(file.storage_path);

              return (
                <div key={file.id} style={{ marginBottom: 16 }}>
                  <img
                    src={url}
                    alt={file.file_name}
                    style={{
                      width: '100%',
                      borderRadius: 12,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}