import { DocumentAttachmentListViewer } from '@/components/document-attachment-viewer';
import { getActivePostsByCategory } from '@/lib/document-data';

function cardStyle() {
  return {
    borderRadius: 28,
    background: '#ffffff',
    padding: 22,
    boxShadow: '0 18px 40px rgba(15,23,42,0.14)',
    color: '#0f172a',
  } as const;
}

function pageTitleStyle() {
  return {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.04,
    fontWeight: 800,
    letterSpacing: '-0.05em',
    color: '#ffffff',
  } as const;
}

export default async function ResourcesPage() {
  const resources = await getActivePostsByCategory('resource');

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ padding: '4px 2px 0 2px' }}>
        <h1 style={{ ...pageTitleStyle(), maxWidth: 620 }}>SOP&apos;s &amp; Resources</h1>
      </section>

      <section style={cardStyle()}>
        <DocumentAttachmentListViewer items={resources} emptyMessage="No resources posted." />
      </section>
    </div>
  );
}
