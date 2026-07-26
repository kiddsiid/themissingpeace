// Analytics event taxonomy (Phase 1, T4).
//
// The canonical list of product events from the directive. Names are stable
// contracts — do not rename in place once emitted in production; add a new name
// and deprecate. Properties are intentionally COARSE and non-identifying: ids
// (workspace/user) and enums/counts only, never free text, names, emails, note
// bodies, or dream reflections. See emitter.ts for the runtime PII guard.

export const ANALYTICS_EVENTS = [
  'dream_walk_started',
  'dream_walk_completed',
  'compass_revealed',
  'compass_saved',
  'compass_shared',
  'partner_invited',
  'module_opened',
  'decision_created',
  'ripple_viewed',
  'weaver_insight_accepted',
  'next_action_completed',
  'demo_completed',
  'early_access_reserved',
  'workspace_created',
  'collaborator_invited',
  'mobile_nav_used',
  'error_encountered',
  'feast_started',
  'meal_template_applied',
  'scene_opened',
  'dish_created',
  'dish_assessment_changed',
  'guest_conflict_resolved',
  'brief_previewed',
  'brief_version_created',
  'sync_conflict_encountered',
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/** Coarse module identifiers (mirrors nav routes) for `module_opened`. */
export type ModuleKey =
  | 'dream' | 'peace-center' | 'canvas' | 'decisions' | 'budget' | 'vendors'
  | 'guests' | 'seating' | 'website' | 'printables' | 'timeline' | 'documents'
  | 'playlist' | 'honeymoon' | 'peace-notes' | 'settings' | 'feast';

// Per-event property shapes. Keep every value a scalar id / enum / number / bool.
export interface EventProps {
  dream_walk_started: { creatorRole?: 'couple' | 'planner' | 'dreamer' };
  dream_walk_completed: { creatorRole?: 'couple' | 'planner' | 'dreamer'; stepsCompleted?: number };
  compass_revealed: Record<string, never>;
  compass_saved: { version?: number };
  compass_shared: { channel?: 'link' | 'partner' | 'planner' };
  partner_invited: { role?: 'partner' | 'planner' | 'collaborator' };
  module_opened: { module: ModuleKey };
  decision_created: { category?: string };
  ripple_viewed: { sourceType?: string };
  weaver_insight_accepted: { recommendationType?: string };
  next_action_completed: Record<string, never>;
  demo_completed: Record<string, never>;
  early_access_reserved: Record<string, never>;
  workspace_created: { source?: 'onboarding' | 'webhook' | 'import' };
  collaborator_invited: { role?: 'partner' | 'planner' | 'collaborator' | 'viewer' };
  mobile_nav_used: { module?: ModuleKey };
  error_encountered: { scope?: string; code?: string };
  feast_started: { source?: 'canvas' | 'direct' | 'dream'; template?: string; compassComplete?: boolean };
  meal_template_applied: { template?: string; scenesCreated?: number; scenesRemoved?: number };
  scene_opened: { sceneType?: string; completionState?: string };
  dish_created: { source?: 'manual' | 'suggested' | 'imported'; requiredStepsCompleted?: number };
  dish_assessment_changed: { requirementCategory?: string; priorState?: string; newState?: string };
  guest_conflict_resolved: { resolutionType?: string; guestsAffected?: number };
  brief_previewed: { readiness?: boolean; openQuestions?: number };
  brief_version_created: { version?: number; completeness?: number; changedSectionCount?: number };
  sync_conflict_encountered: { objectType?: string; resolution?: string };
}

/** Shared context attached to every event (all optional, all non-identifying). */
export interface AnalyticsContext {
  workspaceId?: string;
  userId?: string;
  surface?: 'web' | 'client' | 'server';
}
