'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
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

type DocumentListItem = {
  id: string;
  title: string;
  attachments: Attachment[];
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

function pageShellStyle() {
  return {
    display: 'grid',
    gap: 16,
  } as const;
}

function launcherCardStyle() {
  return {
    borderRadius: 24,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.10)',
    padding: 18,
    color: '#ffffff',
    backdropFilter: 'blur(8px)',
  } as const;
}

function modalButtonStyle(primary = false) {
  if (primary) {
    return {
      border: 'none',
      borderRadius: 14,
      padding: '12px 16px',
      backgroundColor: '#ffffff',
      color: '#111827',
      fontWeight: 800,
      fontSize: 14,
      cursor: 'pointer',
      minHeight: 48,
    } as const;
  }

  return {
    border: '1px solid rgba(255,255,255,0.22)',
    borderRadius: 14,
    padding: '14px 18px',
    backgroundColor: 'transparent',
    color: '#ffffff',
    fontWeight: 800,
    fontSize: 15,
    cursor: 'pointer',
    minHeight: 48,
  } as const;
}

function toolbarButtonStyle() {
  return {
    border: '1px solid rgba(15,23,42,0.10)',
    borderRadius: 12,
    padding: '8px 12px',
    backgroundColor: '#ffffff',
    color: '#111827',
    fontWeight: 800,
    fontSize: 15,
    cursor: 'pointer',
    minWidth: 42,
  } as const;
}

function listRowStyle() {
  return {
    borderRadius: 20,
    background: '#ffffff',
    border: '1px solid rgba(15,23,42,0.08)',
    padding: 16,
    color: '#111827',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    boxShadow: '0 10px 26px rgba(15,23,42,0.12)',
  } as const;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function RotateHint() {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 13,
        color: '#64748b',
      }}
    >
      Rotate your phone for the easiest view of landscape schedules.
    </p>
  );
}

function ViewerModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(2,6,23,0.86)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)',
            paddingRight: 'calc(env(safe-area-inset-right, 0px) + 14px)',
            paddingBottom: 10,
            paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 14px)',
            borderBottom: '1px solid rgba(255,255,255,0.10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            color: '#ffffff',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                overflowWrap: 'anywhere',
              }}
            >
              {title}
            </div>
            <div style={{ marginTop: 6 }}>
              <RotateHint />
            </div>
          </div>

          <button type="button" onClick={onClose} style={modalButtonStyle(false)}>
            Close
          </button>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingTop: 12,
            paddingRight: 'calc(env(safe-area-inset-right, 0px) + 12px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 12px)',
            background: '#e5e7eb',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function PDFPages({
  url,
  fileName,
}: {
  url: string;
  fileName: string;
}) {
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pageWidth, setPageWidth] = useState(1200);

  useEffect(() => {
    function updateWidth() {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const isLandscapePhone = viewportWidth > viewportHeight && viewportWidth < 1100;
      const baseWidth = isLandscapePhone
        ? Math.min(viewportWidth - 24, 1350)
        : Math.min(viewportWidth - 32, 1100);

      setPageWidth(Math.max(280, Math.floor(baseWidth * zoom)));
    }

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [zoom]);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          borderRadius: 18,
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(15,23,42,0.08)',
          padding: 12,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: '#111827',
              overflowWrap: 'anywhere',
            }}
          >
            {fileName}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
            {numPages > 0 ? `${numPages} page${numPages === 1 ? '' : 's'}` : 'Loading pages...'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setZoom((current) => clamp(Number((current - 0.1).toFixed(2)), 0.7, 1.8))}
            style={toolbarButtonStyle()}
          >
            −
          </button>
          <div style={{ minWidth: 58, textAlign: 'center', fontSize: 13, fontWeight: 800, color: '#374151' }}>
            {Math.round(zoom * 100)}%
          </div>
          <button
            type="button"
            onClick={() => setZoom((current) => clamp(Number((current + 0.1).toFixed(2)), 0.7, 1.8))}
            style={toolbarButtonStyle()}
          >
            +
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16, justifyContent: 'center', minWidth: 'fit-content' }}>
        <Document
          file={url}
          loading={<div style={{ color: '#374151', padding: 16 }}>Loading PDF...</div>}
          error={<div style={{ color: '#b91c1c', padding: 16 }}>Unable to load this PDF.</div>}
          onLoadSuccess={({ numPages: loadedPages }) => setNumPages(loadedPages)}
        >
          {Array.from({ length: numPages }, (_, index) => (
            <div
              key={`page_${index + 1}`}
              style={{
                background: '#ffffff',
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(15,23,42,0.18)',
              }}
            >
              <Page
                pageNumber={index + 1}
                width={pageWidth}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                loading={<div style={{ color: '#374151', padding: 16 }}>Loading page {index + 1}...</div>}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}

function ImagePages({
  url,
  fileName,
}: {
  url: string;
  fileName: string;
}) {
  const [zoom, setZoom] = useState(1);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          borderRadius: 18,
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(15,23,42,0.08)',
          padding: 12,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: '#111827',
            overflowWrap: 'anywhere',
          }}
        >
          {fileName}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setZoom((current) => clamp(Number((current - 0.1).toFixed(2)), 0.7, 2.5))}
            style={toolbarButtonStyle()}
          >
            −
          </button>
          <div style={{ minWidth: 58, textAlign: 'center', fontSize: 13, fontWeight: 800, color: '#374151' }}>
            {Math.round(zoom * 100)}%
          </div>
          <button
            type="button"
            onClick={() => setZoom((current) => clamp(Number((current + 0.1).toFixed(2)), 0.7, 2.5))}
            style={toolbarButtonStyle()}
          >
            +
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', minWidth: 'fit-content' }}>
        <img
          src={url}
          alt={fileName}
          style={{
            display: 'block',
            maxWidth: '100%',
            height: 'auto',
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
          }}
        />
      </div>
    </div>
  );
}

