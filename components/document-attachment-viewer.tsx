'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const DOC_BUCKET = 'battle-rhythm-docs';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getFileKind(name: string, type?: string | null): 'pdf' | 'image' | 'other' {
  const n = name.toLowerCase();
  const t = (type || '').toLowerCase();
  if (t.includes('pdf') || n.endsWith('.pdf')) return 'pdf';
  if (t.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(n)) return 'image';
  return 'other';
}

function PDFView({ url, fileName }: any) {
  const [pages, setPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(1000);

  const zoomIn = () => setZoom(z => clamp(z + 0.2, 0.7, 3));
  const zoomOut = () => setZoom(z => clamp(z - 0.2, 0.7, 3));

  useEffect(() => {
    const update = () => setWidth(Math.min(window.innerWidth - 32, 1100) * zoom);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [zoom]);

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', padding:10, background:'#fff' }}>
        <span>{fileName}</span>
        <div>
          <button onClick={zoomOut}>-</button>
          <span>{Math.round(zoom*100)}%</span>
          <button onClick={zoomIn}>+</button>
        </div>
      </div>

      <Document file={url} onLoadSuccess={({numPages})=>setPages(numPages)}>
        {Array.from({length: pages}, (_,i)=> (
          <Page key={i} pageNumber={i+1} width={width} />
        ))}
      </Document>
    </div>
  );
}

function ImageView({ url, fileName }: any) {
  const [zoom, setZoom] = useState(1);
  const zoomIn = () => setZoom(z => clamp(z + 0.2, 0.7, 4));
  const zoomOut = () => setZoom(z => clamp(z - 0.2, 0.7, 4));

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', padding:10, background:'#fff' }}>
        <span>{fileName}</span>
        <div>
          <button onClick={zoomOut}>-</button>
          <span>{Math.round(zoom*100)}%</span>
          <button onClick={zoomIn}>+</button>
        </div>
      </div>

      <div style={{display:'flex', justifyContent:'center'}}>
        <img src={url} style={{transform:`scale(${zoom})`, transformOrigin:'top center'}} />
      </div>
    </div>
  );
}

export function DocumentAttachmentViewer({ attachments }: any) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();

    Promise.all(attachments.map(async (a:any)=>{
      const { data } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(a.storage_path,3600);
      return { ...a, url: data?.signedUrl, kind: getFileKind(a.file_name,a.file_type)};
    })).then(setFiles);

  }, [open]);

  return (
    <div>
      <button onClick={()=>setOpen(true)}>Open</button>

      {open && (
        <div>
          <button onClick={()=>setOpen(false)}>Close</button>

          {files.map(f=>{
            if (f.kind==='pdf') return <PDFView key={f.id} url={f.url} fileName={f.file_name}/>;
            if (f.kind==='image') return <ImageView key={f.id} url={f.url} fileName={f.file_name}/>;
            return <div key={f.id}>Unsupported</div>;
          })}
        </div>
      )}
    </div>
  );
}

export function DocumentAttachmentListViewer({
  attachments,
}: {
  attachments: any[];
}) {
  const [selected, setSelected] = useState(attachments?.[0] || null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* File selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {attachments.map((file, i) => (
          <button
            key={file.id || i}
            onClick={() => setSelected(file)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background:
                selected === file
                  ? 'rgba(255,255,255,0.2)'
                  : 'transparent',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            {file.file_name || `File ${i + 1}`}
          </button>
        ))}
      </div>

      {/* Viewer */}
      {selected && (
        <DocumentAttachmentViewer DocumentAttachmentListViewer={selected} />
      )}
    </div>
  );
}