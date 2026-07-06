import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireActiveWorkspace } from '@/lib/workspace/current';

function csv(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  const workspace = await requireActiveWorkspace();
  const { data, error } = await supabaseAdmin()
    .from('guests')
    .select('first_name, last_name, preferred_name, pronouns, guest_group, email, phone, relationship, is_child, plus_one_eligible, plus_one_name, invited_ceremony, invited_reception, invited_rehearsal, invited_other_events, rsvp_status, meal_choice, dietary, accessibility, traveling_from, hotel_status, transportation_need, gift_received, thank_you_note_status, song_request, notes')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const headers = ['first_name','last_name','preferred_name','pronouns','guest_group','email','phone','relationship','is_child','plus_one_eligible','plus_one_name','invited_ceremony','invited_reception','invited_rehearsal','invited_other_events','rsvp_status','meal_choice','dietary','accessibility','traveling_from','hotel_status','transportation_need','gift_received','thank_you_note_status','song_request','notes'];
  const rows = [headers.join(','), ...(data ?? []).map((guest: any) => headers.map((header) => csv(guest[header])).join(','))];
  return new NextResponse(rows.join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="guests.csv"',
    },
  });
}
