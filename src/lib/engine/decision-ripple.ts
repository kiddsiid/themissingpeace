export interface AffectedObject {
  type: string;
  label: string;
  note: string;
  severity?: 'low' | 'med' | 'high';
}

const MENU_EFFECTS: AffectedObject[] = [
  { type: 'staffing', label: 'Staffing', note: 'Service staffing assumptions must be rechecked.', severity: 'high' },
  { type: 'rentals', label: 'Rentals', note: 'Place settings, serving pieces, and table equipment may change.', severity: 'med' },
  { type: 'timeline', label: 'Timeline', note: 'Dinner service timing and transitions will be recalculated.', severity: 'med' },
  { type: 'caterer_brief', label: 'Caterer brief', note: 'The service language becomes stale until regenerated.', severity: 'high' },
  { type: 'seating', label: 'Seating context', note: 'Table shape and server access need another look.', severity: 'med' },
  { type: 'money_map', label: 'Money Map guidance', note: 'Per-guest service and rental guidance will recompute.', severity: 'med' },
];

const CATEGORY_EFFECTS: Record<string, AffectedObject[]> = {
  guest: [
    { type: 'guests', label: 'Guest care', note: 'Guest requirements and counts may change.' },
    { type: 'seating', label: 'Seating', note: 'Assignments and capacity may need attention.', severity: 'med' },
    { type: 'money_map', label: 'Money Map', note: 'Per-guest guidance will recompute.', severity: 'med' },
  ],
  venue: [
    { type: 'timeline', label: 'Timeline', note: 'The date and venue anchor downstream milestones.', severity: 'high' },
    { type: 'vendors', label: 'Vendors', note: 'Availability and venue rules need review.' },
    { type: 'seating', label: 'Seating', note: 'The floor plan depends on this choice.' },
    { type: 'money_map', label: 'Money Map', note: 'Venue commitments change the advisory model.', severity: 'high' },
  ],
  budget: [
    { type: 'money_map', label: 'Money Map', note: 'Protected categories and scenarios will recompute.', severity: 'high' },
    { type: 'timeline', label: 'Timeline', note: 'Payment milestones may move.' },
  ],
  attire: [
    { type: 'atelier', label: 'Atelier', note: 'Looks and harmony become ready for review.' },
    { type: 'guest_experience', label: 'Guest Experience', note: 'Dress-code language may become stale.' },
  ],
  design: [
    { type: 'atmosphere', label: 'Atmosphere', note: 'Surface applications may need review.' },
    { type: 'atelier', label: 'Atelier', note: 'Palette context may shift.' },
  ],
  timeline: [
    { type: 'timeline', label: 'Timeline', note: 'Dependencies and day sequence will recalculate.', severity: 'med' },
  ],
  vendor: [
    { type: 'vendors', label: 'Vendors', note: 'The vendor record and open questions will update.' },
    { type: 'money_map', label: 'Money Map', note: 'Quote guidance may shift.' },
    { type: 'timeline', label: 'Timeline', note: 'Booking and document deadlines may move.' },
  ],
};

/** Pure consequence preview used by both the decision dialog and the server mutation. */
export function deriveDecisionRipple(
  category: string,
  previousChoice?: string | null,
  nextChoice?: string | null,
): AffectedObject[] {
  const normalized = category.toLowerCase();
  const choiceText = `${previousChoice ?? ''} ${nextChoice ?? ''}`.toLowerCase();
  if (normalized === 'menu' || /family style|plated|buffet|stations/.test(choiceText)) return MENU_EFFECTS;
  return CATEGORY_EFFECTS[normalized] ?? [
    { type: 'decisions', label: 'Decision ledger', note: 'The choice and its rationale will be recorded.' },
    { type: 'peace_center', label: 'Peace Center', note: 'The next-action story will refresh.' },
  ];
}
