// Server-side loader for the PUBLIC guest surface (/w/[slug]). Uses the service role but
// exposes only what a published page should: names, date, welcome, mood — never the CRM.
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface PublicPage {
  workspaceId: string;
  slug: string;
  welcome?: string;
  rsvpOpen: boolean;
  photosOpen: boolean;
  showMood: boolean;
  coupleLine: string;
  dateLine?: string;
  mood?: string;
}

export async function loadPublicPage(slug: string): Promise<PublicPage | null> {
  const db = supabaseAdmin();
  const { data: page } = await db
    .from('guest_pages')
    .select('workspace_id, slug, welcome, rsvp_open, photos_open, show_mood, is_published')
    .eq('slug', slug)
    .maybeSingle();
  if (!page || !page.is_published) return null;

  const [profileRes, dreamRes] = await Promise.all([
    db.from('wedding_profiles').select('partner_one_label, partner_two_label, wedding_date').eq('workspace_id', page.workspace_id).maybeSingle(),
    db.from('dreams').select('responses_json').eq('workspace_id', page.workspace_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const profile = profileRes.data;
  const coupleLine = profile ? `${profile.partner_one_label} & ${profile.partner_two_label}` : 'Our wedding';
  const dateLine = profile?.wedding_date
    ? new Date(profile.wedding_date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : undefined;
  const mood = (dreamRes.data?.responses_json as any)?.boardMood?.summary as string | undefined;

  return {
    workspaceId: page.workspace_id,
    slug: page.slug,
    welcome: page.welcome ?? undefined,
    rsvpOpen: !!page.rsvp_open,
    photosOpen: !!page.photos_open,
    showMood: !!page.show_mood,
    coupleLine,
    dateLine,
    mood,
  };
}
