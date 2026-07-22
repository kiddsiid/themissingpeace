# The Feast Studio

## Redesign Review and Implementation Plan

**Product:** The Missing Peace Wedding Planning Engine  
**Surface:** The Feast Studio  
**Status:** Implementation ready redesign specification  
**Reviewed build:** `https://feast-journey-1.preview.emergentagent.com/?utm_source=share`  
**Product constraints:** Mobile first collaboration at launch, editable partner labels, advisory financial guidance only, vendors remain internal records in version one, no public guest pages, and WCAG 2.2 AA.

## 1. Executive decision

The current Feast Studio has found its voice. “What should the day taste like?” is a strong opening, the private tasting room metaphor belongs inside The Missing Peace, and the movement from intention to courses to presentation is more emotionally distinctive than a standard catering checklist. The meal scenes, dish stories, religious and dietary considerations, and caterer brief are the right raw materials.

The current interface is still organized like a themed landing page, however, rather than a planning engine. The page asks users to scroll through a large hero, a horizontal course canvas, a presentation gallery, and several modal tools. It looks polished in isolated moments, but the layout does not continuously answer the four questions that matter during wedding meal planning: what are we building, who can safely eat it, can the caterer execute it, and what decision should we make next?

The redesign should turn Feast Studio into a three zone planning workspace that preserves the emotional language while adding operational intelligence. The recommended model is:

| Zone | Purpose | Desktop behavior | Mobile behavior |
| --- | --- | --- | --- |
| Feast Map | Organizes the meal journey and its scenes | Persistent left rail | Dedicated Flow view |
| Tasting Canvas | Builds the active scene and its dishes | Primary center workspace | Full width active view |
| Peace Panel | Explains coverage, cost, risk, readiness, and next action | Persistent right rail | Bottom sheet and Insights view |

The hero should become a compact setup and summary area, not the first full viewport. Presentation choices should influence the active meal plan instead of occupying a separate visual gallery near the bottom of the page. Guest care, restrictions, and the caterer brief should become connected views generated from the same meal data rather than isolated modal destinations.

This is the important strategic distinction: The Feast Studio should not try to become catering operations software, a restaurant CRM, or a complex spatial design tool. It should become the couple’s decision environment for creating a meaningful, inclusive, executable wedding meal and translating it into a brief a caterer can actually use.

## 2. What the current direction gets right

The emotional frame is the strongest part of the current direction. The language treats food as memory, hospitality, culture, and care. That is a meaningful product distinction. Most wedding planning tools reduce catering to budget lines, menu options, and vendor contact information. Feast Studio can own the space between inspiration and execution by asking what the meal should mean, then turning that answer into a practical plan.

The nine scene meal journey is also useful. Welcome Drink, Passed Bites, Grazing Table, First Course, Main Course, Dessert, Late Night Bite, Tea and Coffee, and Sendoff Treat give users a way to imagine the whole guest experience. The sequence is more evocative than “appetizer, entrée, dessert,” and it creates natural moments where cultural traditions, family stories, and hospitality choices can live.

The Add Dish form contains unusually good planning categories. Story, presentation, execution notes, friendly for, compliance, service style, and mood are the correct dimensions. The problem is not the data itself. The problem is that every dimension appears at once, before users understand what is required, what is optional, and what changes downstream.

The visual system also has a credible foundation. The ivory, charcoal, brass, candlelight, editorial serif typography, and quiet motion feel warm and private. The aesthetic can become premium without becoming sterile. It needs stronger contrast, tighter scale, and more disciplined use of space, not a new personality.

## 3. Current build findings

### 3.1 Critical layout defect

The first visual viewport is dominated by a washed out food image. The actual title, intention field, and setup controls begin below the fold. In the inspected desktop build, the hero section measured approximately 1,273 pixels tall and the primary heading began around 961 pixels from the top of the application viewport.

This is not only an art direction problem. The hero image wrapper carries an `absolute` utility but computes as `position: relative`, which places the image in normal document flow. A likely cause is a more specific paper or card selector that overwrites the positioned child. The fix must scope decorative container rules so they do not overwrite Tailwind positioning utilities. Add a visual regression test that asserts the image wrapper computes to `position: absolute` and the complete hero remains under 480 pixels on desktop.

### 3.2 Mobile navigation failure

The global navigation is implemented as `hidden md:flex`. No alternate mobile navigation appears in the header markup. Below the medium breakpoint, Dream, Peace Center, The Board, Feast Studio, Palette, Attire, Vendors, and Guests disappear without a replacement. This makes the current mobile experience a dead end.

The redesign must include a real mobile application shell. Primary destinations should use a four item bottom navigation: Dream, Peace, Board, and More. More opens a full height menu containing Feast Studio, Palette, Attire, Vendors, Guests, and project settings. When the user is inside Feast Studio, the top bar should show a back control, “Feast Studio,” collaborator presence, save state, and an overflow menu.

### 3.3 Weak first action

The opening view asks for an intention and three abstract selections, but does not explain what the choices will change. “Service feeling,” “Emotional root,” and “Hospitality standard” are attractive phrases, yet they behave like unconnected taste questions. Users need immediate feedback such as “This creates a family style, abundant, culturally rooted meal with high guest care.”

