'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const DOC_BUCKET = 'battle-rhythm-docs';
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const SIGNED_URL_CACHE_WINDOW_MS = 50 * 60 * 1000;

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

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

type SignedUrlCacheEntry = {
  url: string;
  expiresAt: number;
};

const signedUrlCache = new Map<string, SignedUrlCacheEntry>();

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

function getCachedSignedUrl(path: string) {
  const cached = signedUrlCache.get(path);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    signedUrlCache.delete(path);
    return null;
  }
  return cached.url;
}

function setCachedSignedUrl(path: string, url: string) {
  signedUrlCache.set(path, {
    url,
    expiresAt: Date.now() + SIGNED_URL_CACHE_WINDOW_MS,
  });
}

function useResolvedAttachments(attachments: Attachment[], open: boolean) {
  const [resolved, setResolved] = useState<ResolvedAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingLabel, setLoadingLabel] = useState('Preparing attachment preview...');

  useEffect(() => {
    let isActive = true;

    async function run() {
      if (!open || attachments.length === 0) {
        setResolved([]);
        setLoading(false);
        setError(null);
        setLoadingLabel('Preparing attachment preview...');
        return;
      }

      setLoading(true);
      setError(null);
      setLoadingLabel('Preparing attachment preview...');

      const sortedAttachments = sortAttachments(attachments);
      const withCache = sortedAttachments.map((attachment) => ({
        attachment,
        cachedUrl: getCachedSignedUrl(attachment.storage_path),
      }));

      const cachedResolved = withCache
        .filter((entry) => !!entry.cachedUrl)
        .map((entry) => ({
          ...entry.attachment,
          signedUrl: entry.cachedUrl!,
          kind: getFileKind(entry.attachment.file_name, entry.attachment.file_type),
        })) satisfies ResolvedAttachment[];

      const missing = withCache.filter((entry) => !entry.cachedUrl).map((entry) => entry.attachment);

      if (missing.length === 0) {
        if (!isActive) return;
        setResolved(cachedResolved);
        setLoading(false);
        setError(null);
        setLoadingLabel('Preparing attachment preview...');
        return;
      }

      setLoadingLabel(
        cachedResolved.length > 0
          ? 'Finishing attachment prep...'
          : `Preparing ${missing.length} file${missing.length === 1 ? '' : 's'}...`,
      );

      const supabase = createClient();
      const { data, error: signedUrlError } = await supabase.storage
        .from(DOC_BUCKET)
        .createSignedUrls(
          missing.map((attachment) => attachment.storage_path),
          SIGNED_URL_TTL_SECONDS,
        );

      if (!isActive) return;

      if (signedUrlError) {
        setResolved([]);
        setLoading(false);
        setError('Could not load attachments. Please try again.');
        return;
      }

      missing.forEach((attachment, index) => {
        const signedUrl = data?.[index]?.signedUrl;
        if (signedUrl) {
          setCachedSignedUrl(attachment.storage_path, signedUrl);
        }
      });

      const resolvedItems = sortedAttachments
        .map((attachment) => {
          const signedUrl = getCachedSignedUrl(attachment.storage_path);
          if (!signedUrl) return null;
          return {
            ...attachment,
            signedUrl,
            kind: getFileKind(attachment.file_name, attachment.file_type),
          };
        })
        .filter(Boolean) as ResolvedAttachment[];

      setResolved(resolvedItems);
      setLoading(false);
      setError(null);
      setLoadingLabel('Preparing attachment preview...');
    }

    void run();

    return () => {
      isActive = false;
    };
  }, [attachments, open]);

  return { resolved, loading, error, loadingLabel };
}

function ghostButtonStyle(selected = false, disabled = false) {
  return {
    border: selected ? '1px solid #0f172a' : '1px solid rgba(15,23,42,0.12)',
    borderRadius: 12,
    padding: '10px 14px',
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
    padding: '12px 16px',
    background: '#ffffff',
    color: '#0f172a',
    fontWeight: 800,
    fontSize: 14,
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

function PDFPreview({ url }: { url: string }) {
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loadingPdf, setLoadingPdf] = useState(true);

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
        <Document
          file={url}
          onLoadSuccess={({ numPages: pages }) => {
            setNumPages(pages);
            setLoadingPdf(false);
          }}
          onLoadError={() => setLoadingPdf(false)}
          loading={
            <div
              style={{
                minHeight: 320,
                minWidth: 280,
                borderRadius: 18,
                background: '#ffffff',
                border: '1px solid rgba(15,23,42,0.08)',
                display: 'grid',
                placeItems: 'center',
                color: '#475569',
                fontWeight: 700,
                padding: 24,
              }}
            >
              Loading PDF…
            </div>
          }
        >
          {loadingPdf && numPages === 0 ? null : Array.from({ length: numPages }, (_, i) => (
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
  const { resolved, loading, error, loadingLabel } = useResolvedAttachments(normalizedAttachments, open);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  {selected?.file_name || (loading ? 'Preparing attachment...' : 'Attachments')}
                </div>
                {loading && (
                  <div style={{ marginTop: 4, fontSize: 13, color: '#64748b', fontWeight: 600 }}>{loadingLabel}</div>
                )}
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
                <ViewerLoadingState label={loadingLabel} />
              ) : error ? (
                <div style={{ padding: 24, display: 'grid', gap: 12, color: '#475569' }}>
                  <div>{error}</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => setOpen(false)} style={triggerButtonStyle()}>
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        window.setTimeout(() => setOpen(true), 10);
                      }}
                      style={ghostButtonStyle()}
                    >
                      Retry
                    </button>
                  </div>
                </div>
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
