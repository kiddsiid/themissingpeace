'use server';
import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireActiveWorkspace } from '@/lib/workspace/current';
import { uploadFile } from '@/lib/supabase/storage';

// Create a document record, optionally with an attached file.
export async function uploadDocument(formData: FormData) {
  const ws = await requireActiveWorkspace();
  if (!can(ws.role, 'plan.full')) throw new Error('You do not have permission to add documents');
  const folder = String(formData.get('folder') || 'misc');
  let title = String(formData.get('title') || '').trim();
  const file = formData.get('file');

  let uploadId: string | null = null;
  if (file instanceof File && file.size > 0) {
    const r = await uploadFile(ws.id, file, ws.userId);
    uploadId = r.uploadId;
    if (!title) title = file.name;
  }
  if (!title) throw new Error('Add a name or a file');

  const val = (k: string) => { const v = String(formData.get(k) || '').trim(); return v || null; };
  await supabaseAdmin().from('documents').insert({
    workspace_id: ws.id, folder, title, upload_id: uploadId, created_by: ws.userId,
    contract_status: val('contract_status'),
    due_date: val('due_date'),
    notes: val('notes'),
    linked_vendor_id: val('linked_vendor_id'),
    linked_decision_id: val('linked_decision_id'),
  });
  revalidatePath('/documents');
}