Each choice should update a visible Feast Compass summary. That summary should show meal format, guest care standard, expected service complexity, estimated courses, and the next decision. A user should understand why the setup matters before committing time to the canvas.

### 3.4 Horizontal course canvas is hard to control

The meal scenes appear in one long horizontal track with an instruction to scroll sideways. On desktop, only a few scenes are visible. On mobile, horizontal page regions compete with vertical scrolling and can hide content without a clear progress indicator. The track also makes reordering, deleting, and understanding completion difficult.

Replace the horizontal canvas with a persistent vertical Feast Map on desktop. Each scene row should show its order, title, dish count, guest coverage state, cost state, and readiness. On mobile, provide a dedicated Flow view with the same vertical list. The active scene opens into the Tasting Canvas. A compact scene switcher can remain horizontally scrollable inside the active view, but the complete plan must always be available as a vertical list.

### 3.5 Empty intelligence panel

The right side currently shows a large “Warming the room…” placeholder. It occupies premium space without helping the user decide anything. A blank preview makes the experience feel unfinished and creates a strong dependency on background generation.

The right rail should always contain useful deterministic information before any generated imagery exists. Default content should include guest coverage, unresolved restrictions, estimated cost range, execution complexity, open decisions, and caterer brief readiness. Visual generation may appear as an optional secondary preview, never as the only value in the panel.

### 3.6 Modal overload

Add Dish, Guest Care, Restrictions, and Caterer Brief are all promoted as peer actions. This fragments one connected planning model into separate overlays. The Add Dish modal is visually clean on desktop, but it contains two dense columns, small labels, thirteen friendly for chips, three compliance states, two selects, several long text fields, and an embedded writing assistant. On mobile it collapses into one long sheet with the primary action positioned after a lengthy scroll.

Add Dish should use progressive disclosure. The first save requires only scene, dish name, and role in the meal. Guest fit and production details should appear as clearly labeled steps or expandable sections. Desktop may use a right side drawer up to 640 pixels wide. Mobile must use a full screen sheet with a sticky header, step indicator, and sticky footer outside the scrolling content.

### 3.7 Accessibility gaps

The inspected close button in the Add Dish dialog has no accessible name. Several visible form labels appear as generic text while the inputs are named only by placeholder. Navigation destinations are buttons rather than links, which weakens browser history, deep linking, and expected keyboard behavior. The design also relies on very light gray and brass text at small sizes.

Every input requires a programmatic label and optional description. Every icon button needs an accessible name. Dialogs require `role="dialog"`, `aria-modal="true"`, an associated title, focus trapping, escape handling, focus restoration, and background scroll lock. Routes must use real links. All neutral text, brass text, borders, selected states, and focus rings must meet WCAG 2.2 AA contrast requirements.

### 3.8 Loading and recovery are not designed

Guest Care remained in “Setting the table…” while the preview services were unavailable. The wrapper could wake the service, but the application itself did not explain whether data was loading, unavailable, or safe to retry.

Every data dependent surface needs four explicit states: loading, empty, failed, and stale. Skeletons should preserve layout for no more than a reasonable request period, then become a plain language recovery state. Existing local edits must remain visible when remote intelligence is unavailable. Users must be able to continue editing the meal without generated recommendations.

## 4. Product north star

**Build a meal every guest can enter, understand, and enjoy.**

The earlier product language “Build the world your love will walk into” still works at the Wedding Planning Engine level. Feast Studio should express that promise at the table. It is the place where the couple turns the Wedding Compass into a meal journey, sees who is included or excluded by each decision, understands execution and cost consequences, and produces a living caterer brief.

The successful Feast Studio experience should feel like a private tasting conversation guided by an exceptional planner. It should never feel like a catering intake form. It should also never hide operational reality behind poetry. Emotional language introduces the decision, then the interface must show the practical consequence.

## 5. Revised information architecture

### 5.1 Feast Studio route structure

Use stable, shareable application routes.

| Route | Purpose |
| --- | --- |
| `/weddings/:weddingId/feast` | Feast overview and readiness |
| `/weddings/:weddingId/feast/flow` | Complete meal scene map |
| `/weddings/:weddingId/feast/scenes/:sceneId` | Active scene workspace |
| `/weddings/:weddingId/feast/guests` | Guest meal coverage and exceptions |
| `/weddings/:weddingId/feast/requirements` | Religious, dietary, allergy, and preparation requirements |
| `/weddings/:weddingId/feast/presentation` | Service and presentation decisions |
| `/weddings/:weddingId/feast/brief` | Caterer brief preview and versions |

The global application shell should use links and preserve browser history. Opening a dish or insight may use a route backed drawer, allowing refresh, deep linking, and browser back behavior.

### 5.2 Feast Studio overview

The overview is the entry state after Dream has produced the Wedding Compass. It contains a compact Feast Header, a readiness summary, the next best action, the meal flow preview, and recent decisions. It should not repeat the entire editor.

