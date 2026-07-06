// Domain types — mirror supabase/migrations/0001_init.sql enums and core tables.
// Keep in sync with the schema (Build Plan v2 §4).

export type MemberRole = 'owner' | 'partner' | 'planner' | 'collaborator' | 'contributor' | 'viewer' | 'admin';
export type PlanningStage =
  | 'just_engaged' | 'exploring_vision' | 'venue_hunting' | 'vendor_booking'
  | 'guest_list_building' | 'final_details' | 'wedding_week' | 'post_wedding';
export type BudgetConfidence = 'firm' | 'flexible' | 'unknown';

export type BoardType =
  | 'master_vision' | 'venue' | 'ceremony' | 'reception' | 'attire' | 'food_beverage'
  | 'florals_decor' | 'photo_video' | 'guest_experience' | 'music_entertainment'
  | 'stationery_signage' | 'honeymoon' | 'prewedding' | 'custom';
export type BoardItemType =
  | 'image' | 'pdf' | 'link' | 'pinterest_pin' | 'pinterest_board' | 'tiktok' | 'instagram'
  | 'vendor_site' | 'youtube' | 'screenshot' | 'note' | 'color_swatch' | 'file'
  | 'checklist' | 'decision_card' | 'vendor_card' | 'budget_card' | 'guest_experience_card';
export type BoardItemDisposition = 'captured' | 'organized' | 'discussing' | 'approved' | 'rejected' | 'poofed' | 'archived';

// The seven+ Poof targets (Build Plan v2 §5). 'peace_note' is an attach, not a link_target.
export type PoofTarget =
  | 'vendor' | 'task' | 'budget_item' | 'decision' | 'event' | 'document' | 'honeymoon_item' | 'guest_experience_note';
export type LinkTargetType = 'vendor' | 'task' | 'budget_item' | 'decision' | 'event' | 'document' | 'honeymoon_item';

export type DecisionStatus = 'open' | 'discussing' | 'needs_vote' | 'needs_planner_input' | 'approved' | 'deferred' | 'rejected' | 'changed';
export type TaskStatus = 'not_started' | 'in_progress' | 'waiting' | 'needs_decision' | 'done' | 'skipped';
export type VendorStatus =
  | 'idea' | 'shortlisted' | 'inquired' | 'responded' | 'quote_received' | 'comparing'
  | 'selected' | 'booked' | 'paid_deposit' | 'fully_paid' | 'declined' | 'unavailable' | 'archived';

// Peace Notes (Build Plan v2 §6½)
export type PeaceNoteType = 'letter' | 'vow' | 'gratitude' | 'dedication' | 'memory';
export type PeaceNoteVisibility = 'private_to_author' | 'shared_with_partner';
export type PeaceNoteLockKind = 'none' | 'date' | 'event';
export type PeaceNoteLockEvent = 'wedding_day' | 'anniversary';

export interface PeaceNote {
  id: string;
  workspaceId: string;
  authorId: string;
  type: PeaceNoteType;
  title?: string;
  // body is NEVER present client-side while locked; server gates decryption.
  body?: string;
  bodyPreview?: string;
  visibility: PeaceNoteVisibility;
  attachToType?: LinkTargetType;
  attachToId?: string;
  lock: { kind: PeaceNoteLockKind; date?: string; event?: PeaceNoteLockEvent; anniversaryIndex?: number };
  plannerAccess: boolean;
  openedAt?: string;
  createdAt: string;
}

// Peace Engine (Build Plan v2 §4.6 / §6)
export type RecommendationType =
  | 'next_action' | 'poof_suggestion' | 'decision_prompt' | 'budget_guidance'
  | 'vendor_gap' | 'guest_impact' | 'compass_check';
