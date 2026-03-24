'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  sort_order: number;
  file_type?: string | null;
};

type ResolvedAttachment = Attachment & {
  signedUrl: string;
  kind: 'pdf' | 'image' | 'other';
};

function getFileKind(fileName: string, fileType?: string | null): 'pdf' | 'image' | 'other' {
  const lowerName = fileName.toLowerCase();
  const lowerType = (fileType || '').toLowerCase();

  if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) {
    return 'pdf';
  }

  if (lowerType.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(lowerName)) {
    return 'image';
  }

  return 'other';
}

function cardStyle() {
  return {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  } as const;
}

function buttonStyle(primary = false) {
  if (primary) {
    return {
      border: 'none',
      borderRadius: 12,
      padding: '10px 14px',
      backgroundColor: '#111827',
      color: '#ffffff',
      fontWeight: 700,
      fontSize: 14,
      cursor: 'pointer',
    } as const;
  }

  return {
    border: '1px solid #d1d5db',
    borderRadius: 12,
    padding: '10px 14px',
    backgroundColor: '#ffffff',
    color: '#111827',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
  } as const;
}

function iconButtonStyle() {
  return {
    border: '1px solid #d1d5db',
    borderRadius: 12,
    padding: '8px 12px',
    backgroundColor: '#ffffff',
    color: '#111827',
    fontWeight: 800,
    fontSize: 16,
    cursor: 'pointer',
    minWidth: 42,
  } as const;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.72)',
        zIndex: 1000,
        padding: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 1280,
          height: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: 20,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#111827',
              overflowWrap: 'anywhere',
            }}
          >
            {title}
          </div>

          <button type="button" onClick={onClose} style={buttonStyle()}>
            Close
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: 12,
            background: '#f3f4f6',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function PDFViewer({
  url,
  fileName,
  inModal = false,
}: {
  url: string;
  fileName: string;
  inModal?: boolean;
}) {
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(inModal ? 1.2 : 1);
  const [pageWidth, setPageWidth] = useState(900);

  useEffect(() => {
    function updateWidth() {
      const viewportWidth = window.innerWidth;
      const baseWidth = inModal
        ? Math.min(viewportWidth - 48, 1100)
        : Math.min(viewportWidth - 56, 900);

      setPageWidth(Math.max(260, Math.floor(baseWidth * zoom)));
    }

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [zoom, inModal]);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#111827',
            overflowWrap: 'anywhere',
          }}
        >
          {fileName}
          {numPages > 0 ? ` • ${numPages} page${numPages === 1 ? '' : 's'}` : ''}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setZoom((current) => clamp(Number((current - 0.1).toFixed(2)), 0.6, 2))}
            style={iconButtonStyle()}
          >
            −
          </button>

          <div
            style={{
              minWidth: 58,
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: '#374151',
            }}
          >
            {Math.round(zoom * 100)}%
          </div>

          <button
            type="button"
            onClick={() => setZoom((current) => clamp(Number((current + 0.1).toFixed(2)), 0.6, 2))}
            style={iconButtonStyle()}
          >
            +
          </button>
        </div>
      </div>

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          background: '#e5e7eb',
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          maxHeight: inModal ? 'calc(100vh - 180px)' : '75vh',
          padding: 10,
        }}
      >
        <div
          style={{
            minWidth: 'fit-content',
            display: 'grid',
            gap: 12,
            justifyContent: 'center',
          }}
        >
          <Document
            file={url}
            loading={<div style={{ padding: 16, color: '#374151' }}>Loading PDF…</div>}
            error={<div style={{ padding: 16, color: '#b91c1c' }}>Unable to load PDF.</div>}
            onLoadSuccess={({ numPages: loadedPages }) => setNumPages(loadedPages)}
          >
            {Array.from({ length: numPages }, (_, index) => (
              <div
                key={`page_${index + 1}`}
                style={{
                  background: '#ffffff',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <Page
                  pageNumber={index + 1}
                  width={pageWidth}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  loading={<div style={{ padding: 12 }}>Loading page {index + 1}…</div>}
                />
              </div>
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
}

function ImageViewer({
  url,
  fileName,
  inModal = false,
}: {
  url: string;
  fileName: string;
  inModal?: boolean;
}) {
  const [zoom, setZoom] = useState(1);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#111827',
            overflowWrap: 'anywhere',
          }}
        >
          {fileName}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setZoom((current) => clamp(Number((current - 0.1).toFixed(2)), 0.6, 3))}
            style={iconButtonStyle()}
          >
            −
          </button>

          <div
            style={{
              minWidth: 58,
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: '#374151',
            }}
          >
            {Math.round(zoom * 100)}%
          </div>

          <button
            type="button"
            onClick={() => setZoom((current) => clamp(Number((current + 0.1).toFixed(2)), 0.6, 3))}
            style={iconButtonStyle()}
          >
            +
          </button>
        </div>
      </div>

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          background: '#f3f4f6',
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          maxHeight: inModal ? 'calc(100vh - 180px)' : '75vh',
          padding: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <img
            src={url}
            alt={fileName}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              maxWidth: '100%',
              height: 'auto',
              display: 'block',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function FileRenderer({
  attachment,
  inModal = false,
}: {
  attachment: ResolvedAttachment;
  inModal?: boolean;
}) {
  if (attachment.kind === 'pdf') {
    return <PDFViewer url={attachment.signedUrl} fileName={attachment.file_name} inModal={inModal} />;
  }

  if (attachment.kind === 'image') {
    return <ImageViewer url={attachment.signedUrl} fileName={attachment.file_name} inModal={inModal} />;
  }

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        padding: 16,
        background: '#f9fafb',
        color: '#374151',
      }}
    >
      This file type cannot be previewed in app.
    </div>
  );
}

