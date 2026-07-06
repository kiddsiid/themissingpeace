'use server';
// Mood extraction actions (Board Overhaul) — read the approved fragments across every
// board and name the visual direction; optionally weave the reading into the Dream
// (dreams.responses_json.boardMood) so the Compass and Peace Center can see it.
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireWorkspaceMember } from '@/lib/workspace/current';
import { extractMood, type MoodInput } from '@/lib/engine/mood';
import { revalidatePath } from 'next/cache';

export async function extractMoodAction(workspaceId: string): Promise<{ summary: string; leanings: string[] }> {
  await requireWorkspaceMember(workspaceId);
  const db = supabaseAdmin();

  const { data: items } = await db
    .from('board_items')
    .select('id, title, body, board:boards(title, type)')
    .eq('workspace_id', workspaceId)
    .eq('disposition', 'approved')
    .limit(120);
  const list = items ?? [];

  const ids = list.map((i: any) => i.id);
  let tagsByItem = new Map<string, string[]>();
  if (ids.length) {
    const { data: links } = await db
      .from('board_item_tags')
      .select('board_item_id, tag:board_tags(label)')
      .in('board_item_id', ids);
    tagsByItem = new Map();
    for (const l of links ?? []) {
      const label = (l as any).tag?.label as string | undefined;
      if (!label) continue;
      const cur = tagsByItem.get((l as any).board_item_id) ?? [];
      cur.push(label);
      tagsByItem.set((l as any).board_item_id, cur);
    }
  }

  const inputs: MoodInput[] = list
    .filter((i: any) => (i as any).board?.type !== 'master_vision')
    .map((i: any) => ({
      title: [i.title, i.body].filter(Boolean).join(' — ') || null,
      tags: tagsByItem.get(i.id) ?? [],
      boardTitle: (i as any).board?.title,
    }));

  return extractMood(inputs);
}

export async function saveMoodToCompass(workspaceId: string, summary: string): Promise<void> {
  await requireWorkspaceMember(workspaceId);
  const text = summary.trim().slice(0, 400);
  if (!text) return;
  const db = supabaseAdmin();
  const { data: row } = await db
    .from('dreams')
    .select('id, responses_json')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return;
  const responses = (row.responses_json ?? {}) as Record<string, unknown>;
  await db
    .from('dreams')
    .update({ responses_json: { ...responses, boardMood: { summary: text, at: new Date().toISOString() } } })
    .eq('id', row.id);
  revalidatePath('/dream');
  revalidatePath('/peace-center');
  revalidatePath('/board');
}
