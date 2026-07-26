import type { MemberRole } from '@/lib/types';
import type {
  AssessmentState,
  RequirementCategory,
  Severity,
} from './hospitality';

export type FeastPlanStatus = 'draft' | 'in_progress' | 'ready_for_brief' | 'confirmed';
export type SceneStatus = 'empty' | 'in_progress' | 'needs_review' | 'ready' | 'archived';
export type DishStatus = 'draft' | 'needs_confirmation' | 'confirmed';
export type DishSource = 'manual' | 'suggested' | 'imported';
export type EvidenceSource =
  | 'conversation'
  | 'email_note'
  | 'menu'
  | 'certificate'
  | 'contract'
  | 'other';

export interface FeastPlan {
  workspace_id: string;
  intention: string;
  meal_shape: string;
  service_feeling: string;
  emotional_root: string;
  hospitality_standard: string;
  guest_count: number;
  advisory_budget_total_cents: number | null;
  advisory_budget_per_guest_cents: number | null;
  currency: string;
  status: FeastPlanStatus;
  version: number;
  updated_at: string;
}

export interface MealScene {
  id: string;
  workspace_id: string;
  kind: string;
  title: string;
  purpose: string;
  ordinal: number;
  planned_at: string;
  duration_minutes: number | null;
  service_style: string;
  mood: string;
  notes: string;
  status: SceneStatus;
  version: number;
  created_at: string;
}

export interface FeastDish {
  id: string;
  workspace_id: string;
  scene_id: string;
  name: string;
  role: string;
  ingredients_json: string[];
  story: string;
  presentation: string;
  execution_notes: string;
  service_style: string;
  mood: string;
  advisory_cost_min_cents: number | null;
  advisory_cost_max_cents: number | null;
  status: DishStatus;
  source: DishSource;
  version: number;
  created_at: string;
}

export interface GuestRequirement {
  id: string;
  workspace_id: string;
  guest_id: string | null;
  category: RequirementCategory;
  code: string;
  severity: Severity;
  notes: string;
  created_at: string;
}

export interface ConfirmationEvidence {
  id: string;
  workspace_id: string;
  vendor_record_id: string | null;
  source_type: EvidenceSource;
  source_name: string;
  confirmed_by: string | null;
  confirmed_at: string;
  expires_at: string | null;
  notes: string;
  attachment_id: string | null;
  created_at: string;
}

export interface DishAssessment {
  id: string;
  workspace_id: string;
  dish_id: string;
  requirement_code: string;
  state: AssessmentState;
  reasoning: string;
  evidence_id: string | null;
  assessed_by: 'system' | 'planner' | 'partner' | 'vendor_record';
  assessed_at: string;
}

export interface CatererBriefSnapshot {
  generated_at: string;
  plan: {
    intention: string;
    meal_shape: string;
    service_feeling: string;
    emotional_root: string;
    hospitality_standard: string;
    guest_count: number;
    currency: string;
  };
  scenes: Array<{
    id: string;
    title: string;
    purpose: string;
    order: number;
    service_style: string;
    mood: string;
    timing: string;
    dishes: Array<{
      id: string;
      name: string;
      role: string;
      ingredients: string[];
      presentation: string;
      execution_notes: string;
      service_style: string;
      status: DishStatus;
    }>;
  }>;
  requirements: Array<{
    id: string;
    guest_id: string | null;
    category: RequirementCategory;
    code: string;
    severity: Severity;
    notes: string;
    coverage: string;
    open_confirmation: boolean;
  }>;
  evidence: Array<{
    id: string;
    source_type: EvidenceSource;
    source_name: string;
    confirmed_at: string;
    expires_at: string | null;
    notes: string;
  }>;
  presentation: {
    meal_shape: string;
    service_feeling: string;
    emotional_root: string;
  };
  readiness: {
    ready: boolean;
    hospitality_score: number;
    open_confirmations: string[];
    conflicts: string[];
  };
}

export interface CatererBriefVersion {
  id: string;
  workspace_id: string;
  version: number;
  status: 'draft' | 'finalized' | 'superseded';
  snapshot_json: CatererBriefSnapshot;
  changed_sections: string[];
  created_by: string | null;
  created_at: string;
}

export interface FeastGuest {
  id: string;
  label: string;
  dietary: string;
  meal_choice: string;
}

export interface FeastComment {
  id: string;
  object_type: string;
  object_id: string;
  body: string;
  author_id: string | null;
  author_name: string | null;
  created_at: string;
}

export interface FeastStudioSnapshot {
  plan: FeastPlan;
  scenes: MealScene[];
  dishes: FeastDish[];
  requirements: GuestRequirement[];
  evidence: ConfirmationEvidence[];
  assessments: DishAssessment[];
  briefs: CatererBriefVersion[];
  guests: FeastGuest[];
  comments: FeastComment[];
  projectName: string;
  compassSummary: string;
  compassPriorities: string[];
  workspaceRole: MemberRole;
  currentUserId: string;
  collaborationEnabled: boolean;
}

export interface FeastConflict<T extends Record<string, unknown>> {
  base: T;
  mine: T;
  theirs: T;
  currentVersion: number;
}

export type FeastSaveResult<T extends Record<string, unknown> = Record<string, unknown>> =
  | { ok: true; version: number }
  | { ok: false; conflict: FeastConflict<T> };
