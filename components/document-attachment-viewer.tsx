'use client';

import { MouseEvent, TouchEvent, useEffect, useMemo, useRef, useState } from 'react';
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
    transition: 'transform 0.12s ease, opacity 0.12s ease, background 0.12s ease',
  } as const;
}

function triggerButtonStyle(disabled = false) {
  return {
    border: '1px solid rgba(15,23,42,0.12)',
    borderRadius: 14,
    padding: '14px 18px',
    background: '#ffffff',
    color: '#0f172a',
    fontWeight: 600,
    fontSize: 13,
    cursor: disabled ? 'default' : 'pointer',
    width: 'fit-content',
    opacity: disabled ? 0.7 : 1,
    transition: 'transform 0.12s ease, opacity 0.12s ease',
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

function ViewerLoadingState({ label }: { label: string }) {
  return (
    <div
      style={{
        minHeight: '100%',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: '#f8fafc',
        color: '#475569',
        fontWeight: 700,
        textAlign: 'center',
      }}
    >
      {label}
    </div>
  );
}

function PDFPreview({ url, chromeVisible = true }: { url: string; chromeVisible?: boolean }) {
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateWidth = () => {
      setContainerWidth(element.clientWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(element);

    window.addEventListener('orientationchange', updateWidth);
    window.addEventListener('resize', updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', updateWidth);
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const pageWidth = Math.max(280, Math.floor(containerWidth - (chromeVisible ? 32 : 20)));

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#e5e7eb' }}>
      <div ref={containerRef} style={{ display: 'grid', justifyContent: 'center', gap: chromeVisible ? 16 : 12, padding: chromeVisible ? 16 : 10 }}>
        <Document
          file={url}
          onLoadSuccess={({ numPages: pages }) => setNumPages(pages)}
          loading="Loading PDF..."
          error="Unable to load PDF preview."
        >
          {Array.from({ length: numPages }, (_, i) => (
            <div key={i + 1} style={{ display: 'grid', justifyContent: 'center' }}>
              <Page
                pageNumber={i + 1}
                width={pageWidth}
                renderAnnotationLayer
                renderTextLayer
                loading="Loading page..."
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}

function ImagePreview({ url, fileName, chromeVisible = true }: { url: string; fileName: string; chromeVisible?: boolean }) {
  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#e5e7eb' }}>
      <div style={{ display: 'grid', justifyContent: 'center', padding: chromeVisible ? 16 : 10, overflow: 'auto' }}>
        <img
          src={url}
          alt={fileName}
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
            touchAction: 'manipulation',
          }}
        />
      </div>
    </div>
  );
}

function FilePreview({ file, chromeVisible = true }: { file: ResolvedAttachment; chromeVisible?: boolean }) {
  if (file.kind === 'pdf') return <PDFPreview url={file.signedUrl} chromeVisible={chromeVisible} />;
  if (file.kind === 'image') return <ImagePreview url={file.signedUrl} fileName={file.file_name} chromeVisible={chromeVisible} />;

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
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const initialAutoOpenDoneRef = useRef(false);
  const { resolved, loading, error } = useResolvedAttachments(normalizedAttachments, open);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chromeVisible, setChromeVisible] = useState(true);

  const toggleChrome = () => {
    setChromeVisible((value) => !value);
  };

  const stopToggle = (event: MouseEvent<HTMLElement> | TouchEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  useEffect(() => {
    if (defaultOpen && normalizedAttachments.length > 0 && !initialAutoOpenDoneRef.current) {
      setOpen(true);
      setHasAutoOpened(true);
      initialAutoOpenDoneRef.current = true;
    }
  }, [defaultOpen, normalizedAttachments.length]);

  useEffect(() => {
    if (!open) return;

    setChromeVisible(true);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

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
  const currentButtonLabel = hasAutoOpened && !open ? 'Open Attachment' : buttonLabel;
  const isPreparing = open && loading;

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
            background: 'rgba(15,23,42,0.82)',
            backdropFilter: 'blur(6px)',
            paddingTop: 'max(8px, env(safe-area-inset-top))',
            paddingRight: 8,
            paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
            paddingLeft: 8,
            display: 'grid',
          }}
          onClick={toggleChrome}
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
              gridTemplateRows: `${chromeVisible ? 'auto ' : ''}${chromeVisible && resolved.length > 1 ? 'auto ' : ''}1fr`,
              boxShadow: '0 24px 80px rgba(15,23,42,0.35)',
            }}
            onClick={stopToggle}
            onTouchEnd={stopToggle}
          >
            {chromeVisible && (
              <div
                onClick={toggleChrome}
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: 'max(8px, env(safe-area-inset-top)) 14px 8px 14px',
                  borderBottom: '1px solid rgba(15,23,42,0.08)',
                  background: 'rgba(255,255,255,0.98)',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a', overflowWrap: 'anywhere', lineHeight: 1.2 }}>
                    {selected?.file_name || (loading ? 'Preparing attachment...' : 'Attachments')}
                  </div>
                  {selected?.file_type ? (
                    <div style={{ marginTop: 2, fontSize: 11, color: '#64748b', lineHeight: 1.2 }}>{selected.file_type}</div>
                  ) : null}
                </div>

                <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(false); }} style={{ ...ghostButtonStyle(), padding: '10px 14px', fontSize: 13 }}>
                  Close
                </button>
              </div>
            )}

            {chromeVisible && resolved.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'nowrap',
                  padding: '8px 14px',
                  borderBottom: '1px solid rgba(15,23,42,0.08)',
                  overflowX: 'auto',
                  background: '#ffffff',
                }}
              >
                {resolved.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => setSelectedId(file.id)}
                    style={{ ...ghostButtonStyle(selected?.id === file.id), whiteSpace: 'nowrap', flex: '0 0 auto', padding: '9px 12px', fontSize: 12 }}
                  >
                    {file.file_name}
                  </button>
                ))}
              </div>
            )}

            <div style={{ minHeight: 0 }} onClick={toggleChrome}>
              {loading ? (
                <ViewerLoadingState label="Loading attachment preview..." />
              ) : error ? (
                <div style={{ padding: 24, display: 'grid', gap: 12, color: '#475569' }} onClick={stopToggle}>
                  <div>{error}</div>
                  <button type="button" onClick={() => setOpen(false)} style={triggerButtonStyle()}>
                    Close
                  </button>
                </div>
              ) : selected ? (
                <FilePreview file={selected} chromeVisible={chromeVisible} />
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
      />
    );
  }

  return <div style={emptyStyle()}>{emptyMessage}</div>;
}
