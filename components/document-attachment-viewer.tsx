'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type MutableRefObject, type ReactNode, type TouchEvent } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const DOC_BUCKET = 'battle-rhythm-docs';
const MIN_SCALE = 1;
const MAX_SCALE = 4;

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type TouchPoint = { clientX: number; clientY: number };
type TouchCollection = TouchEvent<HTMLElement>['touches'] | ArrayLike<TouchPoint>;

function getTouchAt(touches: TouchCollection, index: number): TouchPoint | null {
  const withItem = touches as TouchCollection & { item?: (index: number) => TouchPoint | null };
  if (typeof withItem.item === 'function') {
    return withItem.item(index);
  }
  return touches[index] ?? null;
}

function getDistance(touches: TouchCollection) {
  if (touches.length < 2) return 0;
  const a = getTouchAt(touches, 0);
  const b = getTouchAt(touches, 1);
  if (!a || !b) return 0;
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function useContainerSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => {
      setSize({
        width: node.clientWidth || 0,
        height: node.clientHeight || 0,
      });
    };

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

  return { ref, ...size };
}

function usePinchZoom(onToggleChrome: () => void, onViewportResetRef?: MutableRefObject<(() => void) | null>) {
  const [scale, setScale] = useState(1);
  const gestureRef = useRef({
    startDistance: 0,
    startScale: 1,
    moved: false,
    pinching: false,
    tapStartX: 0,
    tapStartY: 0,
    tapStartTime: 0,
  });

  const resetZoom = useCallback(() => {
    gestureRef.current.startDistance = 0;
    gestureRef.current.startScale = 1;
    gestureRef.current.moved = false;
    gestureRef.current.pinching = false;
    setScale(1);
  }, []);

  useEffect(() => {
    if (!onViewportResetRef) return;
    onViewportResetRef.current = resetZoom;
    return () => {
      onViewportResetRef.current = null;
    };
  }, [onViewportResetRef, resetZoom]);

  const onTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    const gesture = gestureRef.current;

    if (event.touches.length >= 2) {
      gesture.pinching = true;
      gesture.moved = true;
      gesture.startDistance = getDistance(event.touches);
      gesture.startScale = scale;
      return;
    }

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      gesture.pinching = false;
      gesture.moved = false;
      gesture.tapStartX = touch.clientX;
      gesture.tapStartY = touch.clientY;
      gesture.tapStartTime = Date.now();
    }
  }, [scale]);

  const onTouchMove = useCallback((event: TouchEvent<HTMLElement>) => {
    const gesture = gestureRef.current;

    if (event.touches.length >= 2) {
      const distance = getDistance(event.touches);
      if (!gesture.startDistance) {
        gesture.startDistance = distance;
        gesture.startScale = scale;
      }

      const nextScale = clamp((gesture.startScale * distance) / gesture.startDistance, MIN_SCALE, MAX_SCALE);
      gesture.pinching = true;
      gesture.moved = true;
      setScale(nextScale);
      event.preventDefault();
      return;
    }

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const deltaX = Math.abs(touch.clientX - gesture.tapStartX);
      const deltaY = Math.abs(touch.clientY - gesture.tapStartY);
      if (deltaX > 10 || deltaY > 10) {
        gesture.moved = true;
      }
    }
  }, [scale]);

  const onTouchEnd = useCallback(() => {
    const gesture = gestureRef.current;

    if (!gesture.pinching && !gesture.moved && Date.now() - gesture.tapStartTime < 250) {
      onToggleChrome();
    }

    if (gesture.pinching) {
      gesture.startDistance = 0;
      gesture.startScale = scale;
    }

    if (!gesture.pinching) {
      gesture.startDistance = 0;
      gesture.startScale = scale;
    }

    if (scale <= 1.01) {
      setScale(1);
    }

    gesture.pinching = false;
    gesture.moved = false;
  }, [onToggleChrome, scale]);

  const onClick = useCallback((event: MouseEvent<HTMLElement>) => {
    if (event.defaultPrevented) return;
    onToggleChrome();
  }, [onToggleChrome]);

  return {
    scale,
    setScale,
    resetZoom,
    gestureHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
      onClick,
    },
  };
}