The Feast Header should be no taller than 360 pixels on desktop and 260 pixels on mobile. It includes the one line intention, a subtle image or texture, editable setup choices, and a Feast Compass summary. The primary action is contextual: “Choose your meal shape” for a new plan, “Continue Main Course” for an active plan, or “Resolve 3 guest care gaps” for a plan with coverage risks.

### 5.3 Feast Map

The Feast Map is the source of truth for meal sequence. It supports templates, custom scenes, reorder, duplicate, rename, archive, and timing. Default templates should be offered as starting points, not enforced structures.

Recommended templates include plated dinner, family style celebration, cultural feast, stations and grazing, cocktail reception, brunch, and intimate dinner. A template creates scenes and suggested service transitions. The user can remove any scene.

Each scene row displays scene number, name, time or order, dish count, guest coverage status, estimated cost range, and readiness. Status language should be concrete: Empty, In progress, Needs guest review, Needs caterer confirmation, or Ready for brief.

### 5.4 Tasting Canvas

The active scene canvas contains the scene purpose, service details, dishes, guest fit, and execution notes. Dish cards should be easy to scan. The collapsed card shows dish name, role, service style, two or three most important requirement states, estimated cost range, and confirmation status. Expanding a card shows story, ingredients, presentation, production notes, evidence, comments, and history.

The center workspace must keep one primary action visible: Add dish. Secondary actions include Suggest a dish, Import from caterer menu, Duplicate from another scene, and Add a family tradition. Generated suggestions always create drafts and never overwrite confirmed data.

### 5.5 Peace Panel

The Peace Panel translates the current plan into intelligence. It must use deterministic plan data first and generated guidance second.

Its default sections are:

1. Guest coverage: number covered, number with unknown coverage, and number with conflicts.
2. Cost guidance: current estimated range, target per guest, and primary drivers. This remains advisory and does not process payments.
3. Execution: equipment, staffing, service, timing, and venue concerns.
4. Open decisions: ranked by impact and urgency.
5. Brief readiness: percentage of required caterer brief fields complete.
6. Next action: one clear recommendation with an explanation.

On mobile, Peace Panel content becomes the Insights destination and contextual bottom sheets. The highest risk insight may appear as an inline card in the active scene, but the complete panel should never be permanently inserted below a long editor.

## 6. Desktop layout specification

### 6.1 Application shell

The desktop application shell uses a 64 pixel sticky global header. The brand sits left. The primary navigation occupies the center. The right side shows collaboration presence, save state, notifications, and account controls. Keep the current editorial warmth, but reduce decorative copy in the header.

Below the global header, Feast Studio uses a 48 pixel contextual bar containing the Feast Studio title, Overview, Flow, Guests, Requirements, Presentation, and Brief. The contextual bar becomes sticky after the Feast Header scrolls away.

### 6.2 Workspace grid

Use the following desktop layout from 1280 pixels upward:

| Region | Width | Behavior |
| --- | ---: | --- |
| Feast Map | 240 to 280 pixels | Sticky beneath contextual bar, independent scroll only when required |
| Tasting Canvas | Minimum 560 pixels, fluid | Primary document flow |
| Peace Panel | 320 to 360 pixels | Sticky beneath contextual bar |

At 1024 to 1279 pixels, collapse the Peace Panel into a 320 pixel drawer opened by an Insights button. Keep Feast Map at 224 pixels. At 768 to 1023 pixels, use a two pane layout with a 208 pixel Feast Map and the Tasting Canvas. Below 768 pixels, use the mobile architecture.

The main content container should support wide screens without stretching text indefinitely. Set the application maximum content width around 1,520 pixels. Editor reading width should remain between 620 and 760 pixels.

### 6.3 Feast Header

The desktop header uses a two column card. The left side contains the eyebrow, title, one sentence explanation, intention field, and editable setup chips. The right side contains the Feast Compass with four summary rows: meal shape, guest care, estimated complexity, and current next action. A low contrast culinary image may sit behind the right side only. Do not place a full bleed image underneath form content.

The header should never push the first meaningful action below the first desktop viewport. At 1366 by 768, users must see the title, intention, setup summary, primary action, and the beginning of the meal map without scrolling.

### 6.4 Visual hierarchy

Use a four level content hierarchy:

| Level | Treatment | Use |
| --- | --- | --- |
| Page title | Display serif, 48 to 56 pixels | One per page |
| Section title | Display serif, 30 to 36 pixels | Major workspace regions |
| Object title | Display or UI serif, 20 to 24 pixels | Scenes and dishes |
| UI label | Manrope, 12 to 14 pixels | Controls and metadata |

Do not use 10 pixel uppercase copy as essential instruction. Eyebrows may use 11 to 12 pixels with moderate tracking. Body text should be at least 15 pixels with a 1.5 line height. Use brass as an accent and selected border, not as the only text color for important information.

## 7. Mobile experience specification

### 7.1 Mobile shell

The mobile top bar is 56 pixels plus the safe area inset. It contains a back control or brand mark, the current surface title, save state, collaborator presence, and overflow. The bottom navigation is 64 pixels plus the safe area inset and contains Dream, Peace, Board, and More.

