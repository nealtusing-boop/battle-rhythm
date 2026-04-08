'use client';

import { useMemo, useState } from 'react';
import { DocumentAttachmentViewer } from '@/components/document-attachment-viewer';
import type { DocumentAttachment, PTSquadValue } from '@/lib/document-shared';
import { PT_SQUADS } from '@/lib/document-shared';

function squadButtonStyle(isSelected: boolean, disabled = false) {
  return {
    padding: '12px 16px',
    borderRadius: 16,
    border: isSelected ? '1px solid #0f172a' : '1px solid rgba(15,23,42,0.10)',
    background: isSelected ? '#0f172a' : '#f8fafc',
    color: isSelected ? '#ffffff' : '#0f172a',
    fontWeight: 800,
    fontSize: 14,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.7 : 1,
    transition: 'transform 0.12s ease, opacity 0.12s ease, background 0.12s ease',
  } as const;
}

export function PTPlansClient({
  initialSquad = '1st_squad',
  attachmentsBySquad,
}: {
  initialSquad?: PTSquadValue;
  attachmentsBySquad: Record<PTSquadValue, DocumentAttachment[]>;
}) {
  const [selectedSquad, setSelectedSquad] = useState<PTSquadValue>(initialSquad);

  const attachments = useMemo(
    () => attachmentsBySquad[selectedSquad] || [],
    [attachmentsBySquad, selectedSquad],
  );

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {PT_SQUADS.map((squad) => {
          const isSelected = selectedSquad === squad.value;
          const hasFiles = (attachmentsBySquad[squad.value] || []).length > 0;

          return (
            <button
              key={squad.value}
              type="button"
              onClick={() => setSelectedSquad(squad.value)}
              style={squadButtonStyle(isSelected)}
              aria-pressed={isSelected}
              title={hasFiles ? squad.label : `${squad.label} (no file posted yet)`}
            >
              {squad.label}
            </button>
          );
        })}
      </div>

      <DocumentAttachmentViewer
        attachments={attachments}
        emptyMessage="No PT plan posted for this squad."
        buttonLabel={`Open ${PT_SQUADS.find((squad) => squad.value === selectedSquad)?.label || 'PT'} Plan`}
      />
    </>
  );
}
