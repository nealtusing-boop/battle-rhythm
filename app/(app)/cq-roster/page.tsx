import { DocumentAttachmentViewer } from '@/components/document-attachment-viewer';
import { getActiveAttachmentsByCategoryAndSubcategory } from '@/lib/document-data';

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

function sectionLabelStyle() {
  return {
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#64748b',
    margin: 0,
  };
}

export default async function CQRosterPage() {
  const [cqFiles, staffFiles] = await Promise.all([
    getActiveAttachmentsByCategoryAndSubcategory('cq_roster', 'cq'),
    getActiveAttachmentsByCategoryAndSubcategory('cq_roster', 'staff_duty'),
  ]);

  return (
    <div style={pageShellStyle()}>
      <section>
        <h1 style={{ margin: 0, fontSize: 40, fontWeight: 800, letterSpacing: '-0.05em', color: '#ffffff' }}>
          CQ / Staff Duty Roster
        </h1>
      </section>

      <section style={cardStyle()}>
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <p style={sectionLabelStyle()}>CQ</p>
            <DocumentAttachmentViewer
              attachments={cqFiles}
              emptyMessage="No CQ roster posted."
              buttonLabel="Open CQ Roster"
            />
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <p style={sectionLabelStyle()}>Staff Duty</p>
            <DocumentAttachmentViewer
              attachments={staffFiles}
              emptyMessage="No Staff Duty roster posted."
              buttonLabel="Open Staff Duty Roster"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