Inside Feast Studio, a second level mobile navigation appears as four destinations: Flow, Dishes, Guests, and Brief. This may be a segmented control below the compact header or a contextual menu inside the page. Do not stack two permanent bottom bars.

All touch targets must be at least 44 by 44 pixels. Bottom actions must account for `env(safe-area-inset-bottom)`. The keyboard must not cover the focused field or primary action.

### 7.2 Mobile Feast overview

The hero becomes a compact 180 to 240 pixel card. Show the title, intention, progress, and one primary action. Move the image to a small clipped region or remove it entirely on narrow screens. The first viewport should communicate current state, not atmosphere alone.

Below the header, show three cards in this order: Next action, Feast readiness, and Meal flow. A user should be able to resume work with one thumb within seconds.

### 7.3 Mobile meal flow

The complete flow is a vertical list. Each scene is a 72 to 88 pixel row with title, dish count, coverage state, and an affordance. Reordering uses long press drag, plus an accessible Move up and Move down menu. Tapping a scene opens its dedicated view.

Within an active scene, a horizontal scene switcher may show the previous, current, and next scene, but it is a shortcut rather than the only navigation. The scene header stays sticky beneath the mobile top bar. Add Dish is a sticky bottom action.

### 7.4 Mobile dish editor

Use a full screen sheet with four sections: Basics, Guest fit, Production, and Meaning. Display one section at a time for new dishes. Editing an existing dish may open the complete form with collapsible sections.

The header contains Close, the dish or action title, and save status. The footer contains Back and Continue during creation, then Save Dish on the last section. The footer must sit outside the scroll container.

Inputs should use native keyboard types where relevant. Selection chips must wrap cleanly and remain at least 44 pixels tall. Avoid placing long chip sets above required fields. Put requirement search and selected requirements before the complete taxonomy.

### 7.5 Mobile guest care

Guest care should not open an indefinite loading panel. The first view shows three numbers: covered, needs review, and conflict. Below, group guests by actionable state. Selecting a guest shows their requirements, the dishes they can eat, unknowns, and conflicts.

Provide a “Show affected dishes” filter and a “Resolve” action that opens the relevant dish. Do not ask users to maintain the same restriction manually in both Guests and Feast Studio.

### 7.6 Offline and poor connection behavior

Mobile first collaboration requires resilient drafts. Save local changes immediately to IndexedDB, show “Saved on this device,” and synchronize when the connection returns. A failed sync should not discard edits. If another collaborator changed the same dish, present a field level comparison and allow Keep mine, Keep theirs, or Combine where appropriate.

## 8. Core user journeys

### 8.1 First entry from Dream

Dream creates the Wedding Compass. Feast Studio receives event date, estimated guest count, budget guidance, location, venue if known, cultural and religious priorities, hospitality intent, and visual mood. The first Feast Studio screen confirms only information that affects the meal.

The recommended setup flow is:

1. Confirm the meal’s intention.
2. Choose a meal shape or start from a recommended template.
3. Confirm guest care requirements already known from Guests and Dream.
4. Set advisory budget per guest or total food and beverage guidance.
5. Review the generated Feast Map.

The output is a Feast Plan and a ranked next action. Do not force users through setup again when enough Wedding Compass data already exists.

### 8.2 Build a scene

The user opens a scene and sees its purpose, timing, service style, and current dishes. Empty scenes offer three choices: add a dish, request suggestions, or mark the scene as intentionally empty. Dish suggestions should use the Wedding Compass and current plan, then explain why each suggestion fits.

Adding a dish creates a draft after Basics. Guest fit runs an initial ingredient based compatibility assessment only after ingredients are present. The interface must distinguish automated assessment from caterer confirmation. Production details may remain incomplete until a caterer is chosen.

### 8.3 Resolve guest care

The guest coverage engine compares each dish with guest requirements. It does not claim medical or religious certainty from ingredients alone. The result is Compatible, Unknown, Confirmed, or Conflict.

The user opens a conflict, sees the affected guests, the reason, and the options: adjust the dish, add an alternative, confirm a preparation protocol, or mark the guest as receiving a separate meal. Every resolution updates coverage and the caterer brief.

### 8.4 Review feasibility

The Peace Panel evaluates the plan against guest count, venue facilities, service style, meal timing, staffing assumptions, and advisory budget. It identifies risks such as too many individually plated choices, a buffet without sufficient service time, hot food without a holding plan, or a late night bite that conflicts with venue end time.

Each risk includes impact, evidence, and one recommended action. Recommendations must be dismissible or accepted into the decision log.

### 8.5 Produce the caterer brief

The Caterer Brief is a live view generated from the Feast Plan, not a separately maintained document. It contains event facts, meal intention, service sequence, dishes, guest counts, requirement matrix, religious and allergy protocols, presentation notes, equipment and staffing assumptions, open questions, confirmation status, and decision history.

Version one supports preview, internal comments, PDF export, and marking a version as shared externally through another channel. It does not create a vendor portal or public sharing page. When the underlying plan changes, the brief shows “Update available” and lists the sections affected before creating a new version.

## 9. Religious, dietary, and allergy design

