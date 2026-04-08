export type DocumentAttachment = {
  id: string;
  storage_path: string;
  file_name: string;
  sort_order: number;
  file_type?: string | null;
};

export type DocumentPostWithAttachments = {
  id: string;
  title: string | null;
  attachments: DocumentAttachment[];
};

export const PT_SQUADS = [
  { label: '1st Squad', value: '1st_squad' },
  { label: '2nd Squad', value: '2nd_squad' },
  { label: '3rd Squad', value: '3rd_squad' },
  { label: 'WPNS Squad', value: 'wpns_squad' },
] as const;

export type PTSquadValue = (typeof PT_SQUADS)[number]['value'];
