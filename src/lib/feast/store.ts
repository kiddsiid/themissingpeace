import { loadCanvasBoard } from '@/lib/canvas/store';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ActiveWorkspace } from '@/lib/workspace/current';
import type {
  CatererBriefVersion,
  ConfirmationEvidence,
  DishAssessment,
  FeastDish,
  FeastGuest,
  FeastPlan,
  FeastStudioSnapshot,
  GuestRequirement,
  MealScene,
} from './types';

const DEFAULT_SCENES = [
  { kind: 'welcome_drink', title: 'Welcome Drink', purpose: 'Put care into every hand as guests arrive.', service: 'Passed and bar', mood: 'Warm' },
  { kind: 'passed_bites', title: 'Passed Bites', purpose: 'Offer an easy first taste while people gather.', service: 'Passed', mood: 'Generous' },
  { kind: 'grazing_table', title: 'Grazing Table', purpose: 'Create a shared abundance before dinner.', service: 'Grazing display', mood: 'Abundant' },
  { kind: 'first_course', title: 'First Course', purpose: 'Settle the room and begin the table story.', service: 'Plated', mood: 'Candlelit' },
  { kind: 'main_course', title: 'Main Course', purpose: 'Make the heart of the meal feel shared and intentional.', service: 'Family style', mood: 'Celebratory' },
  { kind: 'dessert', title: 'Dessert', purpose: 'Let the room soften into something sweet.', service: 'Dessert display', mood: 'Glowing' },
  { kind: 'late_night', title: 'Late Night Bite', purpose: 'Bring comfort back to the dance floor.', service: 'Passed or boxed', mood: 'Playful' },
  { kind: 'tea_coffee', title: 'Tea and Coffee', purpose: 'Offer a quiet ritual before the final goodbye.', service: 'Tea service', mood: 'Restorative' },
  { kind: 'sendoff_treat', title: 'Sendoff Treat', purpose: 'Leave one last gesture of hospitality in every hand.', service: 'Wrapped to go', mood: 'Tender' },
] as const;

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function numberOrNull(value: unknown): number | null {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function normalizeCode(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (/^kosher/.test(normalized)) return 'kosher_certified';
  if (/nut.*allergy|allergy.*nut/.test(normalized)) return 'nut_allergy';
  if (/zabiha/.test(normalized)) return 'zabiha_certification';
  if (/gluten/.test(normalized)) return 'gluten_avoidance';
  if (/alcohol/.test(normalized)) return 'alcohol_free';
  return normalized || 'custom_requirement';
}

function requirementShape(label: string, legacyCategory?: string) {
  const lower = `${label} ${legacyCategory ?? ''}`.toLowerCase();
  const category = lower.includes('allerg')
    ? 'allergy'
    : lower.includes('religious') || /kosher|halal|zabiha|pareve|passover/.test(lower)
      ? 'religious'
      : lower.includes('preference') || /kid|spice|texture/.test(lower)
        ? 'preference'
        : 'dietary';
  const severity = category === 'allergy' ? 'safety_critical' : category === 'preference' ? 'preference' : 'required';
  return { category, severity, code: normalizeCode(label) } as const;
}

function sceneKindForLegacy(slot: string): string {
  return {
    welcome: 'welcome_drink',
    grazing: 'grazing_table',
    starter: 'first_course',
    main: 'main_course',
    dessert: 'dessert',
    late: 'late_night',
    tea: 'tea_coffee',
  }[slot] ?? 'custom';
}

function legacyAssessmentState(
  requirementCode: string,
  restrictions: string[],
  compliance: string,
): DishAssessment['state'] {
  const haystack = `${restrictions.join(' ')} ${compliance}`.toLowerCase();
  if (requirementCode === 'nut_allergy') {
    if (/contains (?:tree )?nuts|contains nuts|baklava/.test(haystack) && !/nut[- ]free/.test(haystack)) return 'conflict';
    return /nut[- ]free/.test(haystack) ? 'ingredient_compatible' : 'unknown';
  }
  if (requirementCode === 'kosher_certified') {
    return /kosher style|kosher-style/.test(haystack) ? 'ingredient_compatible' : 'unknown';
  }
  if (requirementCode.includes('halal') || requirementCode.includes('zabiha')) {
    if (/not halal/.test(haystack)) return 'conflict';
    return /halal|zabiha/.test(haystack) ? 'ingredient_compatible' : 'unknown';
  }
  const words = requirementCode.replace(/_(avoidance|certified|certification|allergy)$/g, '').split('_');
  return words.every((word) => haystack.includes(word)) ? 'ingredient_compatible' : 'unknown';
}

async function seedFeastPlan(workspace: ActiveWorkspace) {
  const db = supabaseAdmin();
  const { board } = await loadCanvasBoard(workspace.id, { projectName: workspace.name });
  const [{ count: guestCount }, { data: existingScenes }] = await Promise.all([
    db.from('guests').select('id', { head: true, count: 'exact' }).eq('workspace_id', workspace.id),
    db.from('meal_scenes').select('id').eq('workspace_id', workspace.id).limit(1),
  ]);

  const { error: planError } = await db.from('feast_plans').upsert({
    workspace_id: workspace.id,
    intention: board.food.prompt || board.food.emotionalRoot || 'A meal that feels like us.',
    meal_shape:
      board.food.style === 'family'
        ? 'family_style'
        : board.food.style || 'family_style',
    service_feeling: board.food.serviceFeeling || 'Warm and generous',
    emotional_root: board.food.emotionalRoot || 'Hospitality',
    hospitality_standard: board.food.hospitalityStandard || 'thoughtful',
    guest_count: guestCount ?? 0,
    status: 'in_progress',
    version: 1,
    updated_by: workspace.userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'workspace_id' });
  if (planError) throw planError;
  if (existingScenes?.length) return;

  const legacyByKind = new Map(board.food.courses.map((course) => [sceneKindForLegacy(course.slot), course]));
  const sceneRows = DEFAULT_SCENES.map((scene, ordinal) => {
    const legacy = legacyByKind.get(scene.kind);
    return {
      workspace_id: workspace.id,
      kind: scene.kind,
      title: legacy?.name || scene.title,
      purpose: legacy?.scene || scene.purpose,
      ordinal,
      planned_at: legacy?.timing || '',
      service_style: legacy?.service || scene.service,
      mood: legacy?.mood || scene.mood,
      notes: legacy ? [legacy.staffing, legacy.rental].filter(Boolean).join(' · ') : '',
      status: legacy?.dishes.length ? 'in_progress' : 'empty',
      version: 1,
    };
  });
  const { data: createdScenes, error: sceneError } = await db
    .from('meal_scenes')
    .insert(sceneRows)
    .select('id, kind');
  if (sceneError) throw sceneError;

  const idByKind = new Map((createdScenes ?? []).map((scene) => [scene.kind as string, scene.id as string]));
  const legacyDishes = board.food.courses.flatMap((course) => {
    const sceneId = idByKind.get(sceneKindForLegacy(course.slot));
    if (!sceneId) return [];
    return course.dishes.map((dish) => ({
      workspace_id: workspace.id,
      scene_id: sceneId,
      name: dish.name,
      role: course.slot === 'main' ? 'Main offering' : 'Part of the moment',
      ingredients_json: dish.tags ?? [],
      story: dish.story,
      presentation: dish.plate,
      execution_notes: [dish.compliance, dish.execution].filter(Boolean).join('\n'),
      service_style: course.service,
      mood: course.mood,
      advisory_cost_min_cents: dish.cost === 'higher' ? 2200 : dish.cost === 'moderate' ? 1200 : 600,
      advisory_cost_max_cents: dish.cost === 'higher' ? 3200 : dish.cost === 'moderate' ? 2000 : 1200,
      status: dish.blessed ? 'confirmed' : 'needs_confirmation',
      source: 'manual',
      version: 1,
      created_by: workspace.userId,
      legacyRestrictions: dish.restrictions,
      legacyCompliance: dish.compliance,
    }));
  });
  const dishPayload = legacyDishes.map(({ legacyRestrictions: _legacyRestrictions, legacyCompliance: _legacyCompliance, ...dish }) => dish);
  const { data: createdDishes, error: dishError } = dishPayload.length
    ? await db.from('dishes').insert(dishPayload).select('id, name')
    : { data: [], error: null };
  if (dishError) throw dishError;

  const requirementRows = board.food.restrictions.map((restriction) => {
    const shape = requirementShape(restriction.label, restriction.category);
    return {
      workspace_id: workspace.id,
      guest_id: null,
      category: shape.category,
      code: shape.code,
      severity: shape.severity,
      notes: restriction.notes || '',
    };
  });
  const { data: createdRequirements, error: requirementError } = requirementRows.length
    ? await db.from('guest_requirements').insert(requirementRows).select('id, code')
    : { data: [], error: null };
  if (requirementError) throw requirementError;

  const idByDishName = new Map((createdDishes ?? []).map((dish) => [dish.name as string, dish.id as string]));
  const assessmentRows = legacyDishes.flatMap((dish) => {
    const dishId = idByDishName.get(dish.name);
    if (!dishId) return [];
    return (createdRequirements ?? []).map((requirement) => ({
      workspace_id: workspace.id,
      dish_id: dishId,
      requirement_code: requirement.code,
      state: legacyAssessmentState(
        requirement.code as string,
        dish.legacyRestrictions,
        dish.legacyCompliance,
      ),
      reasoning: 'Imported from the prior Feast board. Caterer confirmation has not been assumed.',
      assessed_by: 'system',
    }));
  });
  if (assessmentRows.length) {
    const { error } = await db.from('dish_assessments').insert(assessmentRows);
    if (error) throw error;
  }
}

export async function ensureFeastPlan(workspace: ActiveWorkspace) {
  const { data, error } = await supabaseAdmin()
    .from('feast_plans')
    .select('workspace_id')
    .eq('workspace_id', workspace.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) await seedFeastPlan(workspace);
}

function mapPlan(row: Record<string, unknown>): FeastPlan {
  return {
    workspace_id: text(row.workspace_id),
    intention: text(row.intention),
    meal_shape: text(row.meal_shape, 'family_style'),
    service_feeling: text(row.service_feeling, 'Warm and generous'),
    emotional_root: text(row.emotional_root, 'Hospitality'),
    hospitality_standard: text(row.hospitality_standard, 'thoughtful'),
    guest_count: Number(row.guest_count ?? 0),
    advisory_budget_total_cents: numberOrNull(row.advisory_budget_total_cents),
    advisory_budget_per_guest_cents: numberOrNull(row.advisory_budget_per_guest_cents),
    currency: text(row.currency, 'USD'),
    status: text(row.status, 'draft') as FeastPlan['status'],
    version: Number(row.version ?? 1),
    updated_at: text(row.updated_at),
  };
}

function mapScene(row: Record<string, unknown>): MealScene {
  return {
    id: text(row.id),
    workspace_id: text(row.workspace_id),
    kind: text(row.kind, 'custom'),
    title: text(row.title, 'Untitled scene'),
    purpose: text(row.purpose),
    ordinal: Number(row.ordinal ?? 0),
    planned_at: text(row.planned_at),
    duration_minutes: numberOrNull(row.duration_minutes),
    service_style: text(row.service_style),
    mood: text(row.mood),
    notes: text(row.notes),
    status: text(row.status, 'empty') as MealScene['status'],
    version: Number(row.version ?? 1),
    created_at: text(row.created_at),
  };
}

function mapDish(row: Record<string, unknown>): FeastDish {
  return {
    id: text(row.id),
    workspace_id: text(row.workspace_id),
    scene_id: text(row.scene_id),
    name: text(row.name, 'Untitled dish'),
    role: text(row.role),
    ingredients_json: Array.isArray(row.ingredients_json)
      ? row.ingredients_json.filter((item): item is string => typeof item === 'string')
      : [],
    story: text(row.story),
    presentation: text(row.presentation),
    execution_notes: text(row.execution_notes),
    service_style: text(row.service_style),
    mood: text(row.mood),
    advisory_cost_min_cents: numberOrNull(row.advisory_cost_min_cents),
    advisory_cost_max_cents: numberOrNull(row.advisory_cost_max_cents),
    status: text(row.status, 'draft') as FeastDish['status'],
    source: text(row.source, 'manual') as FeastDish['source'],
    version: Number(row.version ?? 1),
    created_at: text(row.created_at),
  };
}

function priorityLabels(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string').slice(0, 5);
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([, weight]) => Number(weight) > 0 || weight === true)
    .sort(([, left], [, right]) => Number(right) - Number(left))
    .slice(0, 5)
    .map(([key]) => key.replace(/_/g, ' '));
}