The current “Friendly for” chips and three compliance labels are too ambiguous for high trust planning. “Halal friendly,” “Kosher style,” and “Verified safe” can imply a level of assurance the system does not possess. Replace the single flat taxonomy with requirement, assessment, evidence, and preparation layers.

### 9.1 Requirement categories

| Category | Example requirements |
| --- | --- |
| Religious | Halal meat, zabiha preference, no pork, no alcohol, kosher certified, meat and dairy separation, pareve, Passover requirements |
| Dietary | Vegan, vegetarian, pescatarian, gluten avoidance, dairy avoidance |
| Allergy | Peanut, tree nut, shellfish, fish, egg, milk, wheat, soy, sesame and custom allergens |
| Preparation | Dedicated utensils, dedicated fryer, separate prep area, sealed meal, certification required |
| Preference | Low spice, child friendly, cultural preference and texture preference |

“Kosher style” may be retained only as “Kosher style, not certified” and must never satisfy a guest requirement for certified kosher food. “Halal compatible ingredients” may indicate an ingredient review, but it must not equal halal meat or zabiha confirmation.

### 9.2 Assessment states

| State | Meaning | UI treatment |
| --- | --- | --- |
| Unknown | Not enough information | Neutral gray, action required |
| Ingredient compatible | Listed ingredients appear compatible | Blue or sage outline, clearly unconfirmed |
| Vendor confirmed | Caterer confirmed sourcing and preparation for this event | Green with confirmer and date |
| Certification documented | Relevant certificate or named certifier recorded | Green with evidence link |
| Conflict | Known incompatibility | Red with affected guests and resolution action |

Never use “safe” as a universal status. Allergy safety depends on preparation and cross contact, while religious compliance depends on sourcing, handling, and often certification or supervision. The interface should say exactly what has been checked.

### 9.3 Evidence record

Each confirmation stores source type, source name, confirmer, date, notes, expiration where applicable, attached document reference, and affected dishes. Vendors remain internal records in version one. The couple or planner records confirmation; the caterer does not need a portal account.

## 10. Interaction design

### 10.1 Autosave

Save lightweight field edits after 600 milliseconds of inactivity. Save discrete choices immediately. Display Saving, Saved, Saved on this device, Sync failed, or Conflict. Do not use toast notifications for every successful save.

### 10.2 Undo

Archive, delete, reorder, bulk tag, and template actions provide a ten second undo toast. Permanent deletion occurs only after the undo window or explicit confirmation for objects with linked decisions.

### 10.3 Drag and reorder

Scenes and dishes support pointer drag with a visible handle. The drop target must show insertion position. Keyboard users can open an actions menu and choose Move up, Move down, Move to scene, or Move to position.

### 10.4 Choice feedback

Selecting service feeling, emotional root, hospitality standard, meal shape, presentation style, or mood must change a visible summary. The user should see the effect on recommended scenes, service complexity, guest experience, or presentation. Decorative selection without consequence should be removed.

### 10.5 Generated assistance

Replace vague states such as “Warming the room…” with precise states: Creating three dish drafts, Checking 12 guest requirements, or Building preview. Generated work can be canceled. Failure returns the user to their existing plan with a retry action. Suggestions are labeled Draft and include a short rationale.

### 10.6 Collaboration

Show active collaborators as avatars or initials. When another person is editing the same dish, show presence at the object level. Avoid hard locking the entire plan. Comments may attach to a scene, dish, requirement, or brief section. Partner labels are editable and never hard coded as bride and groom.

### 10.7 Decision history

Important actions create a human readable decision record: “Changed Main Course to family style,” “Added a separate certified kosher meal for three guests,” or “Accepted caterer estimate of $86 to $94 per guest.” Every record stores actor and time. Users may add context or reverse a reversible decision.

## 11. Visual system

### 11.1 Color tokens

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#F7F4EE` | Application background |
| `surface` | `#FFFDFC` | Primary cards and sheets |
| `ink` | `#201C18` | Primary text |
| `inkMuted` | `#6D645B` | Secondary text |
| `brassText` | `#7A531A` | Accessible brass text |
| `brass` | `#A8782A` | Borders, icons and selection accents |
| `candle` | `#F2B134` | Warm highlight, not body text |
| `sage` | `#2F6D55` | Confirmed and positive states |
| `warning` | `#9A5716` | Needs confirmation |
| `danger` | `#A23B32` | Conflicts and destructive actions |
| `border` | `rgba(32, 28, 24, 0.14)` | Default border |

Validate final token pairs with automated contrast tests. Do not assume the listed semantic role guarantees contrast in every combination.

### 11.2 Typography

Keep Cormorant Garamond for display and Manrope for interface text. Limit italic serif to intentions, quotations, and meaningful dish story accents. Do not use italic placeholders for primary form comprehension because placeholders disappear during entry and often have poor contrast.

JetBrains Mono may be used for technical confirmation metadata such as version numbers or timestamps, but it should not become a general third voice.

### 11.3 Imagery

Use imagery to establish taste, atmosphere, and presentation. Do not use a generic food image as a structural background beneath important controls. Mood images require consistent crop, color treatment, loading ratio, and text alternative behavior. Decorative images use empty alternative text. Meaningful reference images require user editable descriptions.

