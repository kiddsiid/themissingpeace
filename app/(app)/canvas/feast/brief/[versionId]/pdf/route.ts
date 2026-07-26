import { NextResponse } from 'next/server';
import { createCatererBriefPdf } from '@/lib/feast/pdf';
import type { CatererBriefSnapshot } from '@/lib/feast/types';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveWorkspace } from '@/lib/workspace/current';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> },
) {
  const workspace = await getActiveWorkspace();
  if (!workspace) return new NextResponse('Unauthorized', { status: 401 });
  const { versionId } = await params;
  const { data, error } = await supabaseAdmin()
    .from('caterer_brief_versions')
    .select('version, snapshot_json')
    .eq('workspace_id', workspace.id)
    .eq('id', versionId)
    .maybeSingle();
  if (error) return new NextResponse('Could not load the brief', { status: 500 });
  if (!data) return new NextResponse('Brief not found', { status: 404 });
  const bytes = await createCatererBriefPdf(
    data.snapshot_json as CatererBriefSnapshot,
    Number(data.version),
  );
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="the-missing-peace-caterer-brief-v${Number(data.version)}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

