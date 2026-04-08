'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const DOC_BUCKET = 'battle-rhythm-docs';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Attachment = {
  id: string;
  storage_path: string;
  file_name: string;
  sort_order?: number;
  file_type?: string | null;
};

type ItemWithAttachments = {
  id: string;
  title?: string | null;
  attachments: Attachment[];
};

type ResolvedAttachment = Attachment & {
  signedUrl: string;
  kind: 'pdf' | 'image' | 'other';
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getFileKind(fileName: string, fileType?: string | null): 'pdf' | 'image' | 'other' {
  const lowerName = fileName.toLowerCase();
  const lowerType = (fileType || '').toLowerCase();

  if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) return 'pdf';
  if (lowerType.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(lowerName)) return 'image';
  return 'other';
}

function sortAttachments(attachments: Attachment[] | undefined | null) {
  return [...(attachments || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

function useResolvedAttachments(attachments: Attachment[], open: boolean) {
  const [resolved, setResolved] = useState<ResolvedAttachment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function run() {
      if (!open || attachments.length === 0) {
        setResolved([]);
        return;
      }

      setLoading(true);
      const supabase = createClient();

      const results = await Promise.all(
        sortAttachments(attachments).map(async (attachment) => {
          const { data } = await supabase.storage
            .from(DOC_BUCKET)
            .createSignedUrl(attachment.storage_path, 60 * 60);

          return {
            ...attachment,
            signedUrl: data?.signedUrl || '',
            kind: getFileKind(attachment.file_name, attachment.file_type),
          } satisfies ResolvedAttachment;
        })
      );

      if (isActive) {
        setResolved(results.filter((item) => !!item.signedUrl));
        setLoading(false);
      }
    }

    void run();

    return () => {
      isActive = false;
    };
  }, [attachments, open]);

  return { resolved, loading };
}

function ghostButtonStyle(selected = false) {
  return {
    border: selected ? '1px solid #0f172a' : '1px solid rgba(15,23,42,0.12)',
    borderRadius: 12,
    padding: '10px 14px',
    background: selected ? '#0f172a' : '#ffffff',
    color: selected ? '#ffffff' : '#0f172a',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
  } as const;
}

function triggerButtonStyle() {
  return {
    border: '1px solid rgba(15,23,42,0.12)',
    borderRadius: 14,
    padding: '12px 16px',
    background: '#ffffff',
    color: '#0f172a',
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
    width: 'fit-content',
  } as const;
}

function emptyStyle() {
  return {
    borderRadius: 18,
    padding: 16,
    background: '#f8fafc',
    border: '1px solid rgba(15,23,42,0.08)',
    color: '#475569',
  } as const;
}

function PDFPreview({ url }: { url: string }) {
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#e5e7eb' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          padding: 10,
          background: 'rgba(255,255,255,0.96)',
          borderBottom: '1px solid rgba(15,23,42,0.08)',
        }}
      >
        <button type="button" onClick={() => setZoom((z) => clamp(Number((z - 0.15).toFixed(2)), 0.7, 3))} style={ghostButtonStyle()}>
          −
        </button>
        <div style={{ alignSelf: 'center', minWidth: 56, textAlign: 'center', color: '#475569', fontWeight: 700 }}>
          {Math.round(zoom * 100)}%
        </div>
        <button type="button" onClick={() => setZoom((z) => clamp(Number((z + 0.15).toFixed(2)), 0.7, 3))} style={ghostButtonStyle()}>
          +
        </button>
      </div>

      <div style={{ display: 'grid', justifyContent: 'center', gap: 16, padding: 16 }}>
        <Document file={url} onLoadSuccess={({ numPages: pages }) => setNumPages(pages)} loading="Loading PDF...">
          {Array.from({ length: numPages }, (_, i) => (
            <Page key={i + 1} pageNumber={i + 1} scale={zoom} />
          ))}
        </Document>
      </div>
    </div>
  );
}

function ImagePreview({ url, fileName }: { url: string; fileName: string }) {
  const [zoom, setZoom] = useState(1);

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#e5e7eb' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          padding: 10,
          background: 'rgba(255,255,255,0.96)',
          borderBottom: '1px solid rgba(15,23,42,0.08)',
        }}
      >
        <button type="button" onClick={() => setZoom((z) => clamp(Number((z - 0.15).toFixed(2)), 0.7, 4))} style={ghostButtonStyle()}>
          −
        </button>
        <div style={{ alignSelf: 'center', minWidth: 56, textAlign: 'center', color: '#475569', fontWeight: 700 }}>
          {Math.round(zoom * 100)}%
        </div>
        <button type="button" onClick={() => setZoom((z) => clamp(Number((z + 0.15).toFixed(2)), 0.7, 4))} style={ghostButtonStyle()}>
          +
        </button>
      </div>

      <div style={{ display: 'grid', justifyContent: 'center', padding: 16 }}>
        <img
          src={url}
          alt={fileName}
          style={{
            maxWidth: '100%',
            height: 'auto',
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease',
          }}
        />
      </div>
    </div>
  );
}