function UnsupportedFile({ fileName }: { fileName: string }) {
  return (
    <div
      style={{
        borderRadius: 18,
        background: '#ffffff',
        padding: 18,
        color: '#334155',
        fontSize: 14,
      }}
    >
      {fileName} cannot be previewed in app.
    </div>
  );
}

function FullscreenDocumentContent({ attachments }: { attachments: ResolvedAttachment[] }) {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {attachments.map((attachment) => {
        if (attachment.kind === 'pdf') {
          return <PDFPages key={attachment.id} url={attachment.signedUrl} fileName={attachment.file_name} />;
        }

        if (attachment.kind === 'image') {
          return <ImagePages key={attachment.id} url={attachment.signedUrl} fileName={attachment.file_name} />;
        }

        return <UnsupportedFile key={attachment.id} fileName={attachment.file_name} />;
      })}
    </div>
  );
}

function useResolvedAttachments(attachments: Attachment[], enabled: boolean) {
  const [resolved, setResolved] = useState<ResolvedAttachment[]>([]);
  const [loading, setLoading] = useState(false);

  const sortedAttachments = useMemo(
    () => [...attachments].sort((a, b) => a.sort_order - b.sort_order || a.file_name.localeCompare(b.file_name)),
    [attachments]
  );

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (!enabled) {
        setLoading(false);
        return;
      }

      if (sortedAttachments.length === 0) {
        setResolved([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const supabase = createClient();
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
        setResolved(next.filter((item): item is ResolvedAttachment => item !== null));
        setLoading(false);
      }
    }

    void resolve();

    return () => {
      cancelled = true;
    };
  }, [enabled, sortedAttachments]);

  return { resolved, loading };
}

export function DocumentAttachmentViewer({
  attachments,
  emptyMessage,
  buttonLabel = 'Open Document',
  autoOpen = false,
  onCloseHref,
}: {
  attachments: Attachment[];
  emptyMessage: string;
  buttonLabel?: string;
  autoOpen?: boolean;
  onCloseHref?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { resolved, loading } = useResolvedAttachments(attachments, isOpen);

  useEffect(() => {
    if (autoOpen && attachments.length > 0 && !isOpen) {
      setIsOpen(true);
    }
  }, [attachments.length, autoOpen, isOpen]);

  function handleClose() {
    setIsOpen(false);

    if (autoOpen && onCloseHref) {
      router.push(onCloseHref);
    }
  }

  if (attachments.length === 0) {
    return (
      <div style={launcherCardStyle()}>
        <p style={{ margin: 0, color: '#ffffff' }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {!autoOpen ? (
        <div style={launcherCardStyle()}>
          <div style={{ display: 'grid', gap: 12 }}>
            <RotateHint />
            <button type="button" onClick={() => setIsOpen(true)} style={modalButtonStyle(true)}>
              {buttonLabel}
            </button>
          </div>
        </div>
      ) : null}

      {isOpen ? (
        <ViewerModal
          title={attachments.length > 1 ? 'Document Packet' : attachments[0]?.file_name || 'Document'}
          onClose={handleClose}
        >
          {loading ? (
            <div style={{ color: '#374151', padding: 16 }}>Loading document...</div>
          ) : (
            <FullscreenDocumentContent attachments={resolved} />
          )}
        </ViewerModal>
      ) : null}
    </>
  );
}

export function DocumentAttachmentListViewer({
  items,
  emptyMessage,
}: {
  items: DocumentListItem[];
  emptyMessage: string;
}) {
  const [activeItem, setActiveItem] = useState<DocumentListItem | null>(null);
  const { resolved, loading } = useResolvedAttachments(activeItem?.attachments ?? [], activeItem !== null);

  if (items.length === 0) {
    return (
      <div style={launcherCardStyle()}>
        <p style={{ margin: 0, color: '#ffffff' }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div style={pageShellStyle()}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveItem(item)}
            style={{
              ...listRowStyle(),
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, overflowWrap: 'anywhere', color: '#111827' }}>
                {item.title}
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>
                {item.attachments.length} file{item.attachments.length === 1 ? '' : 's'}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>Open</div>
          </button>
        ))}
      </div>

      {activeItem ? (
        <ViewerModal title={activeItem.title} onClose={() => setActiveItem(null)}>
          {loading ? (
            <div style={{ color: '#374151', padding: 16 }}>Loading document...</div>
          ) : (
            <FullscreenDocumentContent attachments={resolved} />
          )}
        </ViewerModal>
      ) : null}
    </>
  );
}