function PreviewShell({
  children,
  onToggleChrome,
  onViewportResetRef,
  resetSignal,
}: {
  children: (props: { scale: number; width: number; height: number; setScale: (value: number) => void }) => ReactNode;
  onToggleChrome: () => void;
  onViewportResetRef: MutableRefObject<(() => void) | null>;
  resetSignal: number;
}) {
  const { ref, width, height } = useContainerSize<HTMLDivElement>();
  const { scale, setScale, resetZoom, gestureHandlers } = usePinchZoom(onToggleChrome, onViewportResetRef);

  useEffect(() => {
    resetZoom();
  }, [resetSignal, resetZoom]);

  return (
    <div
      ref={ref}
      {...gestureHandlers}
      style={{
        height: '100%',
        overflow: 'auto',
        background: '#e5e7eb',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-x pan-y',
      }}
    >
      {children({ scale, width, height, setScale })}
    </div>
  );
}

function PDFPreview({
  url,
  resetKey,
  onToggleChrome,
  onViewportResetRef,
}: {
  url: string;
  resetKey: number;
  onToggleChrome: () => void;
  onViewportResetRef: MutableRefObject<(() => void) | null>;
}) {
  const [numPages, setNumPages] = useState(0);

  return (
    <PreviewShell onToggleChrome={onToggleChrome} onViewportResetRef={onViewportResetRef} resetSignal={resetKey}>
      {({ scale, width }) => {
        const baseWidth = Math.max(220, Math.floor(Math.min(width - 24, 1100)));
        const pageWidth = Math.max(220, Math.floor(baseWidth * scale));

        return (
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
        );
      }}
    </PreviewShell>
  );
}

function ImagePreview({
  url,
  fileName,
  resetKey,
  onToggleChrome,
  onViewportResetRef,
}: {
  url: string;
  fileName: string;
  resetKey: number;
  onToggleChrome: () => void;
  onViewportResetRef: MutableRefObject<(() => void) | null>;
}) {
  return (
    <PreviewShell onToggleChrome={onToggleChrome} onViewportResetRef={onViewportResetRef} resetSignal={resetKey}>
      {({ scale, width, height }) => {
        const baseWidth = Math.max(220, Math.floor(Math.min(width - 24, 1100)));
        const imageWidth = Math.max(220, Math.floor(baseWidth * scale));
        const minHeight = Math.max(height, 320);

        return (
          <div
            style={{
              minHeight,
              display: 'grid',
              placeItems: 'center',
              padding: 12,
            }}
          >
            <img
              key={`${url}-${resetKey}`}
              src={url}
              alt={fileName}
              style={{
                display: 'block',
                width: imageWidth,
                maxWidth: 'none',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: 10,
                boxShadow: '0 10px 26px rgba(15,23,42,0.10)',
                background: '#ffffff',
              }}
            />
          </div>
        );
      }}
    </PreviewShell>
  );
}

function FilePreview({
  file,
  resetKey,
  onToggleChrome,
  onViewportResetRef,
}: {
  file: ResolvedAttachment;
  resetKey: number;
  onToggleChrome: () => void;
  onViewportResetRef: MutableRefObject<(() => void) | null>;
}) {
  if (file.kind === 'pdf') {
    return (
      <PDFPreview
        url={file.signedUrl}
        resetKey={resetKey}
        onToggleChrome={onToggleChrome}
        onViewportResetRef={onViewportResetRef}
      />
    );
  }

  if (file.kind === 'image') {
    return (
      <ImagePreview
        url={file.signedUrl}
        fileName={file.file_name}
        resetKey={resetKey}
        onToggleChrome={onToggleChrome}
        onViewportResetRef={onViewportResetRef}
      />
    );
  }

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
  const viewerViewportRef = useRef<HTMLDivElement | null>(null);
  const resetZoomRef = useRef<(() => void) | null>(null);

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
      resetZoomRef.current?.();
      if (viewerViewportRef.current) {
        viewerViewportRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
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
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 10,
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
                          setChromeVisible(true);
                          setResetKey((value) => value + 1);
                          resetZoomRef.current?.();
                          if (viewerViewportRef.current) {
                            viewerViewportRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                          }
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

            <div
              ref={viewerViewportRef}
              style={{
                position: 'absolute',
                top: topInset,
                right: 0,
                bottom: 0,
                left: 0,
              }}
            >
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
                <FilePreview
                  file={selected}
                  resetKey={resetKey}
                  onToggleChrome={() => setChromeVisible((value) => !value)}
                  onViewportResetRef={resetZoomRef}
                />
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