function FilePreview({ file }: { file: ResolvedAttachment }) {
  if (file.kind === 'pdf') return <PDFPreview url={file.signedUrl} />;
  if (file.kind === 'image') return <ImagePreview url={file.signedUrl} fileName={file.file_name} />;

  return (
    <div style={{ padding: 24, display: 'grid', gap: 12 }}>
      <p style={{ margin: 0, color: '#475569' }}>Preview is not available for this file type.</p>
      <a
        href={file.signedUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'inline-block',
          width: 'fit-content',
          borderRadius: 12,
          padding: '10px 14px',
          background: '#0f172a',
          color: '#ffffff',
          textDecoration: 'none',
          fontWeight: 800,
        }}
      >
        Open File
      </a>
    </div>
  );
}

export function DocumentAttachmentViewer({
  attachments,
  emptyMessage = 'No attachments.',
  buttonLabel = 'Open Attachment',
  defaultOpen = false,
}: {
  attachments?: Attachment[];
  emptyMessage?: string;
  buttonLabel?: string;
  defaultOpen?: boolean;
}) {
  const normalizedAttachments = useMemo(() => sortAttachments(attachments), [attachments]);
  const [open, setOpen] = useState(defaultOpen);
  const { resolved, loading } = useResolvedAttachments(normalizedAttachments, open);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen, normalizedAttachments.length]);

  useEffect(() => {
    if (!resolved.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !resolved.some((file) => file.id === selectedId)) {
      setSelectedId(resolved[0].id);
    }
  }, [resolved, selectedId]);

  const selected = resolved.find((file) => file.id === selectedId) || resolved[0];

  if (normalizedAttachments.length === 0) {
    return <div style={emptyStyle()}>{emptyMessage}</div>;
  }

  return (
    <>
      {!defaultOpen && (
        <button type="button" onClick={() => setOpen(true)} style={triggerButtonStyle()}>
          {buttonLabel}
        </button>
      )}

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15,23,42,0.82)',
            backdropFilter: 'blur(6px)',
            padding: 16,
            display: 'grid',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 1100,
              height: '100%',
              margin: '0 auto',
              borderRadius: 24,
              background: '#ffffff',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateRows: 'auto auto 1fr',
              boxShadow: '0 24px 80px rgba(15,23,42,0.35)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '14px 16px',
                borderBottom: '1px solid rgba(15,23,42,0.08)',
              }}
            >
              <div style={{ minWidth: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                {selected?.file_name || 'Attachments'}
              </div>

              <button type="button" onClick={() => setOpen(false)} style={ghostButtonStyle()}>
                Close
              </button>
            </div>

            {resolved.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(15,23,42,0.08)',
                  overflowX: 'auto',
                }}
              >
                {resolved.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => setSelectedId(file.id)}
                    style={ghostButtonStyle(selected?.id === file.id)}
                  >
                    {file.file_name}
                  </button>
                ))}
              </div>
            )}

            <div style={{ minHeight: 0 }}>
              {loading ? (
                <div style={{ padding: 24, color: '#475569' }}>Loading attachments...</div>
              ) : selected ? (
                <FilePreview file={selected} />
              ) : (
                <div style={{ padding: 24, color: '#475569' }}>{emptyMessage}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function DocumentAttachmentListViewer({
  items,
  attachments,
  emptyMessage = 'No documents posted.',
  autoOpenSingle = false,
  buttonLabel,
}: {
  items?: ItemWithAttachments[];
  attachments?: Attachment[];
  emptyMessage?: string;
  autoOpenSingle?: boolean;
  buttonLabel?: string;
}) {
  const totalAttachments = items
    ? items.flatMap((item) => sortAttachments(item.attachments))
    : sortAttachments(attachments);

  if (autoOpenSingle && totalAttachments.length === 1) {
    return (
      <DocumentAttachmentViewer
        attachments={totalAttachments}
        emptyMessage={emptyMessage}
        buttonLabel={buttonLabel || 'Open Attachment'}
        defaultOpen
      />
    );
  }

  if (items && items.length > 0) {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              borderRadius: 18,
              background: '#f8fafc',
              border: '1px solid rgba(15,23,42,0.08)',
              padding: 16,
              display: 'grid',
              gap: 12,
            }}
          >
            <div style={{ color: '#0f172a', fontWeight: 800, fontSize: 16 }}>
              {item.title || 'Document'}
            </div>

            <DocumentAttachmentViewer
              attachments={sortAttachments(item.attachments)}
              emptyMessage="No attachments."
              buttonLabel={item.attachments.length === 1 ? 'Open Attachment' : 'Open Attachments'}
            />
          </div>
        ))}
      </div>
    );
  }

  if (attachments && attachments.length > 0) {
    return (
      <DocumentAttachmentViewer
        attachments={sortAttachments(attachments)}
        emptyMessage={emptyMessage}
        buttonLabel={buttonLabel || (attachments.length === 1 ? 'Open Attachment' : 'Open Attachments')}
        defaultOpen={autoOpenSingle && attachments.length === 1}
      />
    );
  }

  return <div style={emptyStyle()}>{emptyMessage}</div>;
}
