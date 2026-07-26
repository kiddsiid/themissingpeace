import { redirect } from 'next/navigation';
import { getActiveWorkspace } from '@/lib/workspace/current';
import { loadCanvasBoard } from '@/lib/canvas/store';
import { AtmosphereLab } from './AtmosphereLab';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ATMOSPHERE_SURFACES, surfaceTargetColor, type Palette, type Surface } from '@/lib/engine/atmosphere';

// Atmosphere Lab — the palette & mood control room. Loads the shared board slice
// (palette) plus the wider wedding context (season / light / wedding-palette /
// approver roles) and hands a plain snapshot to the interactive client studio.
export default async function AtmospherePage() {
  const workspace = await getActiveWorkspace();
  if (!workspace) redirect('/onboarding');

  const { board, context } = await loadCanvasBoard(workspace.id, { projectName: workspace.name });
  const db = supabaseAdmin();
  const { data: storedPlan } = await db
    .from('atmosphere_plans')
    .select('palette_json, surfaces_json')
    .eq('workspace_id', workspace.id)
    .maybeSingle();

  const legacyPalette: Palette = {
    primary: board.palette.colors[0] || '#8A9A80',
    secondary: board.palette.colors[1] || '#BC7459',
    accent: board.palette.colors[2] || '#E7D2C8',
    neutrals: [board.palette.colors[3] || '#F1EBDD', board.palette.colors[4] || '#3A3631'],
  };
  const worldPalette = (storedPlan?.palette_json as Palette | null) || legacyPalette;
  const surfaces = (storedPlan?.surfaces_json as Surface[] | null) || ATMOSPHERE_SURFACES.map((surface) => ({
    surface,
    applied: false,
    override: false,
    color: surfaceTargetColor(surface, worldPalette),
  }));

  // 0022 migration adapter: preserve the existing Canvas palette on first load.
  if (!storedPlan) {
    await db.from('atmosphere_plans').upsert({
      workspace_id: workspace.id,
      palette_json: worldPalette,
      surfaces_json: surfaces,
      updated_by: workspace.userId,
    }, { onConflict: 'workspace_id' });
  }

  const palette = {
    ...board.palette,
    colors: [
      worldPalette.primary,
      worldPalette.secondary || worldPalette.primary,
      worldPalette.accent || worldPalette.secondary || worldPalette.primary,
      worldPalette.neutrals?.[0] || '#F1EBDD',
      worldPalette.neutrals?.[1] || '#3A3631',
    ],
  };

  return (
    <AtmosphereLab
      palette={palette}
      context={context}
      workspaceRole={workspace.role}
      surfaces={surfaces}
    />
  );
}