export async function loadFeastStudio(workspace: ActiveWorkspace): Promise<FeastStudioSnapshot> {
  await ensureFeastPlan(workspace);
  const db = supabaseAdmin();
  const [
    planRes,
    scenesRes,
    dishesRes,
    requirementsRes,
    evidenceRes,
    assessmentsRes,
    briefsRes,
    guestsRes,
    commentsRes,
    compassRes,
  ] = await Promise.all([
    db.from('feast_plans').select('*').eq('workspace_id', workspace.id).single(),
    db.from('meal_scenes').select('*').eq('workspace_id', workspace.id).order('ordinal'),
    db.from('dishes').select('*').eq('workspace_id', workspace.id).order('created_at'),
    db.from('guest_requirements').select('*').eq('workspace_id', workspace.id).order('created_at'),
    db.from('confirmation_evidence').select('*').eq('workspace_id', workspace.id).order('confirmed_at', { ascending: false }),
    db.from('dish_assessments').select('*').eq('workspace_id', workspace.id).order('assessed_at', { ascending: false }),
    db.from('caterer_brief_versions').select('*').eq('workspace_id', workspace.id).order('version', { ascending: false }),
    db.from('guests').select('id, first_name, last_name, preferred_name, dietary, meal_choice').eq('workspace_id', workspace.id).order('last_name'),
    db.from('object_comments').select('id, object_type, object_id, body, author_id, created_at').eq('workspace_id', workspace.id).in('object_type', ['feast_scene', 'feast_dish', 'feast_requirement', 'feast_brief']).order('created_at'),
    db.from('wedding_compass').select('summary, priorities_json').eq('workspace_id', workspace.id).maybeSingle(),
  ]);
  const firstError = [
    planRes.error,
    scenesRes.error,
    dishesRes.error,
    requirementsRes.error,
    evidenceRes.error,
    assessmentsRes.error,
    briefsRes.error,
    guestsRes.error,
    commentsRes.error,
    compassRes.error,
  ].find(Boolean);
  if (firstError) throw firstError;

  const authorIds = [...new Set((commentsRes.data ?? []).map((comment) => comment.author_id).filter(Boolean))] as string[];
  const { data: authors, error: authorsError } = authorIds.length
    ? await db.from('users').select('id, name, display_name').in('id', authorIds)
    : { data: [], error: null };
  if (authorsError) throw authorsError;
  const authorById = new Map((authors ?? []).map((author) => [
    author.id as string,
    text(author.display_name) || text(author.name) || 'Collaborator',
  ]));

  return {
    plan: mapPlan(planRes.data as Record<string, unknown>),
    scenes: (scenesRes.data ?? []).map((row) => mapScene(row as Record<string, unknown>)),
    dishes: (dishesRes.data ?? []).map((row) => mapDish(row as Record<string, unknown>)),
    requirements: (requirementsRes.data ?? []).map((row) => ({
      id: text(row.id),
      workspace_id: text(row.workspace_id),
      guest_id: row.guest_id ? text(row.guest_id) : null,
      category: text(row.category, 'dietary') as GuestRequirement['category'],
      code: text(row.code),
      severity: text(row.severity, 'required') as GuestRequirement['severity'],
      notes: text(row.notes),
      created_at: text(row.created_at),
    })),
    evidence: (evidenceRes.data ?? []).map((row) => ({
      id: text(row.id),
      workspace_id: text(row.workspace_id),
      vendor_record_id: row.vendor_record_id ? text(row.vendor_record_id) : null,
      source_type: text(row.source_type, 'other') as ConfirmationEvidence['source_type'],
      source_name: text(row.source_name),
      confirmed_by: row.confirmed_by ? text(row.confirmed_by) : null,
      confirmed_at: text(row.confirmed_at),
      expires_at: row.expires_at ? text(row.expires_at) : null,
      notes: text(row.notes),
      attachment_id: row.attachment_id ? text(row.attachment_id) : null,
      created_at: text(row.created_at),
    })),
    assessments: (assessmentsRes.data ?? []).map((row) => ({
      id: text(row.id),
      workspace_id: text(row.workspace_id),
      dish_id: text(row.dish_id),
      requirement_code: text(row.requirement_code),
      state: text(row.state, 'unknown') as DishAssessment['state'],
      reasoning: text(row.reasoning),
      evidence_id: row.evidence_id ? text(row.evidence_id) : null,
      assessed_by: text(row.assessed_by, 'system') as DishAssessment['assessed_by'],
      assessed_at: text(row.assessed_at),
    })),
    briefs: (briefsRes.data ?? []).map((row) => ({
      id: text(row.id),
      workspace_id: text(row.workspace_id),
      version: Number(row.version ?? 1),
      status: text(row.status, 'draft') as CatererBriefVersion['status'],
      snapshot_json: (row.snapshot_json ?? {}) as CatererBriefVersion['snapshot_json'],
      changed_sections: Array.isArray(row.changed_sections)
        ? row.changed_sections.filter((item: unknown): item is string => typeof item === 'string')
        : [],
      created_by: row.created_by ? text(row.created_by) : null,
      created_at: text(row.created_at),
    })),
    guests: (guestsRes.data ?? []).map((row) => ({
      id: text(row.id),
      label: text(row.preferred_name) || [text(row.first_name), text(row.last_name)].filter(Boolean).join(' ') || 'Guest',
      dietary: text(row.dietary),
      meal_choice: text(row.meal_choice),
    } satisfies FeastGuest)),
    comments: (commentsRes.data ?? []).map((row) => ({
      id: text(row.id),
      object_type: text(row.object_type),
      object_id: text(row.object_id),
      body: text(row.body),
      author_id: row.author_id ? text(row.author_id) : null,
      author_name: row.author_id ? authorById.get(text(row.author_id)) ?? 'Collaborator' : 'Collaborator',
      created_at: text(row.created_at),
    })),
    projectName: workspace.name,
    compassSummary: text(compassRes.data?.summary, 'A celebration rooted in care, warmth, and the people you love.'),
    compassPriorities: priorityLabels(compassRes.data?.priorities_json),
    workspaceRole: workspace.role,
    currentUserId: workspace.userId,
    collaborationEnabled: Boolean(process.env.LIVEBLOCKS_SECRET_KEY && process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY),
  };
}
