'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Copy,
  Download,
  Edit3,
  FileCheck2,
  GripVertical,
  Lightbulb,
  MessageCircle,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Users,
  Utensils,
  XCircle,
} from 'lucide-react';
import { can } from '@/lib/auth/permissions';
import { track } from '@/lib/analytics';
import { combineConflictValues, mergeConflict } from '@/lib/collaboration/merge-conflict';
import { ObjectComments } from '@/components/collaboration/ObjectComments';
import { ObjectPresence } from '@/components/collaboration/ObjectPresence';
import {
  Button,
  Chip,
  Dialog,
  Drawer,
  Field,
  Input,
  SaveState,
  Textarea,
  type SyncStatus,
} from '@/design-system';
import {
  briefReady,
  coverageForRequirement,
  hospitalityScore,
  type AssessmentInput,
  type Coverage,
} from '@/lib/feast/hospitality';
import {
  buildCatererBriefSnapshot,
  catererBriefSourceHash,
  changedBriefSections,
} from '@/lib/feast/brief';
import {
  deleteFeastDraft,
  getFeastDrafts,
  putFeastDraft,
} from '@/lib/feast/offline-drafts';
import type {
  CatererBriefSnapshot,
  DishAssessment,
  FeastDish,
  FeastPlan,
  FeastStudioSnapshot,
  GuestRequirement,
  MealScene,
} from '@/lib/feast/types';
import {
  archiveScene,
  createBriefVersion,
  createDish,
  createRequirement,
  createScene,
  deleteRequirement,
  duplicateScene,
  recordEvidence,
  reorderScenes,
  restoreScene,
  saveAssessment,
  saveDish,
  saveFeastPlan,
  saveRequirement,
  saveScene,
  type DishPatch,
  type FeastPlanPatch,
  type RequirementPatch,
  type ScenePatch,
} from './actions';

export type FeastView =
  | 'overview'
  | 'flow'
  | 'scene'
  | 'guests'
  | 'requirements'
  | 'presentation'
  | 'brief';

interface Props {
  initial: FeastStudioSnapshot;
  initialView: FeastView;
  initialSceneId?: string;
}

type PlanDraft = {
  intention: string;
  meal_shape: string;
  service_feeling: string;
  emotional_root: string;
  hospitality_standard: string;
  guest_count: number;
  advisory_budget_total_cents: number | null;
  advisory_budget_per_guest_cents: number | null;
  status: string;
};

type ConflictPayload = {
  base: Record<string, unknown>;
  mine: Record<string, unknown>;
  theirs: Record<string, unknown>;
  currentVersion: number;
};

const FEAST_NAV: Array<{ href: string; label: string; view: FeastView }> = [
  { href: '/canvas/feast', label: 'Overview', view: 'overview' },
  { href: '/canvas/feast/flow', label: 'Flow', view: 'flow' },
  { href: '/canvas/feast/guests', label: 'Guests', view: 'guests' },
  { href: '/canvas/feast/requirements', label: 'Requirements', view: 'requirements' },
  { href: '/canvas/feast/presentation', label: 'Presentation', view: 'presentation' },
  { href: '/canvas/feast/brief', label: 'Brief', view: 'brief' },
];

const MEAL_SHAPES = [
  ['family_style', 'Family style'],
  ['plated', 'Plated dinner'],
  ['stations', 'Stations and grazing'],
  ['cocktail', 'Cocktail reception'],
  ['brunch', 'Brunch'],
  ['intimate', 'Intimate dinner'],
] as const;

const SERVICE_FEELINGS = ['Warm and generous', 'Refined and paced', 'Abundant and communal', 'Relaxed and playful'];
const EMOTIONAL_ROOTS = ['Food that honors family', 'A journey through our cultures', 'Seasonal and place-rooted', 'Comfort with a little surprise'];
const HOSPITALITY_STANDARDS = [
  ['simple', 'Simple care'],
  ['thoughtful', 'Thoughtful care'],
  ['every', 'Every guest considered'],
] as const;

