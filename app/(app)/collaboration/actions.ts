'use server';

import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireActiveWorkspace } from '@/lib/workspace/current';

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function addObjectComment(formData: FormData) {
  const workspace = await requireActiveWorkspace();
  if (!can(workspace.role, 'comment')) throw new Error('You do not have permission to comment');
  const objectType = text(formData, 'object_type');
  const objectId = text(formData, 'object_id');
  const body = text(formData, 'body');
  const returnPath = text(formData, 'return_path') || '/peace-center';
  if (!objectType || !objectId || !body) throw new Error('A comment needs a target and text');
  if (body.length > 2000) throw new Error('Comment is too long');

  const { error } = await supabaseAdmin().from('object_comments').insert({
    workspace_id: workspace.id,
    object_type: objectType,
    object_id: objectId,
    body,
    author_id: workspace.userId,
  });
  if (error) throw error;
  revalidatePath(returnPath);
}

export async function deleteObjectComment(formData: FormData) {
  const workspace = await requireActiveWorkspace();
  const id = text(formData, 'id');
  const returnPath = text(formData, 'return_path') || '/peace-center';
  if (!id) throw new Error('Comment is required');
  const { error } = await supabaseAdmin()
    .from('object_comments')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspace.id)
    .eq('author_id', workspace.userId);
  if (error) throw error;
  revalidatePath(returnPath);
}
