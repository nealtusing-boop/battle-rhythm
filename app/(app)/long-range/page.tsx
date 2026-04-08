import { DocumentAttachmentListViewer } from '@/components/document-attachment-viewer';
import { getActivePostsByCategory } from '@/lib/document-data';

function pageShellStyle() {
  return {
    padding: 16,
    display: 'grid',
    gap: 16,
  } as const;
}

function cardStyle() {
  return {
    borderRadius: 30,
    background: '#ffffff',
    padding: 22,
    boxShadow: '0 18px 44px rgba(15,23,42,0.14)',
    color: '#0f172a',
  } as const;
}

export default async function LongRangePage() {
  const items = await getActivePostsByCategory('long_range');

  return (
    <div style={pageShellStyle()}>
      <section>
        <h1 style={{ margin: 0, fontSize: 40, fontWeight: 800, letterSpacing: '-0.05em', color: '#ffffff' }}>
          Long Range Calendar
        </h1>
      </section>

      <section style={cardStyle()}>
        <DocumentAttachmentListViewer
          items={items}
          emptyMessage="No long range calendar posted."
          autoOpenSingle
          buttonLabel="Open Long Range Calendar"
        />
      </section>
    </div>
  );
}
