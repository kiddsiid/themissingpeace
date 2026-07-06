// Capability map (Build Plan v2 §4.4). Enforce in BOTH RLS and the service layer.
import type { MemberRole } from '@/lib/types';

export type Capability =
  | 'workspace.delete' | 'workspace.billing' | 'members.manage'
  | 'plan.full'                 // tasks, vendors, documents, timeline, guests, budget
  | 'board.add' | 'comment' | 'vote' | 'task.complete_assigned'
  | 'budget.view_granted'       // category-level visibility only
  | 'document.upload' | 'view';

const ROLE_CAPS: Record<MemberRole, Capability[]> = {
  owner:        ['workspace.delete','workspace.billing','members.manage','plan.full','board.add','comment','vote','task.complete_assigned','document.upload','view'],
  partner:      ['plan.full','board.add','comment','vote','task.complete_assigned','document.upload','view'],
  planner:      ['plan.full','board.add','comment','vote','task.complete_assigned','document.upload','view'],
  collaborator: ['board.add','comment','vote','task.complete_assigned','view'],
  contributor:  ['budget.view_granted','comment','document.upload','view'],
  viewer:       ['view'],
  admin:        [], // platform support; NO wedding-data access without explicit temporary consent
};

export function can(role: MemberRole, cap: Capability): boolean {
  return ROLE_CAPS[role]?.includes(cap) ?? false;
}

// Which Poof targets a role may create (Build Plan v2 §5.3).
export function canPoofInto(role: MemberRole, target: string): boolean {
  if (can(role, 'plan.full')) return true;
  if (can(role, 'board.add')) return target === 'task' || target === 'decision';
  return false;
}