export type RecommendationStatus = 'new' | 'accepted' | 'dismissed' | 'deferred' | 'completed';
export type RiskType =
  | 'budget' | 'guest_count' | 'timeline' | 'vendor_booking' | 'document' | 'decision_bottleneck'
  | 'dream_mismatch' | 'planner_workload' | 'family_pressure' | 'weather' | 'destination_travel';

export interface PlanningRecommendation {
  id: string; workspaceId: string; engineRunId?: string;
  title: string; description?: string;
  recommendationType: RecommendationType; priority: 'low' | 'med' | 'high';
  reason?: string; linkedEntityType?: string; linkedEntityId?: string;
  status: RecommendationStatus; createdAt: string;
}

// Playlist (collaborative; Music & Entertainment)
export type PlaylistMoment = 'ceremony' | 'cocktail' | 'dinner' | 'first_dance' | 'party' | 'do_not_play' | 'other';
export type TrackSource = 'spotify' | 'apple_music' | 'youtube' | 'soundcloud' | 'other';
export interface PlaylistTrack {
  id: string; workspaceId: string; moment: PlaylistMoment;
  title: string; artist?: string; source: TrackSource; sourceUrl?: string;
  imageUrl?: string; note?: string; addedBy?: string; hearts?: number; createdAt: string;
}

// Guest CRM
export type RsvpStatus = 'pending' | 'accepted' | 'declined';
export interface Household { id: string; workspaceId: string; name: string; address?: string; relationshipGroup?: string; notes?: string; createdAt: string; }
export interface Guest {
  id: string; workspaceId: string; householdId?: string;
  firstName: string; lastName?: string; email?: string; phone?: string; relationship?: string;
  isChild?: boolean; plusOneEligible?: boolean; plusOneName?: string;
  invitedCeremony?: boolean; invitedReception?: boolean;
  rsvpStatus: RsvpStatus; mealChoice?: string; dietary?: string; accessibility?: string;
  travelingFrom?: string; songRequest?: string; notes?: string; createdAt: string;
}

// Honeymoon
export type HoneymoonStatus = 'dreaming' | 'shortlisting' | 'planning' | 'booked' | 'ready' | 'completed';
export interface HoneymoonProfile { id: string; workspaceId: string; destination?: string; startDate?: string; endDate?: string; budget?: number; status: HoneymoonStatus; notes?: string; }
export interface HoneymoonItem { id: string; workspaceId: string; kind?: string; title: string; status?: string; notes?: string; createdAt: string; }

// Money Map
export type MoneyMapPaymentStatus = 'planned' | 'due' | 'paid' | 'late' | 'waived' | 'cancelled';
export type MoneyMapFit = 'peaceful' | 'close' | 'stretched' | 'at risk';
export interface CostBenchmark {
  id: string; locationName: string; country?: string; state?: string; region?: string; metro?: string; city?: string;
  level: 'country' | 'state' | 'region' | 'metro' | 'city';
  sourceName: string; sourceYear: number; averageCost: number; averageGuestCount?: number; costPerGuest?: number;
  confidenceLevel: 'high' | 'medium' | 'low'; notes?: string;
}
export interface PaymentMilestone {
  id: string; workspaceId: string; budgetItemId?: string; vendorId?: string; contractDocumentId?: string;
  title: string; amount?: number; dueDate?: string; reminderDate?: string; milestoneKind: string;
  status: MoneyMapPaymentStatus; responsibleName?: string; notes?: string; paidAt?: string; createdAt: string;
}
export interface BudgetContribution {
  id: string; workspaceId: string; contributorName: string; promisedAmount?: number; receivedAmount?: number;
  intendedFor?: string; visibility: 'private' | 'category_only' | 'shared'; notes?: string; createdAt: string;
}
export interface BudgetScenario {
  id: string; workspaceId: string; name: string; weddingType?: string; guestCount?: number; targetBudget?: number;
  projectedTotal?: number; budgetFit?: MoneyMapFit; tradeoffNotes?: string; isPrimary?: boolean; createdAt: string;
}