### 11.4 Motion

Use motion to explain state change: a dish moving between scenes, coverage recalculating, a panel opening, or a brief updating. Avoid page entry motion that delays access to controls. Respect `prefers-reduced-motion`. Functional transitions should remain under 250 milliseconds unless they communicate a larger spatial move.

## 12. Component architecture

The current build appears to use a React style component system with Tailwind utilities. The recommended implementation is React with TypeScript, React Router, TanStack Query, React Hook Form, Zod, and a lightweight accessible primitive library such as Radix UI. The architecture does not depend on these exact libraries, but the behavior contracts below should remain.

| Component | Responsibility |
| --- | --- |
| `FeastStudioLayout` | Global and contextual shell, route outlet, responsive regions |
| `FeastHeader` | Intention, setup summary, Feast Compass and contextual primary action |
| `FeastMap` | Scene list, progress, reorder and scene actions |
| `FeastSceneRow` | One scene summary with readiness states |
| `TastingCanvas` | Active scene workspace |
| `DishCard` | Collapsed and expanded dish representation |
| `DishEditor` | Progressive dish creation and editing |
| `GuestCoverageSummary` | Covered, unknown and conflict metrics |
| `GuestCoverageTable` | Guest and dish matrix with filters |
| `RequirementEditor` | Requirement details, severity, evidence and preparation |
| `EvidenceRecord` | Vendor or planner confirmation metadata |
| `PeacePanel` | Cost, execution, coverage, decisions and next action |
| `PresentationEditor` | Service styles, mood, table experience and vendor notes |
| `CatererBriefPreview` | Live brief, completeness, changes and versions |
| `SaveStatus` | Local and remote persistence state |
| `CollaboratorPresence` | Active collaborators and object presence |
| `AppDialog` | Accessible desktop dialog contract |
| `MobileSheet` | Full screen mobile editor contract |
| `StateBoundary` | Loading, empty, stale, error and retry behavior |

Do not create separate state stores for Guest Care, Restrictions, and the Caterer Brief. They are projections of one Feast Plan, Guest model, and Requirement model.

## 13. Data model

```ts
type FeastPlan = {
  id: string;
  weddingId: string;
  intention: string;
  mealShape: MealShape;
  serviceFeeling?: string;
  emotionalRoot?: string;
  hospitalityStandard?: string;
  guestCount: number;
  advisoryBudgetTotalCents?: number;
  advisoryBudgetPerGuestCents?: number;
  currency: string;
  status: "draft" | "in_progress" | "ready_for_brief" | "confirmed";
  version: number;
  createdAt: string;
  updatedAt: string;
};

type MealScene = {
  id: string;
  feastPlanId: string;
  kind: string;
  title: string;
  purpose?: string;
  ordinal: number;
  plannedAt?: string;
  durationMinutes?: number;
  serviceStyle?: ServiceStyle;
  mood?: string;
  notes?: string;
  status: "empty" | "in_progress" | "needs_review" | "ready";
};

type Dish = {
  id: string;
  sceneId: string;
  name: string;
  role?: string;
  ingredients: DishIngredient[];
  story?: string;
  presentation?: string;
  executionNotes?: string;
  serviceStyle?: ServiceStyle;
  mood?: string;
  advisoryCostPerGuestCents?: CostRange;
  status: "draft" | "needs_confirmation" | "confirmed";
  source: "manual" | "suggested" | "imported";
  version: number;
};

type GuestRequirement = {
  id: string;
  guestId: string;
  category: "religious" | "dietary" | "allergy" | "preparation" | "preference";
  code: string;
  severity: "preference" | "required" | "safety_critical";
  notes?: string;
};

type DishAssessment = {
  id: string;
  dishId: string;
  requirementCode: string;
  state: "unknown" | "ingredient_compatible" | "vendor_confirmed" | "certification_documented" | "conflict";
  reasoning?: string;
  evidenceId?: string;
  assessedBy: "system" | "planner" | "partner" | "vendor_record";
  assessedAt: string;
};

type ConfirmationEvidence = {
  id: string;
  weddingId: string;
  vendorRecordId?: string;
  sourceType: "conversation" | "email_note" | "menu" | "certificate" | "contract" | "other";
  sourceName: string;
  confirmedBy: string;
  confirmedAt: string;
  expiresAt?: string;
  notes?: string;
  attachmentId?: string;
};

type CatererBriefVersion = {
  id: string;
  feastPlanId: string;
  version: number;
  status: "draft" | "finalized" | "superseded";
  snapshot: unknown;
  changedSections: string[];
  createdBy: string;
  createdAt: string;
};
```

Computed coverage, readiness, budget guidance, and execution risks should be derived server side or through shared domain functions. Do not persist multiple contradictory totals in different components.