const COVERAGE_META: Record<Coverage, { label: string; tone: 'neutral' | 'gold' | 'sage' | 'clay'; icon: React.ReactNode }> = {
  unknown: { label: 'Unknown', tone: 'neutral', icon: <CircleHelp className="h-3.5 w-3.5" /> },
  needs_review: { label: 'Needs review', tone: 'gold', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  compatible: { label: 'Ingredient compatible', tone: 'sage', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  confirmed: { label: 'Confirmed with evidence', tone: 'sage', icon: <FileCheck2 className="h-3.5 w-3.5" /> },
  conflict: { label: 'Conflict', tone: 'clay', icon: <XCircle className="h-3.5 w-3.5" /> },
};

function planDraft(plan: FeastPlan): PlanDraft {
  return {
    intention: plan.intention,
    meal_shape: plan.meal_shape,
    service_feeling: plan.service_feeling,
    emotional_root: plan.emotional_root,
    hospitality_standard: plan.hospitality_standard,
    guest_count: plan.guest_count,
    advisory_budget_total_cents: plan.advisory_budget_total_cents,
    advisory_budget_per_guest_cents: plan.advisory_budget_per_guest_cents,
    status: plan.status,
  };
}

function sceneDraft(scene: MealScene): Record<string, unknown> {
  return {
    title: scene.title,
    purpose: scene.purpose,
    planned_at: scene.planned_at,
    duration_minutes: scene.duration_minutes,
    service_style: scene.service_style,
    mood: scene.mood,
    notes: scene.notes,
    status: scene.status,
  };
}

function dishDraft(dish: FeastDish): DishPatch {
  return {
    name: dish.name,
    role: dish.role,
    ingredients_json: dish.ingredients_json,
    story: dish.story,
    presentation: dish.presentation,
    execution_notes: dish.execution_notes,
    service_style: dish.service_style,
    mood: dish.mood,
    advisory_cost_min_cents: dish.advisory_cost_min_cents,
    advisory_cost_max_cents: dish.advisory_cost_max_cents,
    status: dish.status,
    source: dish.source,
  };
}

function pretty(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(cents: number | null | undefined, currency = 'USD'): string {
  if (cents == null) return 'Not set';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function requirementCoverage(
  requirement: GuestRequirement,
  assessments: DishAssessment[],
  evidenceIds: Set<string>,
  dishIds?: Set<string>,
): Coverage {
  const inputs: AssessmentInput[] = assessments
    .filter((assessment) => assessment.requirement_code === requirement.code && (!dishIds || dishIds.has(assessment.dish_id)))
    .map((assessment) => ({
      state: assessment.state,
      hasEvidence: assessment.evidence_id ? evidenceIds.has(assessment.evidence_id) : false,
    }));
  return coverageForRequirement(
    {
      code: requirement.code,
      category: requirement.category,
      severity: requirement.severity,
    },
    inputs,
  );
}

function hospitalityItems(
  requirements: GuestRequirement[],
  assessments: DishAssessment[],
  evidenceIds: Set<string>,
) {
  return requirements.map((requirement) => ({
    requirement: {
      code: requirement.code,
      category: requirement.category,
      severity: requirement.severity,
    },
    assessments: assessments
      .filter((assessment) => assessment.requirement_code === requirement.code)
      .map((assessment) => ({
        state: assessment.state,
        hasEvidence: assessment.evidence_id ? evidenceIds.has(assessment.evidence_id) : false,
      })),
  }));
}

function currentPlan(plan: FeastPlan, draft: PlanDraft): FeastPlan {
  return { ...plan, ...draft, status: draft.status as FeastPlan['status'] };
}

export function FeastStudio({ initial, initialView, initialSceneId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const canEdit = can(initial.workspaceRole, 'plan.full');
  const [plan, setPlan] = React.useState(initial.plan);
  const [planValues, setPlanValues] = React.useState<PlanDraft>(() => planDraft(initial.plan));
  const planValuesRef = React.useRef(planDraft(initial.plan));
  const planBaseRef = React.useRef<Record<string, unknown>>(planDraft(initial.plan));
  const planVersionRef = React.useRef(initial.plan.version);
  const planTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = React.useState<SyncStatus>('idle');
  const [planConflict, setPlanConflict] = React.useState<ConflictPayload | null>(null);
  const [scenes, setScenes] = React.useState(initial.scenes);
  const [dishes, setDishes] = React.useState(initial.dishes);
  const [requirements, setRequirements] = React.useState(initial.requirements);
  const [evidence, setEvidence] = React.useState(initial.evidence);
  const [assessments, setAssessments] = React.useState(initial.assessments);
  const [briefs, setBriefs] = React.useState(initial.briefs);
  const activeScenes = React.useMemo(
    () => scenes.filter((scene) => scene.status !== 'archived').sort((left, right) => left.ordinal - right.ordinal),
    [scenes],
  );
  const [activeSceneId, setActiveSceneId] = React.useState(
    initialSceneId && initial.scenes.some((scene) => scene.id === initialSceneId)
      ? initialSceneId
      : initial.scenes.find((scene) => scene.status !== 'archived')?.id ?? '',
  );
  const activeScene = activeScenes.find((scene) => scene.id === activeSceneId) ?? activeScenes[0];
  const [insightsOpen, setInsightsOpen] = React.useState(false);
  const [dishEditor, setDishEditor] = React.useState<{ sceneId: string; dish?: FeastDish } | null>(null);
  const [evidenceTarget, setEvidenceTarget] = React.useState<{ dish: FeastDish; requirement: GuestRequirement } | null>(null);
  const [requirementEditor, setRequirementEditor] = React.useState<GuestRequirement | 'new' | null>(null);
  const [sceneEditor, setSceneEditor] = React.useState<MealScene | 'new' | null>(null);
  const [undoScene, setUndoScene] = React.useState<MealScene | null>(null);
  const [actionError, setActionError] = React.useState('');
  const evidenceIds = React.useMemo(() => new Set(evidence.map((item) => item.id)), [evidence]);
  const scoreItems = React.useMemo(
    () => hospitalityItems(requirements, assessments, evidenceIds),
    [requirements, assessments, evidenceIds],
  );
  const hospitality = React.useMemo(() => hospitalityScore(scoreItems), [scoreItems]);
  const readyForBrief = React.useMemo(() => briefReady(scoreItems), [scoreItems]);
  const source = React.useMemo(() => ({
    plan: currentPlan(plan, planValues),
    scenes,
    dishes,
    requirements,
    evidence,
    assessments,
  }), [plan, planValues, scenes, dishes, requirements, evidence, assessments]);
  const currentBrief = React.useMemo(() => buildCatererBriefSnapshot(source), [source]);
  const latestBrief = briefs[0];
  const changedSections = React.useMemo(
    () => changedBriefSections(currentBrief, latestBrief?.snapshot_json),
    [currentBrief, latestBrief],
  );
  const updateAvailable = Boolean(
    latestBrief && catererBriefSourceHash(currentBrief) !== catererBriefSourceHash(latestBrief.snapshot_json),
  );

  React.useEffect(() => {
    setScenes(initial.scenes);
    setDishes(initial.dishes);
    setRequirements(initial.requirements);
    setEvidence(initial.evidence);
    setAssessments(initial.assessments);
    setBriefs(initial.briefs);
  }, [initial.scenes, initial.dishes, initial.requirements, initial.evidence, initial.assessments, initial.briefs]);

  React.useEffect(() => {
    track('feast_started', {
      source: initialView === 'overview' ? 'canvas' : 'direct',
      template: initial.plan.meal_shape,
      compassComplete: Boolean(initial.compassSummary),
    });
  }, []);

  React.useEffect(() => {
    if (initialView === 'scene' && activeScene) {
      track('scene_opened', { sceneType: activeScene.kind, completionState: activeScene.status });
    }
  }, [initialView, activeScene?.id]);

  const commitPlan = React.useCallback(async (
    next: PlanDraft,
    force = false,
    forcedVersion?: number,
  ) => {
    const draftId = `plan:${initial.plan.workspace_id}`;
    const expectedVersion = forcedVersion ?? planVersionRef.current;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSaveState('local');
      return;
    }
    setSaveState('saving');
    try {
      const result = await saveFeastPlan({
        patch: next as FeastPlanPatch,
        expectedVersion,
        base: planBaseRef.current,
        force,
      });
      if (!result.ok) {
        setPlanConflict(result.conflict);
        setSaveState('conflict');
        return;
      }
      planVersionRef.current = result.version;
      planBaseRef.current = { ...next };
      setPlan((current) => ({ ...current, ...next, status: next.status as FeastPlan['status'], version: result.version }));
      await deleteFeastDraft(draftId).catch(() => {});
      setSaveState('saved');
    } catch {
      setSaveState('error');
      const currentDrafts = await getFeastDrafts(initial.plan.workspace_id).catch(() => []);
      const existing = currentDrafts.find((draft) => draft.id === draftId);
      await putFeastDraft({
        id: draftId,
        workspaceId: initial.plan.workspace_id,
        objectType: 'plan',
        objectId: initial.plan.workspace_id,
        baseVersion: expectedVersion,
        changes: next as unknown as Record<string, unknown>,
        timestamp: Date.now(),
        retryCount: (existing?.retryCount ?? 0) + 1,
      }).catch(() => {});
    }
  }, [initial.plan.workspace_id]);

  const updatePlan = React.useCallback((patch: Partial<PlanDraft>, immediate = false) => {
    const next = { ...planValuesRef.current, ...patch };
    planValuesRef.current = next;
    setPlanValues(next);
    const draftId = `plan:${initial.plan.workspace_id}`;
    void putFeastDraft({
      id: draftId,
      workspaceId: initial.plan.workspace_id,
      objectType: 'plan',
      objectId: initial.plan.workspace_id,
      baseVersion: planVersionRef.current,
      changes: next as unknown as Record<string, unknown>,
      timestamp: Date.now(),
      retryCount: 0,
    }).then(() => setSaveState('local')).catch(() => setSaveState('error'));
    if (planTimerRef.current) clearTimeout(planTimerRef.current);
    if (immediate) void commitPlan(next);
    else planTimerRef.current = setTimeout(() => void commitPlan(next), 600);
  }, [commitPlan, initial.plan.workspace_id]);

  React.useEffect(() => {
    const draftId = `plan:${initial.plan.workspace_id}`;
    void getFeastDrafts(initial.plan.workspace_id).then((drafts) => {
      const local = drafts.find((draft) => draft.id === draftId);
      if (!local) return;
      const restored = { ...planValuesRef.current, ...local.changes } as PlanDraft;
      planValuesRef.current = restored;
      setPlanValues(restored);
      setSaveState(local.retryCount ? 'error' : 'local');
      if (navigator.onLine && local.retryCount) void commitPlan(restored, false, local.baseVersion);
    }).catch(() => {});
    const sync = () => {
      void getFeastDrafts(initial.plan.workspace_id).then((drafts) => {
        const local = drafts.find((draft) => draft.id === draftId);
        if (local) void commitPlan(local.changes as PlanDraft, false, local.baseVersion);
      });
    };
    window.addEventListener('online', sync);
    return () => {
      window.removeEventListener('online', sync);
      if (planTimerRef.current) clearTimeout(planTimerRef.current);
    };
  }, [commitPlan, initial.plan.workspace_id]);

  async function handleReorder(ids: string[]) {
    const ordered = ids
      .map((id) => activeScenes.find((scene) => scene.id === id))
      .filter((scene): scene is MealScene => Boolean(scene));
    const previous = scenes;
    setScenes((current) => current.map((scene) => {
      const ordinal = ids.indexOf(scene.id);
      return ordinal >= 0 ? { ...scene, ordinal } : scene;
    }));
    setSaveState('saving');
    try {
      const result = await reorderScenes(ordered.map((scene) => ({ id: scene.id, version: scene.version })));
      if (!result.ok) {
        setScenes(previous);
        setSaveState('conflict');
        setActionError('The scene order changed elsewhere. Refresh before reordering again.');
        return;
      }
      setScenes((current) => current.map((scene) => result.versions[scene.id]
        ? { ...scene, version: result.versions[scene.id] }
        : scene));
      setSaveState('saved');
    } catch {
      setScenes(previous);
      setSaveState('error');
      setActionError('The new scene order could not be saved. Your prior order is still intact.');
    }
  }

  async function handleArchive(scene: MealScene) {
    setScenes((current) => current.map((item) => item.id === scene.id ? { ...item, status: 'archived', version: item.version + 1 } : item));
    setUndoScene({ ...scene, version: scene.version + 1 });
    setSaveState('saving');
    try {
      await archiveScene(scene.id, scene.version);
      setSaveState('saved');
      setTimeout(() => setUndoScene((current) => current?.id === scene.id ? null : current), 10_000);
    } catch {
      setScenes((current) => current.map((item) => item.id === scene.id ? scene : item));
      setUndoScene(null);
      setSaveState('error');
    }
  }

  async function handleUndoArchive() {
    if (!undoScene) return;
    const scene = undoScene;
    setUndoScene(null);
    setSaveState('saving');
    try {
      await restoreScene(scene.id, scene.version);
      setScenes((current) => current.map((item) => item.id === scene.id
        ? { ...item, status: 'in_progress', version: scene.version + 1 }
        : item));
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }

  function openScene(sceneId: string) {
    setActiveSceneId(sceneId);
    router.push(`/canvas/feast/scenes/${sceneId}`);
  }

  const nextAction = hospitality.conflicts.length
    ? { label: `Resolve ${hospitality.conflicts.length} guest-care conflict${hospitality.conflicts.length === 1 ? '' : 's'}`, href: '/canvas/feast/requirements' }
    : hospitality.openConfirmations.length
      ? { label: `Record ${hospitality.openConfirmations.length} open confirmation${hospitality.openConfirmations.length === 1 ? '' : 's'}`, href: '/canvas/feast/requirements' }
      : activeScene
        ? { label: `Continue ${activeScene.title}`, href: `/canvas/feast/scenes/${activeScene.id}` }
        : { label: 'Create the meal flow', href: '/canvas/feast/flow' };

  const peacePanel = (
    <PeacePanel
      plan={currentPlan(plan, planValues)}
      hospitality={hospitality}
      ready={readyForBrief}
      scenes={activeScenes}
      dishes={dishes}
      nextAction={nextAction}
      updateAvailable={updateAvailable}
    />
  );

  return (
    <div
      className="feast-studio -mx-6 -my-6 min-h-screen min-w-0 overflow-x-clip bg-[#F7F4EE] text-[#201C18] md:-mx-10"
      data-feast-view={initialView}
    >
      <style>{`
        .feast-hero-art{position:absolute!important;inset:0;pointer-events:none}
        .feast-focus:focus-visible{outline:2px solid #201C18;outline-offset:3px}
        .feast-card{background:#FFFDFC;border:1px solid rgba(32,28,24,.14);border-radius:16px}
        .feast-touch{min-height:44px;min-width:44px}
        @media(prefers-reduced-motion:reduce){.feast-studio *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
        @media(max-width:767px){.feast-studio input,.feast-studio select,.feast-studio textarea{font-size:16px}}
      `}</style>

      <header className="sticky top-[57px] z-30 border-b border-[rgba(32,28,24,.14)] bg-[#FFFDFC]/95 backdrop-blur md:top-0">
        <div className="flex min-h-14 items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/canvas" aria-label="Back to Living Canvas" className="feast-focus grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-[#F7F4EE]">
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-[#201C18]">Feast Studio</p>
              <p className="truncate text-[11px] text-[#6D645B]">{initial.projectName}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden sm:block">
              <ObjectPresence objectType="feast" objectId={initial.plan.workspace_id} enabled={initial.collaborationEnabled} />
            </div>
            <SaveState status={saveState} savedHint="to the shared Feast Plan" />
            <Button size="sm" variant="gold" onClick={() => setInsightsOpen(true)} className="xl:hidden">
              Insights
            </Button>
          </div>
        </div>
        <nav aria-label="Feast Studio" className="overflow-x-auto border-t border-[rgba(32,28,24,.08)] px-3">
          <div className="mx-auto flex min-w-max items-center gap-1 md:min-w-0 md:justify-center">
            {activeScene && (
              <Link
                href={`/canvas/feast/scenes/${activeScene.id}`}
                aria-current={initialView === 'scene' ? 'page' : undefined}
                className={`feast-focus flex min-h-11 items-center rounded-[9px] px-3 text-[13px] font-medium md:hidden ${
                  initialView === 'scene' ? 'bg-[#F4EBDD] text-[#6C4712]' : 'text-[#6D645B] hover:bg-[#F7F4EE] hover:text-[#201C18]'
                }`}
              >
                Dishes
              </Link>
            )}
            {FEAST_NAV.map((item) => {
              const active = initialView === item.view || (item.view === 'flow' && initialView === 'scene');
              const mobileVisible = item.view === 'flow' || item.view === 'guests' || item.view === 'brief';
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`feast-focus min-h-11 items-center rounded-[9px] px-3 text-[13px] font-medium ${
                    mobileVisible ? 'flex' : 'hidden md:flex'
                  } ${
                    active ? 'bg-[#F4EBDD] text-[#6C4712]' : 'text-[#6D645B] hover:bg-[#F7F4EE] hover:text-[#201C18]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {actionError && (
        <div role="alert" className="mx-auto mt-4 flex max-w-4xl items-start justify-between gap-3 rounded-[12px] border border-[#C88B82] bg-[#F5E4DF] px-4 py-3 text-sm text-[#7B2E28]">
          <span>{actionError}</span>
          <button type="button" className="feast-focus rounded p-1" aria-label="Dismiss error" onClick={() => setActionError('')}>
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {initialView === 'overview' && (
        <Overview
          plan={planValues}
          onPlanChange={updatePlan}
          compassSummary={initial.compassSummary}
          compassPriorities={initial.compassPriorities}
          hospitality={hospitality}
          scenes={activeScenes}
          dishes={dishes}
          readyForBrief={readyForBrief}
          nextAction={nextAction}
        />
      )}

      {initialView === 'flow' && (
        <div className="mx-auto grid w-full max-w-[1520px] min-w-0 gap-5 px-4 py-5 xl:grid-cols-[minmax(0,1fr)_340px] md:px-6">
          <section aria-labelledby="flow-title" className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[12px] uppercase tracking-[0.16em] text-[#7A531A]">The complete meal journey</p>
                <h1 id="flow-title" className="voice text-[clamp(34px,5vw,52px)] leading-none">Feast Map</h1>
                <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#6D645B]">Create, order, and open every scene. Pointer drag is optional; every move has a keyboard button.</p>
              </div>
              {canEdit && <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setSceneEditor('new')}>Add scene</Button>}
            </div>
            <FeastMap
              scenes={activeScenes}
              dishes={dishes}
              requirements={requirements}
              assessments={assessments}
              evidenceIds={evidenceIds}
              activeId={activeScene?.id}
              canEdit={canEdit}
              expanded
              onOpen={openScene}
              onReorder={handleReorder}
              onEdit={(scene) => setSceneEditor(scene)}
              onDuplicate={async (scene) => {
                setSaveState('saving');
                try {
                  const copy = await duplicateScene(scene.id);
                  setSaveState('saved');
                  router.push(`/canvas/feast/scenes/${copy.id}`);
                } catch {
                  setSaveState('error');
                }
              }}
              onArchive={handleArchive}
            />
          </section>
          <aside className="hidden xl:block">{peacePanel}</aside>
        </div>
      )}

      {initialView === 'scene' && activeScene && (
        <div className="mx-auto grid w-full max-w-[1520px] min-w-0 md:grid-cols-[224px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(560px,1fr)_340px]">
          <aside className="hidden min-w-0 border-r border-[rgba(32,28,24,.14)] bg-[#FBF8F2] p-4 md:block">
            <div className="sticky top-[118px]">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7A531A]">Feast Map</p>
                {canEdit && (
                  <button type="button" className="feast-focus grid h-11 w-11 place-items-center rounded-full hover:bg-white" aria-label="Add a meal scene" onClick={() => setSceneEditor('new')}>
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
              <FeastMap
                scenes={activeScenes}
                dishes={dishes}
                requirements={requirements}
                assessments={assessments}
                evidenceIds={evidenceIds}
                activeId={activeScene.id}
                canEdit={canEdit}
                onOpen={openScene}
                onReorder={handleReorder}
                onEdit={(scene) => setSceneEditor(scene)}
                onDuplicate={async (scene) => {
                  const copy = await duplicateScene(scene.id);
                  router.push(`/canvas/feast/scenes/${copy.id}`);
                }}
                onArchive={handleArchive}
              />
            </div>
          </aside>
          <main className="min-w-0 px-4 pb-28 pt-5 md:px-6 md:pb-8">
            <TastingCanvas
              scene={activeScene}
              dishes={dishes.filter((dish) => dish.scene_id === activeScene.id)}
              requirements={requirements}
              assessments={assessments}
              evidence={evidence}
              canEdit={canEdit}
              collaborationEnabled={initial.collaborationEnabled}
              comments={initial.comments}
              currentUserId={initial.currentUserId}
              onEditScene={() => setSceneEditor(activeScene)}
              onAddDish={() => setDishEditor({ sceneId: activeScene.id })}
              onEditDish={(dish) => setDishEditor({ sceneId: activeScene.id, dish })}
              onAssessment={async (dish, requirement, state) => {
                setSaveState('saving');
                try {
                  await saveAssessment({
                    dishId: dish.id,
                    requirementCode: requirement.code,
                    state,
                    reasoning: state === 'ingredient_compatible'
                      ? 'Ingredients were reviewed; sourcing and preparation are not yet confirmed.'
                      : state === 'conflict'
                        ? 'A known incompatibility needs a different dish or protocol.'
                        : 'Assessment returned to unknown.',
                  });
                  setAssessments((current) => {
                    const next = current.filter((item) => !(item.dish_id === dish.id && item.requirement_code === requirement.code));
                    return [...next, {
                      id: `local-${dish.id}-${requirement.code}`,
                      workspace_id: dish.workspace_id,
                      dish_id: dish.id,
                      requirement_code: requirement.code,
                      state,
                      reasoning: '',
                      evidence_id: null,
                      assessed_by: initial.workspaceRole === 'planner' ? 'planner' : 'partner',
                      assessed_at: new Date().toISOString(),
                    }];
                  });
                  setSaveState('saved');
                } catch {
                  setSaveState('error');
                }
              }}
              onEvidence={(dish, requirement) => setEvidenceTarget({ dish, requirement })}
            />
          </main>
          <aside className="hidden min-w-0 border-l border-[rgba(32,28,24,.14)] bg-[#FBF8F2] p-4 xl:block">
            <div className="sticky top-[118px]">{peacePanel}</div>
          </aside>
        </div>
      )}

      {initialView === 'guests' && (
        <GuestCareView
          guests={initial.guests}
          requirements={requirements}
          dishes={dishes}
          assessments={assessments}
          evidenceIds={evidenceIds}
          onResolve={(dish, requirement) => setEvidenceTarget({ dish, requirement })}
        />
      )}

      {initialView === 'requirements' && (
        <RequirementsView
          guests={initial.guests}
          requirements={requirements}
          assessments={assessments}
          evidenceIds={evidenceIds}
          canEdit={canEdit}
          comments={initial.comments}
          currentUserId={initial.currentUserId}
          onAdd={() => setRequirementEditor('new')}
          onEdit={setRequirementEditor}
          onDelete={async (requirement) => {
            if (!window.confirm(`Remove ${pretty(requirement.code)} from Feast guest care?`)) return;
            try {
              await deleteRequirement(requirement.id);
              setRequirements((current) => current.filter((item) => item.id !== requirement.id));
            } catch {
              setActionError('The requirement could not be removed.');
            }
          }}
        />
      )}

      {initialView === 'presentation' && (
        <PresentationView plan={planValues} onChange={updatePlan} />
      )}

      {initialView === 'brief' && (
        <BriefView
          snapshot={currentBrief}
          objectId={initial.plan.workspace_id}
          latest={latestBrief}
          briefs={briefs}
          ready={readyForBrief}
          updateAvailable={updateAvailable}
          changedSections={changedSections}
          canEdit={canEdit}
          comments={initial.comments}
          currentUserId={initial.currentUserId}
          onCreate={async () => {
            setSaveState('saving');
            try {
              const created = await createBriefVersion();
              setSaveState('saved');
              router.refresh();
              return created;
            } catch (error) {
              setSaveState('error');
              setActionError(error instanceof Error ? error.message : 'The brief version could not be created.');
              return null;
            }
          }}
        />
      )}

      <Drawer open={insightsOpen} onClose={() => setInsightsOpen(false)} side="right" title="Feast insights" widthClassName="w-full max-w-[390px]">
        {peacePanel}
      </Drawer>

      {dishEditor && (
        <DishEditor
          workspaceId={initial.plan.workspace_id}
          sceneId={dishEditor.sceneId}
          dish={dishEditor.dish}
          scenes={activeScenes}
          requirements={requirements}
          collaborationEnabled={initial.collaborationEnabled}
          onClose={() => setDishEditor(null)}
          onSaved={() => {
            setDishEditor(null);
            router.refresh();
          }}
        />
      )}

      <EvidenceDialog
        target={evidenceTarget}
        onClose={() => setEvidenceTarget(null)}
        onSaved={() => {
          setEvidenceTarget(null);
          router.refresh();
        }}
      />

      <RequirementDialog
        value={requirementEditor}
        guests={initial.guests}
        onClose={() => setRequirementEditor(null)}
        onSaved={() => {
          setRequirementEditor(null);
          router.refresh();
        }}
      />

      <SceneDialog
        value={sceneEditor}
        onClose={() => setSceneEditor(null)}
        onSaved={(sceneId) => {
          setSceneEditor(null);
          router.push(`/canvas/feast/scenes/${sceneId}`);
        }}
      />

      <ConflictDialog
        conflict={planConflict}
        title="The Feast plan changed elsewhere"
        onClose={() => setPlanConflict(null)}
        onResolve={async (resolved) => {
          if (!planConflict) return;
          const next = resolved as unknown as PlanDraft;
          planValuesRef.current = next;
          setPlanValues(next);
          await commitPlan(next, true, planConflict.currentVersion);
          setPlanConflict(null);
          track('sync_conflict_encountered', { objectType: 'feast_plan', resolution: 'field_merge' });
        }}
      />

      {undoScene && (
        <div role="status" className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex w-[min(92vw,460px)] -translate-x-1/2 items-center justify-between gap-3 rounded-[14px] bg-[#201C18] px-4 py-3 text-sm text-[#FFFDFC] shadow-xl">
          <span>{undoScene.title} archived.</span>
          <Button size="sm" variant="gold" leadingIcon={<RotateCcw className="h-4 w-4" />} onClick={handleUndoArchive}>Undo</Button>
        </div>
      )}
    </div>
  );
}

function Overview({
  plan,
  onPlanChange,
  compassSummary,
  compassPriorities,
  hospitality,
  scenes,
  dishes,
  readyForBrief,
  nextAction,
}: {
  plan: PlanDraft;
  onPlanChange: (patch: Partial<PlanDraft>, immediate?: boolean) => void;
  compassSummary: string;
  compassPriorities: string[];
  hospitality: ReturnType<typeof hospitalityScore>;
  scenes: MealScene[];
  dishes: FeastDish[];
  readyForBrief: boolean;
  nextAction: { label: string; href: string };
}) {
  const completeScenes = scenes.filter((scene) => scene.status === 'ready').length;
  return (
    <main className="mx-auto w-full max-w-[1420px] min-w-0 px-4 py-5 md:px-6">
      <section className="feast-card relative isolate min-h-[220px] overflow-hidden p-5 md:grid md:min-h-[320px] md:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)] md:gap-6 md:p-7" aria-labelledby="feast-title">
        <div className="feast-hero-art -z-10 bg-[radial-gradient(circle_at_90%_10%,rgba(242,177,52,.18),transparent_30%),linear-gradient(135deg,#FFFDFC_0%,#F7F0E3_100%)]" data-testid="feast-hero-art" aria-hidden />
        <div className="min-w-0">
          <p className="text-[12px] uppercase tracking-[0.18em] text-[#7A531A]">Turn the Compass into a meal</p>
          <h1 id="feast-title" className="voice mt-2 max-w-3xl text-[clamp(38px,6vw,58px)] font-semibold leading-[.96]">
            Build a meal every guest can enter.
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[#6D645B]">{compassSummary}</p>
          <div className="mt-4 max-w-2xl">
            <Field label="Meal intention" hint="Saved after 600ms. This private text stays inside the workspace.">
              {(props) => (
                <Input
                  {...props}
                  value={plan.intention}
                  onChange={(event) => onPlanChange({ intention: event.target.value })}
                  onBlur={() => onPlanChange({ intention: plan.intention }, true)}
                  placeholder="What should the day taste like?"
                />
              )}
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {MEAL_SHAPES.slice(0, 3).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={plan.meal_shape === value}
                onClick={() => onPlanChange({ meal_shape: value }, true)}
                className={`feast-focus min-h-11 rounded-full border px-4 text-sm font-medium ${
                  plan.meal_shape === value ? 'border-[#A8782A] bg-[#F4EBDD] text-[#6C4712]' : 'border-[rgba(32,28,24,.14)] bg-[#FFFDFC] text-[#5A5349]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Link href={nextAction.href} className="feast-focus mt-5 inline-flex min-h-12 items-center gap-2 rounded-[12px] bg-[#201C18] px-5 text-sm font-semibold text-[#FFFDFC]">
            {nextAction.label} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <aside className="mt-5 rounded-[14px] border border-[rgba(32,28,24,.14)] bg-[#FFFDFC]/90 p-4 md:mt-0" aria-label="Feast Compass">
          <p className="text-[12px] uppercase tracking-[0.16em] text-[#7A531A]">Feast Compass</p>
          <dl className="mt-3 space-y-3">
            <SummaryRow label="Meal shape" value={pretty(plan.meal_shape)} />
            <SummaryRow label="Guest care" value={`${Math.round(hospitality.score * 100)}% hospitality`} />
            <SummaryRow label="Complexity" value={plan.meal_shape === 'plated' ? 'Higher service coordination' : 'Shared service coordination'} />
            <SummaryRow label="Next" value={nextAction.label} />
          </dl>
          {compassPriorities.length > 0 && (
            <div className="mt-4 border-t border-[rgba(32,28,24,.12)] pt-3">
              <p className="text-xs font-semibold text-[#201C18]">Dream Drawer</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {compassPriorities.map((priority) => <Chip key={priority} tone="gold">{pretty(priority)}</Chip>)}
              </div>
            </div>
          )}
        </aside>
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <article className="feast-card p-5 lg:order-1">
          <p className="text-[12px] uppercase tracking-[0.14em] text-[#7A531A]">Next action</p>
          <h2 className="voice mt-2 text-2xl">{nextAction.label}</h2>
          <p className="mt-2 text-sm leading-6 text-[#6D645B]">The recommendation comes from the current meal flow and evidence-backed guest-care gaps.</p>
          <Link href={nextAction.href} className="feast-focus mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#A8782A] px-4 text-sm font-semibold text-[#6C4712]">
            Continue <ChevronRight className="h-4 w-4" />
          </Link>
        </article>
        <article className="feast-card p-5 lg:order-2">
          <p className="text-[12px] uppercase tracking-[0.14em] text-[#7A531A]">Feast readiness</p>
          <div className="mt-2 flex items-end gap-3">
            <span className="voice text-4xl">{Math.round(hospitality.score * 100)}%</span>
            <Chip tone={readyForBrief ? 'sage' : hospitality.conflicts.length ? 'clay' : 'gold'}>
              {readyForBrief ? 'Ready for brief' : hospitality.conflicts.length ? 'Conflicts open' : 'Confirmations open'}
            </Chip>
          </div>
          <p className="mt-3 text-sm text-[#6D645B]">{completeScenes} of {scenes.length} scenes ready · {dishes.length} dishes in the plan.</p>
          <Link href="/canvas/feast/requirements" className="feast-focus mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#6C4712]">Review guest care <ChevronRight className="ml-1 h-4 w-4" /></Link>
        </article>
        <article className="feast-card p-5 lg:order-3">
          <p className="text-[12px] uppercase tracking-[0.14em] text-[#7A531A]">Meal flow</p>
          <ol className="mt-3 space-y-2">
            {scenes.slice(0, 4).map((scene, index) => (
              <li key={scene.id} className="flex items-center gap-3 text-sm">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#F4EBDD] text-xs font-semibold text-[#6C4712]">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate">{scene.title}</span>
                <span className="text-xs text-[#6D645B]">{dishes.filter((dish) => dish.scene_id === scene.id).length} dishes</span>
              </li>
            ))}
          </ol>
          <Link href="/canvas/feast/flow" className="feast-focus mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#6C4712]">Open all {scenes.length} scenes <ChevronRight className="ml-1 h-4 w-4" /></Link>
        </article>
      </div>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[rgba(32,28,24,.08)] pb-2 last:border-0">
      <dt className="text-sm text-[#6D645B]">{label}</dt>
      <dd className="max-w-[58%] text-right text-sm font-semibold text-[#201C18]">{value}</dd>
    </div>
  );
}

function FeastMap({
  scenes,
  dishes,
  requirements,
  assessments,
  evidenceIds,
  activeId,
  canEdit,
  expanded = false,
  onOpen,
  onReorder,
  onEdit,
  onDuplicate,
  onArchive,
}: {
  scenes: MealScene[];
  dishes: FeastDish[];
  requirements: GuestRequirement[];
  assessments: DishAssessment[];
  evidenceIds: Set<string>;
  activeId?: string;
  canEdit: boolean;
  expanded?: boolean;
  onOpen: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onEdit: (scene: MealScene) => void;
  onDuplicate: (scene: MealScene) => void;
  onArchive: (scene: MealScene) => void;
}) {
  const [dragId, setDragId] = React.useState<string | null>(null);
  function move(id: string, delta: number) {
    const index = scenes.findIndex((scene) => scene.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= scenes.length) return;
    const next = scenes.map((scene) => scene.id);
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next);
  }
  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const next = scenes.map((scene) => scene.id).filter((id) => id !== dragId);
    const targetIndex = next.indexOf(targetId);
    next.splice(targetIndex, 0, dragId);
    onReorder(next);
    setDragId(null);
  }
  return (
    <ol className={expanded ? 'grid gap-3 md:grid-cols-2' : 'space-y-2'} aria-label="Meal scenes">
      {scenes.map((scene, index) => {
        const sceneDishes = dishes.filter((dish) => dish.scene_id === scene.id);
        const dishIds = new Set(sceneDishes.map((dish) => dish.id));
        const coverages = requirements.map((requirement) => requirementCoverage(requirement, assessments, evidenceIds, dishIds));
        const conflictCount = coverages.filter((coverage) => coverage === 'conflict').length;
        const reviewCount = coverages.filter((coverage) => coverage === 'unknown' || coverage === 'needs_review').length;
        const min = sceneDishes.reduce((sum, dish) => sum + Number(dish.advisory_cost_min_cents ?? 0), 0);
        const max = sceneDishes.reduce((sum, dish) => sum + Number(dish.advisory_cost_max_cents ?? 0), 0);
        const status = conflictCount ? 'Conflict' : reviewCount ? 'Needs confirmation' : sceneDishes.length ? 'Ready for brief' : 'Empty';
        return (
          <li
            key={scene.id}
            draggable={canEdit}
            onDragStart={() => setDragId(scene.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dropOn(scene.id)}
            className={`feast-card min-w-0 ${activeId === scene.id ? 'border-[#A8782A] ring-1 ring-[#A8782A]' : ''} ${dragId === scene.id ? 'opacity-60' : ''}`}
          >
            <div className="flex min-w-0 items-stretch">
              {canEdit && (
                <button type="button" aria-label={`Drag ${scene.title} to reorder`} className="feast-focus feast-touch grid shrink-0 place-items-center text-[#6D645B]">
                  <GripVertical className="h-4 w-4" aria-hidden />
                </button>
              )}
              <button type="button" onClick={() => onOpen(scene.id)} className="feast-focus min-w-0 flex-1 p-3 text-left">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7A531A]">Scene {index + 1}</p>
                    <h3 className="voice truncate text-xl">{scene.title}</h3>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#6D645B]" aria-hidden />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6D645B]">
                  <span>{sceneDishes.length} dish{sceneDishes.length === 1 ? '' : 'es'}</span>
                  <span>{status}</span>
                  {max > 0 && <span>{money(min)}–{money(max)} / guest</span>}
                </div>
                {expanded && <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#6D645B]">{scene.purpose || 'Add the purpose of this moment.'}</p>}
              </button>
              {canEdit && (
                <details className="relative shrink-0">
                  <summary className="feast-focus feast-touch grid cursor-pointer list-none place-items-center rounded-full" aria-label={`Actions for ${scene.title}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </summary>
                  <div className="absolute right-2 top-11 z-20 w-44 rounded-[12px] border border-[rgba(32,28,24,.14)] bg-[#FFFDFC] p-1.5 shadow-lg">
                    <SceneMenuButton icon={<Edit3 />} onClick={() => onEdit(scene)}>Rename and edit</SceneMenuButton>
                    <SceneMenuButton icon={<Copy />} onClick={() => onDuplicate(scene)}>Duplicate</SceneMenuButton>
                    <SceneMenuButton icon={<ArrowUp />} disabled={index === 0} onClick={() => move(scene.id, -1)}>Move up</SceneMenuButton>
                    <SceneMenuButton icon={<ArrowDown />} disabled={index === scenes.length - 1} onClick={() => move(scene.id, 1)}>Move down</SceneMenuButton>
                    <SceneMenuButton icon={<Trash2 />} danger onClick={() => onArchive(scene)}>Archive</SceneMenuButton>
                  </div>
                </details>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function SceneMenuButton({
  children,
  icon,
  disabled,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactElement<{ className?: string }>;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`feast-focus flex min-h-11 w-full items-center gap-2 rounded-[8px] px-2 text-left text-xs disabled:opacity-40 ${
        danger ? 'text-[#7B2E28] hover:bg-[#F5E4DF]' : 'text-[#201C18] hover:bg-[#F7F4EE]'
      }`}
    >
      {React.cloneElement(icon, { className: 'h-4 w-4' })}{children}
    </button>
  );
}

function TastingCanvas({
  scene,
  dishes,
  requirements,
  assessments,
  evidence,
  canEdit,
  collaborationEnabled,
  comments,
  currentUserId,
  onEditScene,
  onAddDish,
  onEditDish,
  onAssessment,
  onEvidence,
}: {
  scene: MealScene;
  dishes: FeastDish[];
  requirements: GuestRequirement[];
  assessments: DishAssessment[];
  evidence: FeastStudioSnapshot['evidence'];
  canEdit: boolean;
  collaborationEnabled: boolean;
  comments: FeastStudioSnapshot['comments'];
  currentUserId: string;
  onEditScene: () => void;
  onAddDish: () => void;
  onEditDish: (dish: FeastDish) => void;
  onAssessment: (dish: FeastDish, requirement: GuestRequirement, state: 'unknown' | 'ingredient_compatible' | 'conflict') => void;
  onEvidence: (dish: FeastDish, requirement: GuestRequirement) => void;
}) {
  const evidenceIds = new Set(evidence.map((item) => item.id));
  return (
    <section aria-labelledby="scene-title" className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] uppercase tracking-[0.16em] text-[#7A531A]">{pretty(scene.kind)} · {scene.planned_at || 'Timing open'}</p>
          <h1 id="scene-title" className="voice mt-1 text-[clamp(36px,5vw,52px)] leading-none">{scene.title}</h1>
          <p className="mt-3 max-w-3xl text-[15px] leading-6 text-[#6D645B]">{scene.purpose || 'Give this moment a purpose that the caterer can execute.'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone="gold">{scene.service_style || 'Service open'}</Chip>
            <Chip tone="neutral">{scene.mood || 'Mood open'}</Chip>
            <Chip tone={scene.status === 'ready' ? 'sage' : 'neutral'}>{pretty(scene.status)}</Chip>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ObjectPresence objectType="feast-scene" objectId={scene.id} enabled={collaborationEnabled} />
          {canEdit && <Button variant="secondary" leadingIcon={<Edit3 className="h-4 w-4" />} onClick={onEditScene}>Edit scene</Button>}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="voice text-3xl">Tasting Canvas</h2>
          <p className="text-sm text-[#6D645B]">{dishes.length ? 'Every dish stays a Draft until you confirm it.' : 'This scene is empty, but the rest of the plan remains usable.'}</p>
        </div>
        {canEdit && <Button className="hidden md:inline-flex" leadingIcon={<Plus className="h-4 w-4" />} onClick={onAddDish}>Add dish</Button>}
      </div>

      {dishes.length === 0 ? (
        <div className="feast-card mt-4 grid min-h-[260px] place-items-center p-6 text-center">
          <div className="max-w-md">
            <Utensils className="mx-auto h-9 w-9 text-[#A8782A]" aria-hidden />
            <h3 className="voice mt-3 text-2xl">This moment is still quiet.</h3>
            <p className="mt-2 text-sm leading-6 text-[#6D645B]">Add a dish, import one from a caterer menu, or intentionally leave the scene empty. Suggestions will always arrive as labeled Drafts.</p>
            {canEdit && <Button className="mt-4" onClick={onAddDish}>Add the first dish</Button>}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {dishes.map((dish) => (
            <DishCard
              key={dish.id}
              dish={dish}
              requirements={requirements}
              assessments={assessments}
              evidence={evidence}
              evidenceIds={evidenceIds}
              canEdit={canEdit}
              collaborationEnabled={collaborationEnabled}
              comments={comments.filter((comment) => comment.object_type === 'feast_dish' && comment.object_id === dish.id)}
              currentUserId={currentUserId}
              onEdit={() => onEditDish(dish)}
              onAssessment={(requirement, state) => onAssessment(dish, requirement, state)}
              onEvidence={(requirement) => onEvidence(dish, requirement)}
            />
          ))}
        </div>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={onAddDish}
          className="feast-focus fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-20 flex min-h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-[#201C18] px-6 text-sm font-semibold text-[#FFFDFC] shadow-xl md:hidden"
        >
          <Plus className="h-4 w-4" /> Add dish
        </button>
      )}

      <ObjectComments
        objectType="feast_scene"
        objectId={scene.id}
        comments={comments.filter((comment) => comment.object_type === 'feast_scene' && comment.object_id === scene.id)}
        currentUserId={currentUserId}
        returnPath={`/canvas/feast/scenes/${scene.id}`}
      />
    </section>
  );
}

function DishCard({
  dish,
  requirements,
  assessments,
  evidence,
  evidenceIds,
  canEdit,
  collaborationEnabled,
  comments,
  currentUserId,
  onEdit,
  onAssessment,
  onEvidence,
}: {
  dish: FeastDish;
  requirements: GuestRequirement[];
  assessments: DishAssessment[];
  evidence: FeastStudioSnapshot['evidence'];
  evidenceIds: Set<string>;
  canEdit: boolean;
  collaborationEnabled: boolean;
  comments: FeastStudioSnapshot['comments'];
  currentUserId: string;
  onEdit: () => void;
  onAssessment: (requirement: GuestRequirement, state: 'unknown' | 'ingredient_compatible' | 'conflict') => void;
  onEvidence: (requirement: GuestRequirement) => void;
}) {
  const dishAssessments = assessments.filter((assessment) => assessment.dish_id === dish.id);
  const coverage = requirements.map((requirement) => ({
    requirement,
    coverage: requirementCoverage(requirement, dishAssessments, evidenceIds),
  }));
  const important = coverage
    .sort((left, right) => {
      const weight = { conflict: 0, needs_review: 1, unknown: 2, compatible: 3, confirmed: 4 };
      return weight[left.coverage] - weight[right.coverage];
    })
    .slice(0, 3);
  return (
    <article className="feast-card min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="voice text-2xl">{dish.name}</h3>
            <Chip tone={dish.status === 'confirmed' ? 'sage' : dish.status === 'needs_confirmation' ? 'gold' : 'neutral'}>{pretty(dish.status)}</Chip>
            {dish.source !== 'manual' && <Chip tone="gold">Draft · {pretty(dish.source)}</Chip>}
          </div>
          <p className="mt-1 text-sm text-[#6D645B]">{dish.role || 'Role in the meal open'} · {dish.service_style || 'Service open'}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {important.map(({ requirement, coverage: state }) => (
              <CoveragePill key={requirement.id} coverage={state} shortLabel={pretty(requirement.code)} />
            ))}
          </div>
        </div>
        {canEdit && <Button size="sm" variant="secondary" leadingIcon={<Edit3 className="h-4 w-4" />} onClick={onEdit}>Edit</Button>}
      </div>
      <details className="border-t border-[rgba(32,28,24,.12)]">
        <summary className="feast-focus flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-[#5A5349]">
          Details, guest fit, evidence, and comments <ChevronRight className="h-4 w-4" aria-hidden />
        </summary>
        <div className="space-y-5 px-4 pb-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <DishDetail label="Ingredients recorded" value={dish.ingredients_json.join(', ') || 'No ingredients recorded yet.'} />
            <DishDetail label="Presentation" value={dish.presentation || 'Presentation is open.'} />
            <DishDetail label="Execution" value={dish.execution_notes || 'Production details are open.'} />
            <DishDetail label="Meaning" value={dish.story || 'No story added.'} />
          </div>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">Requirement assessments</h4>
              <ObjectPresence objectType="feast-dish" objectId={dish.id} enabled={collaborationEnabled} />
            </div>
            <div className="mt-2 space-y-2">
              {coverage.map(({ requirement, coverage: state }) => {
                const assessment = dishAssessments.find((item) => item.requirement_code === requirement.code);
                const source = assessment?.evidence_id ? evidence.find((item) => item.id === assessment.evidence_id) : null;
                return (
                  <div key={requirement.id} className="rounded-[12px] border border-[rgba(32,28,24,.12)] bg-[#FBF8F2] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{pretty(requirement.code)}</p>
                        <p className="mt-0.5 text-xs text-[#6D645B]">
                          {source
                            ? `${pretty(assessment?.state ?? '')} · ${source.source_name} · ${source.confirmed_at.slice(0, 10)}`
                            : assessment?.reasoning || 'Not enough information has been recorded.'}
                        </p>
                      </div>
                      <CoveragePill coverage={state} />
                    </div>
                    {canEdit && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => onAssessment(requirement, 'ingredient_compatible')}>Ingredients compatible</Button>
                        <Button size="sm" variant="danger" onClick={() => onAssessment(requirement, 'conflict')}>Known conflict</Button>
                        <Button size="sm" variant="gold" onClick={() => onEvidence(requirement)}>Record confirmation</Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <ObjectComments
            objectType="feast_dish"
            objectId={dish.id}
            comments={comments}
            currentUserId={currentUserId}
            returnPath={`/canvas/feast/scenes/${dish.scene_id}`}
          />
        </div>
      </details>
    </article>
  );
}

function DishDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7A531A]">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#5A5349]">{value}</p>
    </div>
  );
}

function CoveragePill({ coverage, shortLabel }: { coverage: Coverage; shortLabel?: string }) {
  const meta = COVERAGE_META[coverage];
  return (
    <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold ${
      meta.tone === 'sage' ? 'bg-[#E3EBDD] text-[#204F3D]' :
        meta.tone === 'gold' ? 'bg-[#F4EBDD] text-[#6C4712]' :
          meta.tone === 'clay' ? 'bg-[#F5E4DF] text-[#7B2E28]' :
            'bg-[#EEEAE3] text-[#5A5349]'
    }`}>
      {meta.icon}
      {shortLabel ? `${shortLabel}: ${meta.label}` : meta.label}
    </span>
  );
}

function PeacePanel({
  plan,
  hospitality,
  ready,
  scenes,
  dishes,
  nextAction,
  updateAvailable,
}: {
  plan: FeastPlan;
  hospitality: ReturnType<typeof hospitalityScore>;
  ready: boolean;
  scenes: MealScene[];
  dishes: FeastDish[];
  nextAction: { label: string; href: string };
  updateAvailable: boolean;
}) {
  const min = dishes.reduce((sum, dish) => sum + Number(dish.advisory_cost_min_cents ?? 0), 0);
  const max = dishes.reduce((sum, dish) => sum + Number(dish.advisory_cost_max_cents ?? 0), 0);
  const plated = scenes.filter((scene) => /plated/i.test(scene.service_style)).length;
  return (
    <section aria-labelledby="peace-panel-title" className="space-y-4">
      <div>
        <p className="text-[12px] uppercase tracking-[0.16em] text-[#7A531A]">Peace Panel</p>
        <h2 id="peace-panel-title" className="voice text-2xl">What the meal knows</h2>
      </div>
      <div className="feast-card p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-[#6D645B]">Hospitality Score</p>
            <p className="voice text-4xl">{Math.round(hospitality.score * 100)}%</p>
          </div>
          <Chip tone={hospitality.conflicts.length ? 'clay' : hospitality.openConfirmations.length ? 'gold' : 'sage'}>
            {hospitality.conflicts.length ? `${hospitality.conflicts.length} conflicts` : hospitality.openConfirmations.length ? `${hospitality.openConfirmations.length} open` : 'Cared for'}
          </Chip>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Metric value={hospitality.counts.confirmed + hospitality.counts.compatible} label="Covered" />
          <Metric value={hospitality.counts.unknown + hospitality.counts.needs_review} label="Review" />
          <Metric value={hospitality.counts.conflict} label="Conflict" />
        </div>
      </div>
      <div className="feast-card p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7A531A]">Cost guidance · advisory</p>
        <p className="voice mt-1 text-2xl">{max ? `${money(min, plan.currency)}–${money(max, plan.currency)}` : 'Add dish estimates'}</p>
        <p className="mt-1 text-xs leading-5 text-[#6D645B]">Current dish guidance per guest. {plated ? `${plated} plated scene${plated === 1 ? '' : 's'} may increase staffing.` : 'Shared service may shift rentals and passing staff.'}</p>
      </div>
      <div className="feast-card p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7A531A]">Execution</p>
        <ul className="mt-2 space-y-2 text-sm text-[#5A5349]">
          <li>{scenes.filter((scene) => !scene.planned_at).length} scenes still need timing.</li>
          <li>{dishes.filter((dish) => !dish.execution_notes).length} dishes still need production notes.</li>
          <li>{dishes.filter((dish) => dish.status !== 'confirmed').length} dishes remain Draft or need confirmation.</li>
        </ul>
      </div>
      <div className="feast-card p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7A531A]">Brief readiness</p>
          <Chip tone={ready ? 'sage' : 'gold'}>{ready ? 'Ready' : 'Blocked by care gaps'}</Chip>
        </div>
        {updateAvailable && <p className="mt-2 text-sm font-semibold text-[#7B2E28]">Update available: the Feast Plan changed after the latest brief.</p>}
      </div>
      <div className="rounded-[16px] bg-[#201C18] p-4 text-[#FFFDFC]">
        <p className="text-xs uppercase tracking-[0.14em] text-[#D8B56F]">Next action</p>
        <p className="voice mt-2 text-xl">{nextAction.label}</p>
        <p className="mt-2 text-xs leading-5 text-[#DED7CC]">Chosen from the highest-impact open decision. Nothing applies autonomously.</p>
        <Link href={nextAction.href} className="feast-focus mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#F2B134] px-4 text-sm font-semibold text-[#201C18]">
          Open action <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[10px] bg-[#F7F4EE] p-2">
      <p className="voice text-xl">{value}</p>
      <p className="text-[11px] text-[#6D645B]">{label}</p>
    </div>
  );
}

function GuestCareView({
  guests,
  requirements,
  dishes,
  assessments,
  evidenceIds,
  onResolve,
}: {
  guests: FeastStudioSnapshot['guests'];
  requirements: GuestRequirement[];
  dishes: FeastDish[];
  assessments: DishAssessment[];
  evidenceIds: Set<string>;
  onResolve: (dish: FeastDish, requirement: GuestRequirement) => void;
}) {
  const [selected, setSelected] = React.useState(requirements[0]?.id ?? '');
  const selectedRequirement = requirements.find((requirement) => requirement.id === selected) ?? requirements[0];
  const grouped = requirements.reduce<Record<Coverage, GuestRequirement[]>>((acc, requirement) => {
    acc[requirementCoverage(requirement, assessments, evidenceIds)].push(requirement);
    return acc;
  }, { unknown: [], needs_review: [], compatible: [], confirmed: [], conflict: [] });
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
      <p className="text-[12px] uppercase tracking-[0.16em] text-[#7A531A]">Guest Care Preview</p>
      <h1 className="voice text-[clamp(38px,5vw,54px)]">Who can enter the meal?</h1>
      <p className="mt-2 max-w-3xl text-[15px] leading-6 text-[#6D645B]">Coverage is calculated from the recorded assessment and evidence. Ingredients alone never become an allergy or certification promise.</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(Object.keys(grouped) as Coverage[]).map((coverage) => (
          <div key={coverage} className="feast-card p-3 text-center">
            <p className="voice text-3xl">{grouped[coverage].length}</p>
            <p className="text-xs text-[#6D645B]">{COVERAGE_META[coverage].label}</p>
          </div>
        ))}
      </div>
      {requirements.length === 0 ? (
        <div className="feast-card mt-5 p-8 text-center">
          <Users className="mx-auto h-9 w-9 text-[#A8782A]" />
          <h2 className="voice mt-3 text-2xl">No guest requirements yet.</h2>
          <p className="mt-2 text-sm text-[#6D645B]">Add requirements from the Requirements view. Guest names and notes remain private.</p>
        </div>
      ) : (
        <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="feast-card p-3">
            <h2 className="px-2 text-sm font-semibold">Actionable requirements</h2>
            <div className="mt-2 space-y-1">
              {requirements.map((requirement) => {
                const guest = guests.find((item) => item.id === requirement.guest_id);
                const coverage = requirementCoverage(requirement, assessments, evidenceIds);
                return (
                  <button key={requirement.id} type="button" onClick={() => setSelected(requirement.id)} className={`feast-focus min-h-14 w-full rounded-[10px] px-3 py-2 text-left ${selectedRequirement?.id === requirement.id ? 'bg-[#F4EBDD]' : 'hover:bg-[#F7F4EE]'}`}>
                    <span className="block text-sm font-semibold">{guest?.label || 'Plan-wide requirement'}</span>
                    <span className="mt-0.5 block text-xs text-[#6D645B]">{pretty(requirement.code)} · {COVERAGE_META[coverage].label}</span>
                  </button>
                );
              })}
            </div>
          </aside>
          {selectedRequirement && (
            <section className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="voice text-3xl">{pretty(selectedRequirement.code)}</h2>
                  <p className="mt-1 text-sm text-[#6D645B]">{pretty(selectedRequirement.category)} · {pretty(selectedRequirement.severity)}</p>
                </div>
                <CoveragePill coverage={requirementCoverage(selectedRequirement, assessments, evidenceIds)} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {dishes.map((dish) => {
                  const coverage = requirementCoverage(
                    selectedRequirement,
                    assessments.filter((assessment) => assessment.dish_id === dish.id),
                    evidenceIds,
                  );
                  return (
                    <article key={dish.id} className="feast-card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="voice text-xl">{dish.name}</h3>
                          <p className="text-xs text-[#6D645B]">{dish.role || 'Dish'}</p>
                        </div>
                        <CoveragePill coverage={coverage} />
                      </div>
                      {(coverage === 'unknown' || coverage === 'needs_review' || coverage === 'conflict') && (
                        <Button className="mt-3" size="sm" variant="gold" onClick={() => onResolve(dish, selectedRequirement)}>Resolve with evidence</Button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

function RequirementsView({
  guests,
  requirements,
  assessments,
  evidenceIds,
  canEdit,
  comments,
  currentUserId,
  onAdd,
  onEdit,
  onDelete,
}: {
  guests: FeastStudioSnapshot['guests'];
  requirements: GuestRequirement[];
  assessments: DishAssessment[];
  evidenceIds: Set<string>;
  canEdit: boolean;
  comments: FeastStudioSnapshot['comments'];
  currentUserId: string;
  onAdd: () => void;
  onEdit: (requirement: GuestRequirement) => void;
  onDelete: (requirement: GuestRequirement) => void;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] uppercase tracking-[0.16em] text-[#7A531A]">Religious, dietary, allergy, preparation, preference</p>
          <h1 className="voice text-[clamp(38px,5vw,54px)]">Guest requirements</h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-6 text-[#6D645B]">Record what is required, how serious it is, and what evidence will be needed. “Safe” is intentionally not a status.</p>
        </div>
        {canEdit && <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={onAdd}>Add requirement</Button>}
      </div>
      <div className="mt-5 space-y-3">
        {requirements.map((requirement) => {
          const guest = guests.find((item) => item.id === requirement.guest_id);
          const coverage = requirementCoverage(requirement, assessments, evidenceIds);
          return (
            <article key={requirement.id} className="feast-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="voice text-2xl">{pretty(requirement.code)}</h2>
                    <CoveragePill coverage={coverage} />
                  </div>
                  <p className="mt-1 text-sm text-[#6D645B]">{guest?.label || 'Plan-wide'} · {pretty(requirement.category)} · {pretty(requirement.severity)}</p>
                  {requirement.notes && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5A5349]">{requirement.notes}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => onEdit(requirement)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => onDelete(requirement)}>Remove</Button>
                  </div>
                )}
              </div>
              <ObjectComments
                objectType="feast_requirement"
                objectId={requirement.id}
                comments={comments.filter((comment) => comment.object_type === 'feast_requirement' && comment.object_id === requirement.id)}
                currentUserId={currentUserId}
                returnPath="/canvas/feast/requirements"
              />
            </article>
          );
        })}
      </div>
    </main>
  );
}

function PresentationView({
  plan,
  onChange,
}: {
  plan: PlanDraft;
  onChange: (patch: Partial<PlanDraft>, immediate?: boolean) => void;
}) {
  const complexity = plan.meal_shape === 'plated'
    ? 'A plated plan increases synchronized staffing, tableware, and timeline pressure.'
    : plan.meal_shape === 'family_style'
      ? 'A family-style plan emphasizes shared abundance and needs passing space, serving pieces, and attentive replenishment.'
      : 'This meal shape changes flow, equipment, and the handoff the caterer receives.';
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <p className="text-[12px] uppercase tracking-[0.16em] text-[#7A531A]">Presentation with consequence</p>
      <h1 className="voice text-[clamp(38px,5vw,54px)]">How the meal enters the room</h1>
      <p className="mt-2 max-w-3xl text-[15px] leading-6 text-[#6D645B]">These choices update the plan summary, ripple into connected modules, and appear in every new caterer brief version.</p>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="feast-card space-y-6 p-5">
          <ChoiceGroup label="Meal shape" value={plan.meal_shape} choices={MEAL_SHAPES} onChange={(value) => onChange({ meal_shape: value }, true)} />
          <ChoiceGroup label="Service feeling" value={plan.service_feeling} choices={SERVICE_FEELINGS.map((value) => [value, value] as const)} onChange={(value) => onChange({ service_feeling: value }, true)} />
          <ChoiceGroup label="Emotional root" value={plan.emotional_root} choices={EMOTIONAL_ROOTS.map((value) => [value, value] as const)} onChange={(value) => onChange({ emotional_root: value }, true)} />
          <ChoiceGroup label="Hospitality standard" value={plan.hospitality_standard} choices={HOSPITALITY_STANDARDS} onChange={(value) => onChange({ hospitality_standard: value }, true)} />
        </section>
        <aside className="space-y-4">
          <div className="rounded-[16px] bg-[#201C18] p-5 text-[#FFFDFC]">
            <p className="text-xs uppercase tracking-[0.14em] text-[#D8B56F]">Visible consequence</p>
            <h2 className="voice mt-2 text-2xl">{pretty(plan.meal_shape)}</h2>
            <p className="mt-2 text-sm leading-6 text-[#DED7CC]">{complexity}</p>
          </div>
          <div className="feast-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7A531A]">This ripples into</p>
            <ul className="mt-2 space-y-2 text-sm text-[#5A5349]">
              <li>Staffing and service assumptions</li>
              <li>Rentals and tableware</li>
              <li>Timeline and seating flow</li>
              <li>Money Map guidance</li>
              <li>Caterer brief freshness</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ChoiceGroup({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: string;
  choices: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {choices.map(([choice, text]) => (
          <button
            key={choice}
            type="button"
            aria-pressed={value === choice}
            onClick={() => onChange(choice)}
            className={`feast-focus min-h-12 rounded-[12px] border px-4 text-left text-sm ${
              value === choice ? 'border-[#A8782A] bg-[#F4EBDD] font-semibold text-[#6C4712]' : 'border-[rgba(32,28,24,.14)] bg-[#FFFDFC] text-[#5A5349]'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function BriefView({
  snapshot,
  objectId,
  latest,
  briefs,
  ready,
  updateAvailable,
  changedSections,
  canEdit,
  comments,
  currentUserId,
  onCreate,
}: {
  snapshot: CatererBriefSnapshot;
  objectId: string;
  latest?: FeastStudioSnapshot['briefs'][number];
  briefs: FeastStudioSnapshot['briefs'];
  ready: boolean;
  updateAvailable: boolean;
  changedSections: string[];
  canEdit: boolean;
  comments: FeastStudioSnapshot['comments'];
  currentUserId: string;
  onCreate: () => Promise<{ id: string; version: number; changedSections: string[] } | null>;
}) {
  const [creating, setCreating] = React.useState(false);
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] uppercase tracking-[0.16em] text-[#7A531A]">Private handoff · immutable versions</p>
          <h1 className="voice text-[clamp(38px,5vw,54px)]">Caterer brief</h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-6 text-[#6D645B]">This preview is generated from the current Feast Plan. Creating a version freezes a private snapshot; older versions never change.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {latest && (
            <a href={`/canvas/feast/brief/${latest.id}/pdf`} className="feast-focus inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-[rgba(32,28,24,.14)] bg-[#FFFDFC] px-4 text-sm font-semibold">
              <Download className="h-4 w-4" /> Download v{latest.version} PDF
            </a>
          )}
          {canEdit && (
            <Button
              isLoading={creating}
              disabled={!ready}
              leadingIcon={<FileCheck2 className="h-4 w-4" />}
              onClick={async () => {
                setCreating(true);
                await onCreate();
                setCreating(false);
              }}
            >
              {!latest ? 'Create version 1' : updateAvailable ? `Create version ${latest.version + 1}` : 'Create another version'}
            </Button>
          )}
        </div>
      </div>

      {!ready && (
        <div role="status" className="mt-5 rounded-[14px] border border-[#C18B47] bg-[#F4EBDD] p-4 text-sm text-[#6C4712]">
          <strong>Brief creation is blocked.</strong> Resolve all safety-critical and certified requirements first. Ingredient compatibility alone is not enough.
        </div>
      )}
      {latest && updateAvailable && (
        <div role="status" className="mt-5 rounded-[14px] border border-[#C88B82] bg-[#F5E4DF] p-4 text-sm text-[#7B2E28]">
          <strong>Update available.</strong> Changed sections: {changedSections.join(', ')}. Version {latest.version} remains untouched.
        </div>
      )}

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="feast-card min-w-0 p-5" aria-label="Live caterer brief preview">
          <div className="flex items-center justify-between gap-3 border-b border-[rgba(32,28,24,.12)] pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[#7A531A]">Live projection</p>
              <h2 className="voice text-3xl">{snapshot.plan.intention || 'The Feast Plan'}</h2>
            </div>
            <Chip tone={snapshot.readiness.ready ? 'sage' : 'gold'}>{snapshot.readiness.ready ? 'Ready' : 'Open questions'}</Chip>
          </div>
          <BriefSection title="Event and service">
            <p>{pretty(snapshot.plan.meal_shape)} · {snapshot.plan.service_feeling} · {snapshot.plan.guest_count} guests</p>
            <p>{snapshot.plan.emotional_root}</p>
          </BriefSection>
          <BriefSection title="Meal flow">
            <ol className="space-y-3">
              {snapshot.scenes.map((scene) => (
                <li key={scene.id}>
                  <p className="font-semibold">{scene.order + 1}. {scene.title} · {scene.service_style || 'Service open'}</p>
                  <p className="text-[#6D645B]">{scene.dishes.length ? scene.dishes.map((dish) => dish.name).join(', ') : 'No dishes yet'}</p>
                </li>
              ))}
            </ol>
          </BriefSection>
          <BriefSection title="Guest care and confirmations">
            <ul className="space-y-2">
              {snapshot.requirements.map((requirement) => (
                <li key={requirement.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{pretty(requirement.code)} · {pretty(requirement.severity)}</span>
                  <CoveragePill coverage={requirement.coverage as Coverage} />
                </li>
              ))}
            </ul>
          </BriefSection>
          <BriefSection title="Open questions">
            {snapshot.readiness.open_confirmations.length || snapshot.readiness.conflicts.length ? (
              <ul className="list-disc space-y-1 pl-5">
                {[...new Set([...snapshot.readiness.conflicts, ...snapshot.readiness.open_confirmations])].map((code) => <li key={code}>{pretty(code)}</li>)}
              </ul>
            ) : <p>No safety-critical or certified gaps are open.</p>}
          </BriefSection>
        </section>
        <aside className="space-y-4">
          <div className="feast-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7A531A]">Version history</p>
            {briefs.length ? (
              <ol className="mt-3 space-y-2">
                {briefs.map((brief) => (
                  <li key={brief.id} className="rounded-[10px] bg-[#F7F4EE] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">Version {brief.version}</span>
                      <span className="text-xs text-[#6D645B]">{brief.created_at.slice(0, 10)}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#6D645B]">{brief.changed_sections.join(', ') || 'No changed sections recorded'}</p>
                    <a href={`/canvas/feast/brief/${brief.id}/pdf`} className="feast-focus mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-[#6C4712]">Download private PDF</a>
                  </li>
                ))}
              </ol>
            ) : <p className="mt-2 text-sm text-[#6D645B]">No frozen version yet.</p>}
          </div>
          <div className="feast-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7A531A]">Privacy</p>
            <p className="mt-2 text-sm leading-6 text-[#6D645B]">No public URL is created. Download and share through the channel you choose.</p>
          </div>
          <ObjectComments
            objectType="feast_brief"
            objectId={objectId}
            comments={comments.filter((comment) => comment.object_type === 'feast_brief' && comment.object_id === objectId)}
            currentUserId={currentUserId}
            returnPath="/canvas/feast/brief"
          />
        </aside>
      </div>
    </main>
  );
}

function BriefSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-[rgba(32,28,24,.12)] py-5 last:border-0">
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7A531A]">{title}</h3>
      <div className="mt-3 space-y-2 text-sm leading-6 text-[#5A5349]">{children}</div>
    </section>
  );
}

function DishEditor({
  workspaceId,
  sceneId,
  dish,
  scenes,
  requirements,
  collaborationEnabled,
  onClose,
  onSaved,
}: {
  workspaceId: string;
  sceneId: string;
  dish?: FeastDish;
  scenes: MealScene[];
  requirements: GuestRequirement[];
  collaborationEnabled: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = React.useState(0);
  const [draft, setDraft] = React.useState<DishPatch>(() => dish ? dishDraft(dish) : {
    name: '',
    role: '',
    ingredients_json: [],
    story: '',
    presentation: '',
    execution_notes: '',
    service_style: scenes.find((scene) => scene.id === sceneId)?.service_style || '',
    mood: scenes.find((scene) => scene.id === sceneId)?.mood || '',
    advisory_cost_min_cents: null,
    advisory_cost_max_cents: null,
    status: 'draft',
    source: 'manual',
  });
  const draftRef = React.useRef(draft);
  const baseRef = React.useRef<Record<string, unknown>>(dish ? dishDraft(dish) as Record<string, unknown> : {});
  const versionRef = React.useRef(dish?.version ?? 1);
  const [remoteId, setRemoteId] = React.useState(dish?.id ?? '');
  const [remoteSceneId] = React.useState(sceneId);
  const [saveStatus, setSaveStatus] = React.useState<SyncStatus>('idle');
  const [pending, startTransition] = React.useTransition();
  const [conflict, setConflict] = React.useState<ConflictPayload | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftId = remoteId ? `dish:${remoteId}` : `dish:new:${remoteSceneId}`;
  const steps = ['Basics', 'Guest fit', 'Production', 'Meaning'];

  const persistLocal = React.useCallback(async (next: DishPatch, retryCount = 0) => {
    await putFeastDraft({
      id: draftId,
      workspaceId,
      objectType: 'dish',
      objectId: remoteId || 'new',
      sceneId: remoteSceneId,
      baseVersion: versionRef.current,
      changes: next as Record<string, unknown>,
      timestamp: Date.now(),
      retryCount,
    });
    setSaveStatus(retryCount ? 'error' : 'local');
  }, [draftId, remoteId, remoteSceneId, workspaceId]);

  const commit = React.useCallback(async (next: DishPatch, closeAfter = false, force = false, forcedVersion?: number) => {
    if (!next.name?.trim()) {
      setErrors({ name: 'Add a dish name before saving.' });
      return;
    }
    if (!next.role?.trim()) {
      setErrors({ role: 'Explain the role this dish plays in the meal.' });
      return;
    }
    if (!navigator.onLine) {
      await persistLocal(next, 1).catch(() => setSaveStatus('error'));
      return;
    }
    setSaveStatus('saving');
    try {
      if (!remoteId) {
        const created = await createDish({ sceneId: remoteSceneId, dish: next });
        setRemoteId(created.id);
        versionRef.current = created.version;
        baseRef.current = { ...next };
        await deleteFeastDraft(draftId).catch(() => {});
      } else {
        const result = await saveDish({
          id: remoteId,
          patch: next,
          expectedVersion: forcedVersion ?? versionRef.current,
          base: baseRef.current,
          force,
        });
        if (!result.ok) {
          setConflict(result.conflict);
          setSaveStatus('conflict');
          return;
        }
        versionRef.current = result.version;
        baseRef.current = { ...next };
        await deleteFeastDraft(draftId).catch(() => {});
      }
      setSaveStatus('saved');
      if (closeAfter) onSaved();
    } catch {
      const drafts = await getFeastDrafts(workspaceId).catch(() => []);
      const existing = drafts.find((item) => item.id === draftId);
      await persistLocal(next, (existing?.retryCount ?? 0) + 1).catch(() => setSaveStatus('error'));
    }
  }, [draftId, onSaved, persistLocal, remoteId, remoteSceneId, workspaceId]);

  function patch(next: DishPatch) {
    const updated = { ...draftRef.current, ...next };
    draftRef.current = updated;
    setDraft(updated);
    setErrors({});
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void persistLocal(updated).then(() => {
        if (remoteId && navigator.onLine) void commit(updated);
      }).catch(() => setSaveStatus('error'));
    }, 600);
  }

  React.useEffect(() => {
    void getFeastDrafts(workspaceId).then((drafts) => {
      const local = drafts.find((item) => item.id === draftId);
      if (!local) return;
      const restored = { ...draftRef.current, ...local.changes } as DishPatch;
      draftRef.current = restored;
      setDraft(restored);
      setSaveStatus(local.retryCount ? 'error' : 'local');
    }).catch(() => {});
    const sync = () => void commit(draftRef.current);
    window.addEventListener('online', sync);
    return () => {
      window.removeEventListener('online', sync);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [commit, draftId, workspaceId]);

  function continueStep() {
    if (step === 0) {
      const nextErrors: Record<string, string> = {};
      if (!draft.name?.trim()) nextErrors.name = 'Add a dish name.';
      if (!draft.role?.trim()) nextErrors.role = 'Add its role in the meal.';
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        return;
      }
      if (!remoteId) void commit(draft);
    }
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        side="right"
        title={dish ? `Edit ${dish.name}` : 'Add a dish'}
        widthClassName="w-full max-w-[640px]"
        className="sm:max-w-[640px]"
      >
        <div className="flex min-h-full flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(32,28,24,.12)] pb-3">
            <ol className="flex flex-wrap gap-1.5" aria-label="Dish editor steps">
              {steps.map((label, index) => (
                <li key={label}>
                  <button type="button" onClick={() => setStep(index)} aria-current={step === index ? 'step' : undefined} className={`feast-focus min-h-11 rounded-full px-3 text-xs font-semibold ${step === index ? 'bg-[#201C18] text-[#FFFDFC]' : 'bg-[#F7F4EE] text-[#5A5349]'}`}>
                    {index + 1}. {label}
                  </button>
                </li>
              ))}
            </ol>
            <SaveState status={saveStatus} />
          </div>

          <div className="min-h-0 flex-1 py-5">
            {step === 0 && (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-[#6D645B]">Saving Basics creates a Draft. Guest fit and production details can grow as the caterer conversation becomes real.</p>
                <Field label="Dish name" required error={errors.name}>
                  {(props) => <Input {...props} value={draft.name ?? ''} onChange={(event) => patch({ name: event.target.value })} placeholder="Saffron roast chicken" />}
                </Field>
                <Field label="Role in the meal" required error={errors.role} hint="Examples: shared main, plant-based alternative, welcome gesture.">
                  {(props) => <Input {...props} value={draft.role ?? ''} onChange={(event) => patch({ role: event.target.value })} placeholder="Shared main offering" />}
                </Field>
                <Field label="Scene">
                  {(props) => (
                    <select {...props} value={remoteSceneId} disabled className="h-11 w-full rounded-[10px] border border-[rgba(32,28,24,.14)] bg-[#F7F4EE] px-3 text-sm">
                      {scenes.map((scene) => <option key={scene.id} value={scene.id}>{scene.title}</option>)}
                    </select>
                  )}
                </Field>
                <Field label="Dish state">
                  {(props) => (
                    <select {...props} value={draft.status ?? 'draft'} onChange={(event) => patch({ status: event.target.value as DishPatch['status'] })} className="h-11 w-full rounded-[10px] border border-[rgba(32,28,24,.14)] bg-[#FFFDFC] px-3 text-sm">
                      <option value="draft">Draft</option>
                      <option value="needs_confirmation">Needs confirmation</option>
                      <option value="confirmed">Confirmed plan choice</option>
                    </select>
                  )}
                </Field>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-5">
                <Field label="Ingredients recorded" hint="Comma separated. This enables ingredient compatibility only; it never proves allergy or religious compliance.">
                  {(props) => (
                    <Textarea
                      {...props}
                      value={(draft.ingredients_json ?? []).join(', ')}
                      onChange={(event) => patch({ ingredients_json: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })}
                      placeholder="chicken, preserved lemon, saffron, olive oil"
                    />
                  )}
                </Field>
                <div>
                  <p className="text-sm font-semibold">Requirements this plan knows</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {requirements.map((requirement) => <Chip key={requirement.id} tone={requirement.severity === 'safety_critical' ? 'clay' : 'neutral'}>{pretty(requirement.code)}</Chip>)}
                  </div>
                  <p className="mt-3 rounded-[12px] bg-[#F4EBDD] p-3 text-sm leading-6 text-[#6C4712]">After the dish exists, open its Guest Fit section to record ingredient compatibility, conflicts, and named evidence.</p>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <Field label="Service style">
                  {(props) => <Input {...props} value={draft.service_style ?? ''} onChange={(event) => patch({ service_style: event.target.value })} placeholder="Family style on shared platters" />}
                </Field>
                <Field label="Presentation">
                  {(props) => <Textarea {...props} value={draft.presentation ?? ''} onChange={(event) => patch({ presentation: event.target.value })} placeholder="What arrives at the table?" />}
                </Field>
                <Field label="Execution notes" hint="Equipment, preparation, cross-contact, holding, staffing, timing.">
                  {(props) => <Textarea {...props} value={draft.execution_notes ?? ''} onChange={(event) => patch({ execution_notes: event.target.value })} placeholder="Confirm separate utensils and holding plan." />}
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Advisory low / guest">
                    {(props) => <Input {...props} type="number" min={0} value={(draft.advisory_cost_min_cents ?? 0) / 100 || ''} onChange={(event) => patch({ advisory_cost_min_cents: Math.round(Number(event.target.value || 0) * 100) })} />}
                  </Field>
                  <Field label="Advisory high / guest">
                    {(props) => <Input {...props} type="number" min={0} value={(draft.advisory_cost_max_cents ?? 0) / 100 || ''} onChange={(event) => patch({ advisory_cost_max_cents: Math.round(Number(event.target.value || 0) * 100) })} />}
                  </Field>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4">
                <Field label="Dish story" hint="Meaning stays private to the workspace and may appear in the private caterer brief.">
                  {(props) => <Textarea {...props} rows={7} value={draft.story ?? ''} onChange={(event) => patch({ story: event.target.value })} placeholder="Why does this dish belong at your table?" />}
                </Field>
                <Field label="Mood">
                  {(props) => <Input {...props} value={draft.mood ?? ''} onChange={(event) => patch({ mood: event.target.value })} placeholder="Abundant, candlelit, playful..." />}
                </Field>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 -mx-3 mt-auto flex items-center justify-between gap-2 border-t border-[rgba(32,28,24,.14)] bg-[#FFFDFC] px-3 py-3 pb-[calc(.75rem+env(safe-area-inset-bottom))]">
            <Button variant="ghost" disabled={step === 0} leadingIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</Button>
            {step < steps.length - 1 ? (
              <Button trailingIcon={<ArrowRight className="h-4 w-4" />} onClick={continueStep}>Continue</Button>
            ) : (
              <Button isLoading={pending} onClick={() => startTransition(() => void commit(draft, true))}>Save dish</Button>
            )}
          </div>
        </div>
      </Drawer>
      <ConflictDialog
        conflict={conflict}
        title="This dish changed while you were editing"
        onClose={() => setConflict(null)}
        onResolve={async (resolved) => {
          if (!conflict) return;
          const next = resolved as DishPatch;
          draftRef.current = next;
          setDraft(next);
          await commit(next, true, true, conflict.currentVersion);
          setConflict(null);
        }}
      />
    </>
  );
}

function EvidenceDialog({
  target,
  onClose,
  onSaved,
}: {
  target: { dish: FeastDish; requirement: GuestRequirement } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState('');
  return (
    <Dialog
      open={Boolean(target)}
      onClose={onClose}
      title={target ? `Record confirmation for ${pretty(target.requirement.code)}` : 'Record confirmation'}
      description="Name exactly what was checked, who confirmed it, and when. Confirmation is event-specific."
      className="max-w-2xl"
    >
      {target && (
        <form
          className="space-y-4 pb-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            data.set('dish_id', target.dish.id);
            data.set('requirement_code', target.requirement.code);
            startTransition(async () => {
              setError('');
              try {
                await recordEvidence(data);
                onSaved();
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : 'The confirmation could not be saved.');
              }
            });
          }}
        >
          <div className="rounded-[12px] bg-[#F7F4EE] p-3 text-sm">
            <strong>{target.dish.name}</strong> · {pretty(target.requirement.severity)}
          </div>
          <Field label="Source type" required>
            {(props) => (
              <select {...props} name="source_type" defaultValue="conversation" className="h-11 w-full rounded-[10px] border border-[rgba(32,28,24,.14)] bg-[#FFFDFC] px-3 text-sm">
                <option value="conversation">Caterer conversation</option>
                <option value="email_note">Email note</option>
                <option value="menu">Menu or ingredient sheet</option>
                <option value="certificate">Certificate</option>
                <option value="contract">Contract</option>
                <option value="other">Other</option>
              </select>
            )}
          </Field>
          <Field label="Named source or confirmer" required hint="For example: Jordan Lee, catering manager; OU Kosher certificate.">
            {(props) => <Input {...props} name="source_name" required />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Confirmed on" required>
              {(props) => <Input {...props} name="confirmed_at" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />}
            </Field>
            <Field label="Expires on">
              {(props) => <Input {...props} name="expires_at" type="date" />}
            </Field>
          </div>
          <Field label="What was confirmed?" hint="For allergies, include preparation and cross-contact controls.">
            {(props) => <Textarea {...props} name="notes" />}
          </Field>
          <Field label="Attachment" hint="Optional certificate, menu, contract, or written confirmation. Stored privately.">
            {(props) => <Input {...props} name="attachment" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" />}
          </Field>
          {error && <p role="alert" className="text-sm text-[#7B2E28]">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={pending}>Record evidence</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function RequirementDialog({
  value,
  guests,
  onClose,
  onSaved,
}: {
  value: GuestRequirement | 'new' | null;
  guests: FeastStudioSnapshot['guests'];
  onClose: () => void;
  onSaved: () => void;
}) {
  const current = value && value !== 'new' ? value : null;
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState('');
  return (
    <Dialog open={Boolean(value)} onClose={onClose} title={current ? `Edit ${pretty(current.code)}` : 'Add a guest requirement'} description="Use a precise requirement and severity. Notes stay private to the workspace." className="max-w-xl">
      {value && (
        <form
          className="space-y-4 pb-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const patch: RequirementPatch = {
              guest_id: String(data.get('guest_id') || '') || null,
              category: String(data.get('category') || 'dietary') as RequirementPatch['category'],
              code: String(data.get('code') || ''),
              severity: String(data.get('severity') || 'required') as RequirementPatch['severity'],
              notes: String(data.get('notes') || ''),
            };
            startTransition(async () => {
              setError('');
              try {
                if (current) await saveRequirement(current.id, patch);
                else await createRequirement(patch);
                onSaved();
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : 'The requirement could not be saved.');
              }
            });
          }}
        >
          <Field label="Guest or scope">
            {(props) => (
              <select {...props} name="guest_id" defaultValue={current?.guest_id ?? ''} className="h-11 w-full rounded-[10px] border border-[rgba(32,28,24,.14)] bg-[#FFFDFC] px-3 text-sm">
                <option value="">Plan-wide requirement</option>
                {guests.map((guest) => <option key={guest.id} value={guest.id}>{guest.label}</option>)}
              </select>
            )}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category" required>
              {(props) => (
                <select {...props} name="category" defaultValue={current?.category ?? 'dietary'} className="h-11 w-full rounded-[10px] border border-[rgba(32,28,24,.14)] bg-[#FFFDFC] px-3 text-sm">
                  <option value="religious">Religious</option>
                  <option value="dietary">Dietary</option>
                  <option value="allergy">Allergy</option>
                  <option value="preparation">Preparation</option>
                  <option value="preference">Preference</option>
                </select>
              )}
            </Field>
            <Field label="Severity" required>
              {(props) => (
                <select {...props} name="severity" defaultValue={current?.severity ?? 'required'} className="h-11 w-full rounded-[10px] border border-[rgba(32,28,24,.14)] bg-[#FFFDFC] px-3 text-sm">
                  <option value="preference">Preference</option>
                  <option value="required">Required</option>
                  <option value="safety_critical">Safety critical</option>
                </select>
              )}
            </Field>
          </div>
          <Field label="Requirement" required hint="Examples: kosher certified, nut allergy, halal meat, dedicated fryer.">
            {(props) => <Input {...props} name="code" required readOnly={Boolean(current)} defaultValue={current?.code ?? ''} />}
          </Field>
          <Field label="Private planning notes">
            {(props) => <Textarea {...props} name="notes" defaultValue={current?.notes ?? ''} />}
          </Field>
          {error && <p role="alert" className="text-sm text-[#7B2E28]">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={pending}>Save requirement</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function SceneDialog({
  value,
  onClose,
  onSaved,
}: {
  value: MealScene | 'new' | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const current = value && value !== 'new' ? value : null;
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState('');
  return (
    <Dialog open={Boolean(value)} onClose={onClose} title={current ? `Edit ${current.title}` : 'Add a meal scene'} description="Scenes stay ordered in the Feast Map and flow into the caterer brief." className="max-w-xl">
      {value && (
        <form
          className="space-y-4 pb-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const patch: ScenePatch = {
              title: String(data.get('title') || ''),
              purpose: String(data.get('purpose') || ''),
              planned_at: String(data.get('planned_at') || ''),
              service_style: String(data.get('service_style') || ''),
              mood: String(data.get('mood') || ''),
              notes: String(data.get('notes') || ''),
              status: String(data.get('status') || 'in_progress') as ScenePatch['status'],
            };
            startTransition(async () => {
              setError('');
              try {
                if (current) {
                  const result = await saveScene({
                    id: current.id,
                    patch,
                    expectedVersion: current.version,
                    base: sceneDraft(current),
                  });
                  if (!result.ok) throw new Error('This scene changed elsewhere. Refresh and try again.');
                  onSaved(current.id);
                } else {
                  const created = await createScene({ title: patch.title ?? 'New scene', purpose: patch.purpose });
                  onSaved(created.id);
                }
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : 'The scene could not be saved.');
              }
            });
          }}
        >
          <Field label="Scene name" required>
            {(props) => <Input {...props} name="title" required defaultValue={current?.title ?? ''} />}
          </Field>
          <Field label="Purpose">
            {(props) => <Textarea {...props} name="purpose" defaultValue={current?.purpose ?? ''} />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Timing">
              {(props) => <Input {...props} name="planned_at" defaultValue={current?.planned_at ?? ''} placeholder="7:30pm · after toasts" />}
            </Field>
            <Field label="Service style">
              {(props) => <Input {...props} name="service_style" defaultValue={current?.service_style ?? ''} placeholder="Family style" />}
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mood">
              {(props) => <Input {...props} name="mood" defaultValue={current?.mood ?? ''} />}
            </Field>
            <Field label="State">
              {(props) => (
                <select {...props} name="status" defaultValue={current?.status ?? 'in_progress'} className="h-11 w-full rounded-[10px] border border-[rgba(32,28,24,.14)] bg-[#FFFDFC] px-3 text-sm">
                  <option value="empty">Empty</option>
                  <option value="in_progress">In progress</option>
                  <option value="needs_review">Needs review</option>
                  <option value="ready">Ready</option>
                </select>
              )}
            </Field>
          </div>
          <Field label="Execution notes">
            {(props) => <Textarea {...props} name="notes" defaultValue={current?.notes ?? ''} />}
          </Field>
          {error && <p role="alert" className="text-sm text-[#7B2E28]">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={pending}>Save scene</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function ConflictDialog({
  conflict,
  title,
  onClose,
  onResolve,
}: {
  conflict: ConflictPayload | null;
  title: string;
  onClose: () => void;
  onResolve: (resolved: Record<string, unknown>) => Promise<void>;
}) {
  const [resolved, setResolved] = React.useState<Record<string, unknown>>({});
  const [pending, startTransition] = React.useTransition();
  const merge = React.useMemo(
    () => conflict ? mergeConflict(conflict.base, conflict.mine, conflict.theirs) : null,
    [conflict],
  );
  React.useEffect(() => setResolved({}), [conflict]);
  return (
    <Dialog
      open={Boolean(conflict)}
      onClose={onClose}
      title={title}
      description="Non-overlapping fields merge automatically. Choose what to keep for each overlapping field."
      className="max-w-2xl"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Keep editing</Button>
          <Button
            isLoading={pending}
            disabled={!merge || merge.conflicts.some((field) => !(field.field in resolved))}
            onClick={() => {
              if (!merge) return;
              startTransition(() => void onResolve({ ...merge.merged, ...resolved }));
            }}
          >
            Save resolution
          </Button>
        </>
      )}
    >
      <div className="max-h-[60vh] space-y-3 overflow-y-auto">
        {merge?.conflicts.map((field) => (
          <section key={field.field} className="rounded-[12px] border border-[rgba(32,28,24,.14)] p-3">
            <h3 className="text-sm font-semibold">{pretty(field.field)}</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <ConflictChoice label="Keep mine" value={field.mine} selected={resolved[field.field] === field.mine} onClick={() => setResolved((current) => ({ ...current, [field.field]: field.mine }))} />
              <ConflictChoice label="Keep theirs" value={field.theirs} selected={resolved[field.field] === field.theirs} onClick={() => setResolved((current) => ({ ...current, [field.field]: field.theirs }))} />
            </div>
            {field.canCombine && (
              <Button size="sm" variant="gold" className="mt-2" onClick={() => setResolved((current) => ({ ...current, [field.field]: combineConflictValues(field.mine, field.theirs) }))}>Combine both</Button>
            )}
          </section>
        ))}
      </div>
    </Dialog>
  );
}

function ConflictChoice({
  label,
  value,
  selected,
  onClick,
}: {
  label: string;
  value: unknown;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`feast-focus rounded-[10px] border p-3 text-left ${selected ? 'border-[#A8782A] bg-[#F4EBDD]' : 'border-[rgba(32,28,24,.14)] bg-[#FFFDFC]'}`}>
      <span className="block text-xs font-semibold">{label}</span>
      <span className="mt-1 block whitespace-pre-wrap text-xs leading-5 text-[#6D645B]">{Array.isArray(value) ? value.join(', ') : String(value ?? 'Empty')}</span>
    </button>
  );
}
