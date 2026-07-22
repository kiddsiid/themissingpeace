// Canonical seed content for the Living Canvas board slice — the Maya & Julian
// scenario from the design handoff's `wedding-state.js`. Used to hydrate a
// workspace that has no persisted canvas state yet.

import type { CanvasBoard } from './types';

export const CANVAS_SEED: CanvasBoard = {
  food: {
    identity: 'Family style feast',
    style: 'family',
    season: 'Fall',
    prompt: 'Food that honors family',
    serviceFeeling: 'Family style feast',
    emotionalRoot: 'Food that honors family',
    hospitalityStandard: 'thoughtful',
    mode: 'couple',
    moods: ['Abundant', 'Candlelit', 'Cultural'],
    courses: [
      {
        id: 'c1', name: 'The welcome pour', scene: 'A glass pressed into every hand under the courtyard lights', slot: 'welcome', mood: 'Candlelit', service: 'Passed & mocktail bar',
        staffing: '2 tray passers + 1 bar attendant', rental: 'Coupes, copper cups, brass trays, citrus wheels, handwritten labels', timing: '5:00–6:00pm · as guests arrive',
        dishes: [
          { id: 'd1', name: 'Fig & rosemary spritz', story: 'The couple’s signature, from their first trip to Tuscany — the drink they toasted with the night they got engaged.', plate: 'Coupe glasses on brass trays, a single rosemary sprig, passed at the door.', tags: ['v'], restrictions: ['Vegetarian', 'Vegan'], compliance: 'Contains alcohol (prosecco). Always poured beside its zero-proof twin.', execution: 'Confirm a non-alcoholic version is passed on the SAME tray so no guest has to ask. No alcohol stored behind the mocktail bar.', blessed: true, cost: 'moderate' },
          { id: 'd2', name: 'Pomegranate & mint cooler', story: 'For everyone who doesn’t drink — poured with the same care, never an afterthought.', plate: 'Copper cups, mint crown, pomegranate seeds, a handwritten “no alcohol” label.', tags: ['v'], restrictions: ['Vegan', 'Gluten free', 'Halal', 'Alcohol free'], compliance: 'Alcohol-free and made with no shared alcohol equipment.', execution: 'Store and pour from a dedicated station, clearly labeled, so alcohol-free guests are served with confidence.', blessed: false, cost: 'gentle' },
        ],
      },
      {
        id: 'c2', name: 'The grazing table', scene: 'One long, generous board everyone gathers around before dinner', slot: 'grazing', mood: 'Abundant', service: 'Grazing display',
        staffing: '1 attendant to replenish & answer questions', rental: 'Reclaimed wood boards, tiered stands, ceramic bowls, olive branch runner', timing: '5:30–6:30pm',
        dishes: [
          { id: 'd3', name: 'Harvest grazing board', story: 'A generous first impression — local cheeses, figs, warm bread, olives, honeycomb.', plate: 'Abundant wooden table, candlelight, fresh herbs spilling between bowls.', tags: ['v'], restrictions: ['Vegetarian'], compliance: 'Contains dairy, gluten & nuts. Not safe as-is for nut-allergy or vegan guests.', execution: 'Plate all nuts in ONE clearly-signed bowl at the far end. Keep a small nut-free, dairy-free board separate with its own serving utensils.', blessed: false, cost: 'moderate' },
        ],
      },
      {
        id: 'c3', name: 'The first course', scene: 'Warmth in a bowl as everyone finds their seat', slot: 'starter', mood: 'Candlelit', service: 'Plated',
        staffing: 'Standard plated service', rental: 'Small ceramic bowls, seeded garnish', timing: '7:00pm · once seated',
        dishes: [
          { id: 'd4', name: 'Autumn squash soup', story: 'Warmth in a cup as the room settles and the toasts begin.', plate: 'Small bowls, toasted pumpkin-seed garnish, drizzle of herb oil.', tags: ['v'], restrictions: ['Vegan', 'Gluten free', 'Dairy free', 'Nut free'], compliance: 'Naturally vegan and gluten-free.', execution: 'Verify the vegetable stock is certified gluten-free and no cream is finished in. Safe for nearly every table when confirmed.', blessed: true, cost: 'gentle' },
        ],
      },
      {
        id: 'c4', name: 'The main table', scene: 'Family-style platters passed down long candlelit tables', slot: 'main', mood: 'Abundant', service: 'Family style',
        staffing: '4 servers to place & pass platters', rental: 'Ceramic platters, brass serving spoons, trivets', timing: '7:30pm · the heart of the meal',
        dishes: [
          { id: 'd5', name: 'Saffron roast chicken with preserved lemon', story: 'Honors the groom’s family table — the Sunday dish his grandmother made for every gathering.', plate: 'Family-style on ceramic platters, herbs & citrus, served down the center of each table.', tags: [], restrictions: ['Gluten free', 'Dairy free', 'Halal'], compliance: 'Halal-FRIENDLY on ingredients — the meat source is NOT yet verified. Zabiha requested by the groom’s family.', execution: 'Confirm a Zabiha-certified meat source. Ask about separate utensils and confirm NO alcohol in the marinade. This is the family’s most-watched dish.', blessed: false, cost: 'higher' },
          { id: 'd6', name: 'Braised short rib', story: 'Deep, slow, and celebratory — the dish for the people who came to feast.', plate: 'Passed platters over root vegetables, glossy with the braise.', tags: ['beef'], restrictions: ['Gluten free'], compliance: 'Contains beef and alcohol (red-wine braise). Not halal, not for no-alcohol guests.', execution: 'Label clearly at the table. Do not present as the only main near the groom’s family — pair with the saffron chicken.', blessed: false, cost: 'higher' },
          { id: 'd7', name: 'Wild mushroom & herb orzo', story: 'So no one at the table is an afterthought — a main built for the plant-based guests, not a side.', plate: 'Individual skillets, shared family-style, shaved herbs on top.', tags: ['v'], restrictions: ['Vegetarian', 'Nut free'], compliance: 'Vegetarian as served; vegan on request (omit the finishing cheese).', execution: 'For vegan guests, plate their portion BEFORE cheese is added. Confirm the pasta is egg-free if needed.', blessed: true, cost: 'moderate' },
        ],
      },
      {
        id: 'c5', name: 'Something sweet', scene: 'A dessert table glowing with candles', slot: 'dessert', mood: 'Candlelit', service: 'Dessert display',
        staffing: '1 attendant', rental: 'Cake stands, glass domes, candle cluster', timing: '8:45pm',
        dishes: [
          { id: 'd8', name: 'Stone-fruit galettes', story: 'Rustic, golden, passed warm — the smell of the couple’s first shared kitchen.', plate: 'Dessert grazing table, candlelight, dusted sugar.', tags: ['v'], restrictions: ['Vegetarian'], compliance: 'Contains gluten & dairy.', execution: 'Offer a fruit sorbet alongside for gluten-free, dairy-free and vegan guests so the sweet moment includes everyone.', blessed: false, cost: 'moderate' },
        ],
      },
      {
        id: 'c6', name: 'The late-night bite', scene: 'Comfort in paper cones as the dance floor fills', slot: 'late', mood: 'Playful', service: 'Passed / boxed',
        staffing: '2 tray passers', rental: 'Paper cones, kraft trays, warmer', timing: '10:00pm',
        dishes: [
          { id: 'd9', name: 'Mini grilled cheese & tomato soup shots', story: 'Comfort for the dance floor — the snack they always split at midnight.', plate: 'Paper cones, passed warm at 10pm.', tags: ['v'], restrictions: ['Vegetarian'], compliance: 'Contains gluten & dairy.', execution: 'Keep a gluten-free bread batch ready for celiac guests, prepped on a clean surface.', blessed: false, cost: 'gentle' },
        ],
      },
      {
        id: 'c7', name: 'Mint tea & sendoff', scene: 'Mint tea and sweets before the last goodbye', slot: 'tea', mood: 'Cultural', service: 'Tea service',
        staffing: '1 attendant to pour', rental: 'Tea glasses, brass tray, sweets platter', timing: '11:00pm · before the sendoff',
        dishes: [
          { id: 'd10', name: 'Moroccan mint tea & baklava', story: 'How the bride’s family says goodnight — sweet mint tea poured high, a tray of honeyed sweets.', plate: 'Poured tableside from a brass pot, glasses on a tray, sweets fanned around.', tags: ['v'], restrictions: ['Vegetarian', 'Alcohol free'], compliance: 'Contains gluten, nuts (baklava) & honey.', execution: 'Sign the nut content clearly. Offer a nut-free sweet on the same tray for allergy guests.', blessed: false, cost: 'gentle' },
        ],
      },
    ],
    restrictions: [
      { id: 'r1', label: 'Vegetarian', category: 'dietary_requirement', verify: false, verified: false, notes: 'about 14 guests' },
      { id: 'r2', label: 'Vegan', category: 'dietary_requirement', verify: false, verified: false, notes: '4 guests' },
      { id: 'r3', label: 'Gluten free', category: 'ingredient_restriction', verify: true, verified: false, notes: '6 guests, 1 celiac — cross-contact risk' },
      { id: 'r4', label: 'Nut allergy', category: 'allergy', verify: true, verified: false, notes: '2 guests — separate prep required' },
      { id: 'r5', label: 'Halal', category: 'religious_compliance', verify: true, verified: false, notes: 'groom’s family — verify meat source' },
      { id: 'r6', label: 'Zabiha', category: 'religious_compliance', verify: true, verified: false, notes: 'groom’s parents — certified source required' },
      { id: 'r7', label: 'Kosher', category: 'religious_compliance', verify: true, verified: false, notes: '1 couple — certified, not kosher-style' },
      { id: 'r8', label: 'Alcohol free', category: 'preference', verify: false, verified: false, notes: 'several guests' },
      { id: 'r9', label: 'Kid friendly', category: 'preference', verify: false, verified: false, notes: '8 children' },
    ],
    guestCoverage: [
      { id: 'gc1', guestType: 'Halal & alcohol-free guest', icon: '☾', restrictions: ['Halal', 'Alcohol free'] },
      { id: 'gc2', guestType: 'Vegan & gluten-free guest', icon: '❀', restrictions: ['Vegan', 'Gluten free'] },
      { id: 'gc3', guestType: 'Kosher-certified guest', icon: '✡', restrictions: ['Kosher'] },
      { id: 'gc4', guestType: 'Severe nut-allergy guest', icon: '⚠', restrictions: ['Nut allergy'] },
      { id: 'gc5', guestType: 'Kid’s plate', icon: '☺', restrictions: ['Kid friendly'] },
      { id: 'gc6', guestType: 'Elder-friendly plate', icon: '♡', restrictions: ['Low spice'] },
    ],
    presentation: ['Warm candlelight over every table', 'Herb-forward garnish, nothing fussy', 'Handwritten cards at the grazing & tea tables'],
    bar: 'Beer, wine, 2 signatures & a full mocktail bar',
    moments: { welcome: true, cocktail: true, latenight: true },
    cocktails: [
      { id: 'k1', name: 'Fig & Rosemary Spritz', recipe: 'Fig, rosemary, prosecco, soda' },
      { id: 'k2', name: 'Pomegranate & Mint Cooler', recipe: 'Pomegranate, mint, lime, soda — zero proof' },
    ],
    notes: 'Local & seasonal. Dedicated nut-free & alcohol-free stations.',
  },
  palette: {
    name: 'Sage & Clay',
    colors: ['#8A9A80', '#BC7459', '#E7D2C8', '#F1EBDD', '#3A3631'],
    roles: ['Primary', 'Secondary', 'Accent', 'Neutral', 'Ink'],
    atmosphere: ['Warm', 'Candlelit', 'Earthy', 'Romantic'],
    journey: [
      { id: 'j1', moment: 'Ceremony', colors: ['#F1EBDD', '#8A9A80', '#FBF7EF', '#E7D2C8', '#3A3631'] },
      { id: 'j2', moment: 'Cocktail hour', colors: ['#8A9A80', '#B8924A', '#BC7459', '#F1EBDD', '#3A3631'] },
      { id: 'j3', moment: 'Reception', colors: ['#3A3631', '#8A4A33', '#B8924A', '#E7D2C8', '#F1EBDD'] },
    ],
  },
  attire: {
    dressCode: 'Garden formal',
    rules: ['No white or ivory for guests', 'Grass-friendly shoes for the lawn', 'Bring a wrap for after sunset', 'Earthy, candlelit tones encouraged'],
    looks: [
      { id: 'l1', party: 'Bride', title: 'Ivory silk slip', color: '#EFE7D6', accent: '#E7D2C8', notes: 'Low back, no train.', details: { Silhouette: 'Slip', Neckline: 'Cowl', Length: 'Floor', Fabric: 'Silk charmeuse' }, approvals: { Maya: true, Julian: false, Aria: true } },
      { id: 'l2', party: 'Groom', title: 'Olive three-piece', color: '#6E7257', accent: '#B8924A', notes: 'No tux. Brown shoes.', details: { Lapel: 'Notch', Fit: 'Tailored', Pieces: 'Three-piece', Shoes: 'Brown suede' }, approvals: { Maya: false, Julian: true, Aria: false } },
      { id: 'l3', party: 'Bridesmaids', title: 'Dusty rose, mismatched', color: '#D9B3B0', accent: '#C98BA0', notes: 'Same tone, own styles.', details: { Silhouette: 'Mixed', Neckline: 'Varied', Length: 'Midi–floor', Fabric: 'Chiffon' }, approvals: { Maya: true, Julian: true, Aria: true } },
    ],
  },
  inspirations: [
    { id: 'i1', title: 'One long, generous table', tag: 'Hospitality', room: 'feast' },
    { id: 'i2', title: 'Warm, candlelit tones', tag: 'Atmosphere', room: 'atmosphere' },
    { id: 'i3', title: 'Family & our people', tag: 'Feeling', room: 'feast' },
    { id: 'i4', title: 'Ivory slip, low back', tag: 'Attire', room: 'atelier' },
    { id: 'i5', title: 'Music past midnight', tag: 'Atmosphere', room: 'atmosphere' },
    { id: 'i6', title: 'Olive linen suit', tag: 'Attire', room: 'atelier' },
  ],
};

export const SEED_WEDDING_CONTEXT = {
  season: 'Fall',
  light: 'Golden hour',
  weddingPalette: 'Sage & Clay',
  compassSentence: 'An intimate, family-first celebration — warmth over show.',
};
