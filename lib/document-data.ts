import { createClient } from '@/lib/supabase/server';

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

function sortAttachments(attachments: DocumentAttachment[] | null | undefined) {
  return [...(attachments || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

export async function getActivePostsByCategory(category: string): Promise<DocumentPostWithAttachments[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('document_posts')
    .select(
      `
        id,
        title,
        created_at,
        attachments:document_attachments (
          id,
          storage_path,
          file_name,
          sort_order,
          file_type
        )
      `,
    )
    .eq('category', category)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((post) => ({
    id: post.id,
    title: post.title,
    attachments: sortAttachments(post.attachments),
  }));
}

export async function getActiveAttachmentsByCategoryAndSubcategory(
  category: string,
  subcategory: string,
): Promise<DocumentAttachment[]> {
  const supabase = await createClient();

  const { data: post } = await supabase
    .from('document_posts')
    .select('id')
    .eq('category', category)
    .eq('subcategory', subcategory)
    .eq('is_active', true)
    .single();

  if (!post) return [];

  const { data: files } = await supabase
    .from('document_attachments')
    .select('id, storage_path, file_name, sort_order, file_type')
    .eq('post_id', post.id)
    .order('sort_order', { ascending: true });

  return files || [];
}

export async function getPTPlansBySquad(): Promise<Record<PTSquadValue, DocumentAttachment[]>> {
  const entries = await Promise.all(
    PT_SQUADS.map(async (squad) => {
      const attachments = await getActiveAttachmentsByCategoryAndSubcategory('pt_plan', squad.value);
      return [squad.value, attachments] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<PTSquadValue, DocumentAttachment[]>;
}
