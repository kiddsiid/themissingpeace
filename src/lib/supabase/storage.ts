// Storage helpers (private 'uploads' bucket). Server-only; uses the service role.
import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

const BUCKET = 'uploads';

export async function uploadFile(workspaceId: string, file: File, uploadedBy: string): Promise<{ uploadId: string; path: string; mime: string }> {
  const db = supabaseAdmin();
  const safe = file.name.replace(/[^\w.\-]/g, '_');
  const path = `${workspaceId}/${randomUUID()}-${safe}`;
  const { error } = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
  if (error) throw error;
  const { data, error: e2 } = await db.from('uploads').insert({
    workspace_id: workspaceId, bucket: BUCKET, path, mime: file.type || null, size: file.size, uploaded_by: uploadedBy,
  }).select('id').single();
  if (e2) throw e2;
  return { uploadId: data!.id as string, path, mime: file.type || '' };
}

export async function signedUrl(path: string, expiresIn = 60 * 60 * 24 * 7): Promise<string | null> {
  const { data } = await supabaseAdmin().storage.from(BUCKET).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

// Batch sign by upload ids → Map(uploadId → { url, mime, path }).
export async function signUploads(uploadIds: string[]): Promise<Map<string, { url: string | null; mime: string | null; path: string }>> {
  const out = new Map<string, { url: string | null; mime: string | null; path: string }>();
  if (!uploadIds.length) return out;
  const { data } = await supabaseAdmin().from('uploads').select('id, path, mime').in('id', uploadIds);
  for (const u of data ?? []) {
    out.set(u.id as string, { url: await signedUrl(u.path as string), mime: (u.mime as string) ?? null, path: u.path as string });
  }
  return out;
}