## 14. API and realtime contracts

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/weddings/:weddingId/feast-plan` | Load plan, scenes, summary and permissions |
| `PATCH` | `/api/feast-plans/:planId` | Update setup and advisory budget fields |
| `POST` | `/api/feast-plans/:planId/scenes` | Add a scene or apply a template |
| `PATCH` | `/api/meal-scenes/:sceneId` | Update scene fields |
| `POST` | `/api/feast-plans/:planId/scenes/reorder` | Persist ordered scene identifiers |
| `POST` | `/api/meal-scenes/:sceneId/dishes` | Create a draft dish |
| `PATCH` | `/api/dishes/:dishId` | Update a dish with version guard |
| `POST` | `/api/dishes/:dishId/assessments/recalculate` | Recalculate ingredient based assessments |
| `POST` | `/api/assessments/:assessmentId/evidence` | Attach confirmation evidence |
| `GET` | `/api/feast-plans/:planId/guest-coverage` | Load guest coverage projection |
| `GET` | `/api/feast-plans/:planId/insights` | Load cost, execution, readiness and next action |
| `POST` | `/api/feast-plans/:planId/briefs` | Create a brief version from current data |
| `GET` | `/api/feast-plans/:planId/briefs/:version` | Load an immutable brief version |

Every mutable object should include a version number. Mutations send `expectedVersion`. A conflict returns HTTP 409 with the server object and changed fields. Client code must not silently overwrite newer collaborator changes.

Realtime events should be scoped to a wedding channel and contain object type, object identifier, version, changed fields, actor, and time. Presence events are ephemeral and should not be written into the permanent decision history.

## 15. State and persistence

Use TanStack Query or an equivalent server state layer for fetching, cache invalidation, optimistic mutations, and retry. Keep transient editor state in React Hook Form or local component state. Use a small shared store only for shell concerns such as open drawers, current scene, and collaboration presence.

Persist mobile drafts to IndexedDB with a mutation queue. Each queued mutation stores object identifier, base version, changes, local timestamp, and retry count. On reconnect, replay in order. Stop and present a merge interface on version conflict.

Generated recommendations and previews are expendable. User authored intentions, stories, notes, choices, requirements, and evidence are not. The persistence design should reflect that distinction.

## 16. Accessibility requirements

The release target is WCAG 2.2 AA.

| Area | Acceptance requirement |
| --- | --- |
| Navigation | All destinations reachable as links, current page announced, skip link present |
| Forms | Every control has label, description, error association and visible focus |
| Dialogs | Named dialog, focus trap, escape close, focus return and background lock |
| Drag | Keyboard reorder alternative and live announcement |
| Status | Save, sync, loading and conflict states announced without stealing focus |
| Color | No status conveyed by color alone; contrast meets AA |
| Motion | Reduced motion respected; no essential information hidden in animation |
| Touch | Minimum 44 by 44 pixel targets and adequate spacing |
| Zoom | Functional at 200 percent zoom and 320 CSS pixel reflow |
| Tables | Guest coverage matrix has row and column headers and mobile list alternative |

Run automated Axe checks in CI, but require manual keyboard, screen reader, zoom, and mobile reflow testing before release.

## 17. Performance requirements

The Feast overview should render useful cached or deterministic content without waiting for generated intelligence. Target Largest Contentful Paint under 2.5 seconds on a midrange mobile connection, Interaction to Next Paint under 200 milliseconds for local UI actions, and Cumulative Layout Shift under 0.1.

Reserve image aspect ratios. Lazy load mood and presentation images below the fold. Use responsive image sources and AVIF or WebP where supported. Virtualize only genuinely large guest tables, not ordinary scene or dish lists. Code split brief export and advanced presentation tools.

Do not block page rendering on service wake up, recommendation generation, or image generation. Provide cached insights with a “Refreshing” state when possible.

## 18. Analytics and product learning

Track events that answer whether Feast Studio helps couples make decisions and create an executable brief.

| Event | Important properties |
| --- | --- |
| `feast_started` | source, compass completeness, template |
| `meal_template_applied` | template, scenes created, scenes removed |
| `scene_opened` | scene type, completion state |
| `dish_created` | source, required steps completed |
| `dish_assessment_changed` | requirement category, prior state, new state |
| `guest_conflict_resolved` | resolution type, guests affected |
| `insight_accepted` | insight type, impact |
| `brief_previewed` | readiness, open questions |
| `brief_version_created` | version, completeness, changed sections |
| `sync_conflict_encountered` | object type, resolution |

Do not track dish stories, guest requirement notes, or other private text as analytics properties. Track only categorical and numeric product events.

## 19. Implementation order

### Release foundation

Fix the hero positioning regression, constrain the Feast Header, add the mobile shell, convert navigation buttons to routes, label every control, name every dialog, and implement useful loading, empty, error, and stale states. This work must land before expanding the feature set because the current layout and navigation defects distort every subsequent usability test.

### Workspace architecture

Build FeastStudioLayout, Feast Map, Tasting Canvas, and Peace Panel. Migrate the current meal scenes and dish data into the new structure. Replace the large horizontal canvas and bottom Presentation Studio section. Presentation becomes a connected route and an editable summary in the active scene.

### Guest intelligence

Implement the requirement taxonomy, assessment states, evidence records, guest coverage projection, and conflict resolution flow. Remove “Verified safe.” Update current tags to the more precise requirement and assessment model.

### Caterer handoff

Build brief readiness, preview, immutable versions, change detection, and PDF export. Keep vendors as records and keep sharing private in version one.

### Collaboration and resilience

Add object presence, comments, optimistic updates, version conflicts, IndexedDB drafts, reconnect synchronization, and decision history. Complete manual accessibility and mobile performance testing.

## 20. Engineering ticket map

| Ticket | Scope | Definition of done |
| --- | --- | --- |
| FS 001 | Hero and layout regression | Hero wrapper is absolute, header height meets breakpoint limits, first action appears in first viewport, visual tests pass |
| FS 002 | Responsive application shell | Desktop and mobile navigation work, routes are shareable, current destination is announced |
| FS 003 | Feast overview | Compact header, Compass summary, readiness and next action use real plan data |
| FS 004 | Feast Map | Create, rename, reorder, duplicate, archive and open scenes with keyboard support |
| FS 005 | Tasting Canvas | Scene editor and dish cards render all required states and preserve current data |
| FS 006 | Dish Editor | Progressive desktop drawer and mobile full screen flow with validation and sticky actions |
| FS 007 | Requirement model | Religious, dietary, allergy, preparation and preference requirements persist correctly |
| FS 008 | Coverage engine | Guest by dish assessment produces unknown, compatible, confirmed and conflict states |
| FS 009 | Evidence | Confirmations store source, confirmer, date, notes and attachments |
| FS 010 | Peace Panel | Coverage, cost, execution, open decisions, brief readiness and next action render without generated imagery |
| FS 011 | Presentation | Service and mood choices change plan summary and brief content |
| FS 012 | Caterer brief | Live preview, readiness, versions, changes and PDF export work privately |
| FS 013 | Autosave and offline | Local draft, sync status, replay and recovery work on mobile |
| FS 014 | Collaboration | Presence, comments and version conflict resolution work at object level |
| FS 015 | Accessibility | Automated and manual WCAG 2.2 AA acceptance suite passes |
| FS 016 | Observability | Product events, error reporting and performance monitoring are in place without private text capture |

## 21. Release acceptance scenarios

### New plan

A user who completed Dream opens Feast Studio on a 390 pixel wide phone. They can navigate away and back, understand the recommended meal shape, create the meal flow, add one dish, save offline, and see the saved draft after a refresh. No horizontal page overflow occurs.

### Religious requirement

A guest requires certified kosher food. A dish marked Kosher style, not certified does not count as coverage. The plan remains Unknown or Conflict until qualifying evidence is recorded. The caterer brief identifies the requirement and the open confirmation.

### Allergy requirement

A guest has a severe nut allergy. Ingredient compatibility alone does not mark the dish safe. The interface requires preparation and cross contact confirmation. The affected guest remains Needs review until the requirement is resolved.

### Collaboration

Two partners edit different scenes concurrently without blocking each other. They see presence and receive updates. If both edit the same dish from the same base version, the later save receives a merge interface rather than silently overwriting work.

### Service outage

Recommendation and preview services are unavailable. Existing scenes, dishes, guest coverage data, and local edits remain usable. The interface explains which intelligence is unavailable and offers retry without trapping the user in a perpetual skeleton.

### Caterer brief

The user changes the Main Course service style after creating brief version three. The brief view shows that an update is available, identifies the affected section, and creates version four without modifying version three.

### Accessibility

A keyboard user can navigate, add a dish, select requirements, reorder a scene, resolve a conflict, and close every dialog. Focus is always visible and returns to the triggering control. A screen reader announces labels, errors, save state, conflict state, and current navigation.

## 22. Competitive lessons without copying the competition

Prismm demonstrates the value of spatial accuracy, direct manipulation, collaboration, instant visual feedback, and operational reports. 3D Event Designer demonstrates that a sophisticated professional task can feel approachable when users manipulate familiar objects without CAD knowledge. Tripleseat demonstrates the value of event documents that update from one source of truth.

Feast Studio should borrow those product principles, not their scope. Version one does not need photorealistic 3D food, room CAD, caterer sales management, proposals, contracts, payments, or a vendor portal. It needs an emotionally compelling meal canvas, precise guest care, visible feasibility, collaborative decisions, and a living caterer brief. That is a sharper wedge and a more credible first release.

## 23. Final design standard

The finished Feast Studio should feel intimate before it feels technical, clear before it feels clever, and trustworthy before it feels magical. The poetry belongs in the invitation to decide. The interface must then make the decision legible.

The decisive test is not whether users enjoy scrolling through the page. It is whether two people can build a meal together on their phones, understand who is cared for, identify what still needs confirmation, and hand a caterer a brief that reduces ambiguity on the wedding day.

## References

1. [Prismm catering event planning](https://www.prismm.com/solutions/industry/catering)
2. [Prismm floor planning and collaboration](https://www.prismm.com/solutions/event-design-software/floor-planning-software-venues-planners-vendors)
3. [3D Event Designer for caterers](https://www.3deventdesigner.com/caterers)
4. [Tripleseat event order and document features](https://tripleseat.com/blog/key-tripleseat-features-to-kickstart-your-private-events-business-in-the-new-year/)
