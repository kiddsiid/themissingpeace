'use server';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceMember } from '@/lib/workspace/current';
import { can } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { uploadFile } from '@/lib/supabase/storage';

export async function uploadBoardFile(formData: FormData) {
  const workspaceId = String(formData.get('workspaceId') || '');
  const boardId = String(formData.get('boardId') || '');
  if (!workspaceId || !boardId) throw new Error('Missing board');
  const actor = await requireWorkspaceMember(workspaceId);
  if (!can(actor.role, 'board.add') && !can(actor.role, 'plan.full')) throw new Error('You cannot add to this board');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return;
  const { uploadId, mime } = await uploadFile(workspaceId, file, actor.userId);
  const type = mime.startsWith('image/') ? 'image' : mime === 'application/pdf' ? 'pdf' : 'file';

  const db = supabaseAdmin();
  const { data: item, error } = await db.from('board_items').insert({
    workspace_id: workspaceId, board_id: boardId, type, title: file.name, upload_id: uploadId, disposition: 'captured', created_by: actor.userId,
  }).select('id').single();
  if (error) throw error;
  await db.from('board_item_positions').insert({ board_item_id: item!.id, board_id: boardId, x: 24, y: 24, z: 0 });
  revalidatePath('/board');
}

// Manual image / screenshot fallback (Board Overhaul — media pipeline step 4).
// Attaches an uploaded image to an EXISTING board item so blocked previews can still be visual.
export async function attachItemImage(formData: FormData) {
  const workspaceId = String(formData.get('workspaceId') || '');
  const boardItemId = String(formData.get('boardItemId') || '');
  if (!workspaceId || !boardItemId) throw new Error('Missing item');
  const actor = await requireWorkspaceMember(workspaceId);
  if (!can(actor.role, 'board.add') && !can(actor.role, 'plan.full')) throw new Error('You cannot edit this board');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return;
  const { uploadId, mime } = await uploadFile(workspaceId, file, actor.userId);
  if (!mime.startsWith('image/')) throw new Error('Please choose an image file');

  await supabaseAdmin()
    .from('board_items')
    .update({ upload_id: uploadId, updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('id', boardItemId);
  revalidatePath('/board');
}