export function DocumentAttachmentViewer({
  attachments,
  emptyMessage,
}: {
  attachments: Attachment[];
  emptyMessage: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [resolvedAttachments, setResolvedAttachments] = useState<ResolvedAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAttachment, setExpandedAttachment] = useState<ResolvedAttachment | null>(null);

  const sortedAttachments = useMemo(
    () => [...attachments].sort((a, b) => a.sort_order - b.sort_order),
    [attachments]
  );

  useEffect(() => {
    let cancelled = false;

    async function resolveAttachments() {
      if (sortedAttachments.length === 0) {
        setResolvedAttachments([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const next = await Promise.all(
        sortedAttachments.map(async (attachment) => {
          const { data, error } = await supabase.storage
            .from(DOC_BUCKET)
            .createSignedUrl(attachment.storage_path, 60 * 60);

          if (error || !data?.signedUrl) {
            return null;
          }

          return {
            ...attachment,
            signedUrl: data.signedUrl,
            kind: getFileKind(attachment.file_name, attachment.file_type),
          } satisfies ResolvedAttachment;
        })
      );

      if (!cancelled) {
        setResolvedAttachments(next.filter((item): item is ResolvedAttachment => item !== null));
        setLoading(false);
      }
    }

    void resolveAttachments();

    return () => {
      cancelled = true;
    };
  }, [sortedAttachments, supabase]);

  if (loading) {
    return <p style={{ color: '#ffffff', margin: 0 }}>Loading...</p>;
  }

  if (resolvedAttachments.length === 0) {
    return <p style={{ color: '#ffffff', margin: 0 }}>{emptyMessage}</p>;
  }

  return (
    <>
      <div style={{ display: 'grid', gap: 16 }}>
        {resolvedAttachments.map((attachment, index) => {
          const label = resolvedAttachments.length > 1 ? `File ${index + 1}` : 'Document';

          return (
            <section key={attachment.id} style={cardStyle()}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginBottom: 12,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#111827',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {attachment.file_name}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedAttachment(attachment)}
                  style={buttonStyle(true)}
                >
                  Expand
                </button>
              </div>

              <FileRenderer attachment={attachment} />
            </section>
          );
        })}
      </div>

      {expandedAttachment ? (
        <Modal
          title={expandedAttachment.file_name}
          onClose={() => setExpandedAttachment(null)}
        >
          <FileRenderer attachment={expandedAttachment} inModal />
        </Modal>
      ) : null}
    </>
  );
}