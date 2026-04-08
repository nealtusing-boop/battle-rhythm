'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

function skeletonLineStyle(width: string) {
  return {
    width,
    height: 12,
    borderRadius: 999,
    background: 'rgba(148,163,184,0.24)',
  } as const;
}

function loadingPanelStyle() {
  return {
    height: '100%',
    display: 'grid',
    alignContent: 'start',
    gap: 16,
    padding: 20,
    background: '#f8fafc',
  } as const;
}

function useResolvedAttachments(attachments: Attachment[], open: boolean) {
  const [resolved, setResolved] = useState<ResolvedAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function run() {
      if (!open || attachments.length === 0) {
        setResolved([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const supabase = createClient();
      const sortedAttachments = sortAttachments(attachments);
      const paths = sortedAttachments.map((attachment) => attachment.storage_path);

      const { data, error: signedUrlError } = await supabase.storage
        .from(DOC_BUCKET)
        .createSignedUrls(paths, 60 * 60);

      if (!isActive) return;

      if (signedUrlError) {
        setResolved([]);
        setLoading(false);
        setError('Could not load attachments. Please try again.');
        return;
      }

      const resolvedItems = sortedAttachments
        .map((attachment, index) => ({
          ...attachment,
          signedUrl: data?.[index]?.signedUrl || '',
          kind: getFileKind(attachment.file_name, attachment.file_type),
        }))
        .filter((item) => !!item.signedUrl) satisfies ResolvedAttachment[];

      setResolved(resolvedItems);
      setLoading(false);
      setError(null);
    }

    void run();

    return () => {
      isActive = false;
    };
  }, [attachments, open]);

  return { resolved, loading, error };
}

function ghostButtonStyle(selected = false, disabled = false) {
  return {
    border: selected ? '1px solid #0f172a' : '1px solid rgba(15,23,42,0.12)',
    borderRadius: 12,
    padding: '11px 14px',
    background: selected ? '#0f172a' : '#ffffff',
    color: selected ? '#ffffff' : '#0f172a',
    fontWeight: 700,
    fontSize: 13,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.65 : 1,
  } as const;
}

function triggerButtonStyle(disabled = false) {
  return {
    border: '1px solid rgba(15,23,42,0.12)',
    borderRadius: 14,
    padding: '14px 18px',
    background: '#ffffff',
    color: '#0f172a',
    fontWeight: 800,
    fontSize: 15,
    cursor: disabled ? 'default' : 'pointer',
    width: 'fit-content',
    opacity: disabled ? 0.7 : 1,
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

function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => setWidth(node.clientWidth || 0);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return { ref, width };
}

function PDFPreview({ url, resetKey, onToggleChrome }: { url: string; resetKey: number; onToggleChrome: () => void }) {
  const [numPages, setNumPages] = useState(0);
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const pageWidth = Math.max(220, Math.floor(Math.min(width - 24, 1100)));

  return (
    <div
      ref={ref}
      onClick={onToggleChrome}
      style={{
        height: '100%',
        overflow: 'auto',
        background: '#e5e7eb',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y pinch-zoom',
      }}
    >
      <div style={{ display: 'grid', justifyContent: 'center', gap: 16, padding: 12, minHeight: '100%' }}>
        <Document
          key={`${url}-${resetKey}-${pageWidth}`}
          file={url}
          onLoadSuccess={({ numPages: pages }) => setNumPages(pages)}
          loading="Loading PDF..."
          error="Could not load this PDF."
        >
          {Array.from({ length: numPages }, (_, i) => (
            <div
              key={i + 1}
              style={{
                background: '#ffffff',
                boxShadow: '0 10px 26px rgba(15,23,42,0.10)',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              <Page
                pageNumber={i + 1}
                width={pageWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}

function ImagePreview({
  url,
  fileName,
  onToggleChrome,
}: {
  url: string;
  fileName: string;
  onToggleChrome: () => void;
}) {
  return (
    <div
      onClick={onToggleChrome}
      style={{
        height: '100%',
        overflow: 'auto',
        background: '#e5e7eb',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'manipulation',
      }}
    >
      <div
        style={{
          minHeight: '100%',
          display: 'grid',
          placeItems: 'center',
          padding: 12,
        }}
      >
        <img
          src={url}
          alt={fileName}
          style={{
            display: 'block',
            maxWidth: '100%',
            width: 'auto',
            maxHeight: '100%',
            height: 'auto',
            objectFit: 'contain',
            borderRadius: 10,
            boxShadow: '0 10px 26px rgba(15,23,42,0.10)',
            background: '#ffffff',
          }}
        />
      </div>
    </div>
  );
}

function FilePreview({
  file,
  resetKey,
  onToggleChrome,
}: {
  file: ResolvedAttachment;
  resetKey: number;
  onToggleChrome: () => void;
}) {
  if (file.kind === 'pdf') return <PDFPreview url={file.signedUrl} resetKey={resetKey} onToggleChrome={onToggleChrome} />;
  if (file.kind === 'image') return <ImagePreview url={file.signedUrl} fileName={file.file_name} onToggleChrome={onToggleChrome} />;

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

function ViewerLoadingState({ label }: { label: string }) {
  return (
    <div style={loadingPanelStyle()}>
      <div style={{ display: 'grid', gap: 10, maxWidth: 320 }}>
        <div style={skeletonLineStyle('45%')} />
        <div style={skeletonLineStyle('88%')} />
        <div style={skeletonLineStyle('62%')} />
      </div>
      <div
        style={{
          borderRadius: 18,
          minHeight: 320,
          border: '1px solid rgba(15,23,42,0.08)',
          background: '#ffffff',
          display: 'grid',
          placeItems: 'center',
          color: '#475569',
          fontWeight: 600,
          textAlign: 'center',
          padding: 24,
        }}
      >
        {label}
      </div>
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
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const initialAutoOpenDoneRef = useRef(false);
  const { resolved, loading, error } = useResolvedAttachments(normalizedAttachments, open);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (defaultOpen && normalizedAttachments.length > 0 && !initialAutoOpenDoneRef.current) {
      setOpen(true);
      setHasAutoOpened(true);
      initialAutoOpenDoneRef.current = true;
    }
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

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleViewportChange = () => {
      setChromeVisible(true);
      setResetKey((value) => value + 1);
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, [open]);

  const selected = resolved.find((file) => file.id === selectedId) || resolved[0];
  const currentButtonLabel = hasAutoOpened && !open ? 'Open Attachment' : buttonLabel;
  const isPreparing = open && loading;
  const topInset = chromeVisible ? 76 : 0;

  if (normalizedAttachments.length === 0) {
    return <div style={emptyStyle()}>{emptyMessage}</div>;
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={triggerButtonStyle(isPreparing)} disabled={isPreparing}>
        {isPreparing ? 'Preparing file...' : currentButtonLabel}
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: '#0f172a',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
              background: '#e5e7eb',
            }}
          >
            {chromeVisible && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 3,
                  background: 'rgba(255,255,255,0.96)',
                  backdropFilter: 'blur(10px)',
                  borderBottom: '1px solid rgba(15,23,42,0.08)',
                  boxShadow: '0 8px 22px rgba(15,23,42,0.08)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: 'max(12px, env(safe-area-inset-top)) 14px 12px 14px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                        color: '#0f172a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {selected?.file_name || (loading ? 'Preparing attachment...' : 'Attachments')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {selected?.signedUrl && (
                      <a
                        href={selected.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ ...ghostButtonStyle(), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                      >
                        Open
                      </a>
                    )}
                    <button type="button" onClick={() => setOpen(false)} style={ghostButtonStyle()}>
                      Close
                    </button>
                  </div>
                </div>

                {resolved.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      padding: '0 14px 12px 14px',
                      overflowX: 'auto',
                    }}
                  >
                    {resolved.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(file.id);
                          setResetKey((value) => value + 1);
                        }}
                        style={{ ...ghostButtonStyle(selected?.id === file.id), whiteSpace: 'nowrap' }}
                      >
                        {file.file_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ position: 'absolute', top: topInset, right: 0, bottom: 0, left: 0 }}>
              {loading ? (
                <ViewerLoadingState label="Loading attachment preview..." />
              ) : error ? (
                <div style={{ padding: 24, display: 'grid', gap: 12, color: '#475569' }}>
                  <div>{error}</div>
                  <button type="button" onClick={() => setOpen(false)} style={triggerButtonStyle()}>
                    Close
                  </button>
                </div>
              ) : selected ? (
                <FilePreview file={selected} resetKey={resetKey} onToggleChrome={() => setChromeVisible((value) => !value)} />
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
            <div style={{ color: '#0f172a', fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>
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
