/* The Missing Peace — shared wedding state.
   One source of truth persisted in localStorage, readable & writable by every
   screen. Changes notify subscribers in this page AND propagate across screens
   via the browser 'storage' event, so navigating between screens stays in sync.

   Usage:
     const st = WeddingState.get();                 // read (a fresh copy)
     WeddingState.update(s => { s.compass.approved = true; });  // mutate + persist + notify
     const off = WeddingState.subscribe(s => render(s));        // react to changes
     WeddingState.peaceScore();                     // -> { score, band, factors }
     WeddingState.budget();                          // -> derived budget totals
*/
(function () {
  var KEY = 'tmp_wedding';
  var LEGACY = 'tmp_dream';

  // ---- seed (Maya & Julian scenario) ---------------------------------------
  var DREAM_SEED = [
    { id:'family', label:'Family & our people', type:'Our people', grad:'gs', phrase:'family and the people we love at the center', reflection:'If everyone we love is in one room, laughing, the rest is just decoration.', x:0,   y:-104, status:'dream' },
    { id:'warmth', label:'Warmth over show',    type:'The feeling', grad:'gc', phrase:'warmth over production',                     reflection:'We want it to feel like the best dinner party we have ever thrown — not a performance.', x:156, y:-52, status:'dream' },
    { id:'table',  label:'A shared table',      type:'Hospitality', grad:'gg', phrase:'one long, generous table of food',            reflection:'Family-style plates, passed around, nobody rushing. The meal is the event.', x:224, y:40, status:'dream' },
    { id:'music',  label:'Music & dancing',     type:'Atmosphere',  grad:'gb', phrase:'music and dancing well past midnight',        reflection:'The dance floor should never be empty. That is the memory we want.', x:104, y:120, status:'dream' },
    { id:'beauty', label:'Soft beauty',         type:'Aesthetic',   grad:'gr', phrase:'a soft, candlelit, natural beauty',           reflection:'Greenery, candlelight, nothing stiff or over-styled.', x:-104, y:120, status:'dream' },
    { id:'ease',   label:'Ease & calm',         type:'A boundary',  grad:'gs', phrase:'a calm that lets us be fully present',         reflection:'We do not want to be running the day. We want to be in it.', x:-224, y:40, status:'dream' },
    { id:'memory', label:'Memory & photos',     type:'What it means', grad:'gg', phrase:'photographs that remember how it felt',      reflection:'Not posed — the real faces, the tears, the toasts.', x:-156, y:-52, status:'dream' },
  ];

  var now = Date.now();
  function seed() {
    return {
      v: 7,
      wedding: { dateStatus:'dream', date:null, venue:'The Hollow Oak Estate', season:'Fall', light:'Golden hour', intimacy:90, palette:'Sage & Clay' },
      compass: { sentence:'', short:'An intimate, family-first celebration — warmth over show.', approved:false },
      dreams: DREAM_SEED.map(function (d) { return Object.assign({}, d); }),
      realized: [],

      guests: { invited:128, responded:92, attending:78, estimate:92 },

      website: {
        slug:'maya-and-julian',
        dressCode:'Garden formal',
        attire:[
          'Long dresses, tailored suits, or elevated separates',
          'Earthy, candlelit tones — olive, clay, dusty rose',
          'Grass-friendly shoes — the ceremony is on the lawn',
          'A wrap or layer for after sunset',
        ],
        registries:[
          { id:'rg1', name:'Zola',            note:'A little of everything',       url:'zola.com/maya-and-julian' },
          { id:'rg2', name:'Crate & Barrel',  note:'Home & kitchen',                url:'crateandbarrel.com/gift/maya-julian' },
          { id:'rg3', name:'Honeymoon Fund',  note:'Toward two weeks in Portugal',  url:'.../w/maya-and-julian/fund' },
        ],
        welcome:'We can’t wait to celebrate with the people we love most. Come hungry, wear something you can dance in, and help us fill the night.',
      },

      menu: {
        allergyNote:'Tell us about allergies or dietary needs when you RSVP — our caterer accommodates gluten-free, vegan, nut-free and more.',
        family:[
          { course:'To share',        name:'Harvest boards',        desc:'Local cheeses, figs, warm bread, olives' },
          { course:'From the table',  name:'Herb-roasted chicken',   desc:'Lemon, garlic, rosemary' },
          { course:'From the table',  name:'Braised short rib',      desc:'Red wine, root vegetables' },
          { course:'From the table',  name:'Wild mushroom orzo',     desc:'Vegetarian' },
          { course:'To finish',       name:'Seasonal galettes',      desc:'Stone fruit & honey' },
        ],
        plated:[
          { name:'Braised short rib',    desc:'Red wine, root vegetables' },
          { name:'Herb-roasted chicken', desc:'Lemon, garlic, rosemary' },
          { name:'Pan-seared salmon',    desc:'Citrus butter' },
          { name:'Wild mushroom orzo',   desc:'Vegetarian / vegan on request' },
        ],
      },

      board: {
        food: {
          identity:'Family style feast', style:'family', season:'Fall', prompt:'Food that honors family',
          serviceFeeling:'Family style feast',
          emotionalRoot:'Food that honors family',
          hospitalityStandard:'thoughtful',   // simple | thoughtful | every
          mode:'couple',                        // couple | planner | vendor
          moods:['Abundant','Candlelit','Cultural'],
          courses:[
            { id:'c1', name:'The welcome pour', scene:'A glass pressed into every hand under the courtyard lights', slot:'welcome', mood:'Candlelit', service:'Passed & mocktail bar',
              staffing:'2 tray passers + 1 bar attendant', rental:'Coupes, copper cups, brass trays, citrus wheels, handwritten labels', timing:'5:00–6:00pm · as guests arrive',
              dishes:[
                {id:'d1',name:'Fig & rosemary spritz',story:'The couple’s signature, from their first trip to Tuscany — the drink they toasted with the night they got engaged.',plate:'Coupe glasses on brass trays, a single rosemary sprig, passed at the door.',tags:['v'],restrictions:['Vegetarian','Vegan'],compliance:'Contains alcohol (prosecco). Always poured beside its zero-proof twin.',execution:'Confirm a non-alcoholic version is passed on the SAME tray so no guest has to ask. No alcohol stored behind the mocktail bar.',blessed:true,cost:'moderate'},
                {id:'d2',name:'Pomegranate & mint cooler',story:'For everyone who doesn’t drink — poured with the same care, never an afterthought.',plate:'Copper cups, mint crown, pomegranate seeds, a handwritten “no alcohol” label.',tags:['v'],restrictions:['Vegan','Gluten free','Halal','Alcohol free'],compliance:'Alcohol-free and made with no shared alcohol equipment.',execution:'Store and pour from a dedicated station, clearly labeled, so alcohol-free guests are served with confidence.',blessed:false,cost:'gentle'},
              ]},
            { id:'c2', name:'The grazing table', scene:'One long, generous board everyone gathers around before dinner', slot:'grazing', mood:'Abundant', service:'Grazing display',
              staffing:'1 attendant to replenish & answer questions', rental:'Reclaimed wood boards, tiered stands, ceramic bowls, olive branch runner', timing:'5:30–6:30pm',
              dishes:[
                {id:'d3',name:'Harvest grazing board',story:'A generous first impression — local cheeses, figs, warm bread, olives, honeycomb.',plate:'Abundant wooden table, candlelight, fresh herbs spilling between bowls.',tags:['v'],restrictions:['Vegetarian'],compliance:'Contains dairy, gluten & nuts. Not safe as-is for nut-allergy or vegan guests.',execution:'Plate all nuts in ONE clearly-signed bowl at the far end. Keep a small nut-free, dairy-free board separate with its own serving utensils.',blessed:false,cost:'moderate'},
              ]},
            { id:'c3', name:'The first course', scene:'Warmth in a bowl as everyone finds their seat', slot:'starter', mood:'Candlelit', service:'Plated',
              staffing:'Standard plated service', rental:'Small ceramic bowls, seeded garnish', timing:'7:00pm · once seated',
              dishes:[
                {id:'d4',name:'Autumn squash soup',story:'Warmth in a cup as the room settles and the toasts begin.',plate:'Small bowls, toasted pumpkin-seed garnish, drizzle of herb oil.',tags:['v'],restrictions:['Vegan','Gluten free','Dairy free','Nut free'],compliance:'Naturally vegan and gluten-free.',execution:'Verify the vegetable stock is certified gluten-free and no cream is finished in. Safe for nearly every table when confirmed.',blessed:true,cost:'gentle'},
              ]},
            { id:'c4', name:'The main table', scene:'Family-style platters passed down long candlelit tables', slot:'main', mood:'Abundant', service:'Family style',
              staffing:'4 servers to place & pass platters', rental:'Ceramic platters, brass serving spoons, trivets', timing:'7:30pm · the heart of the meal',
              dishes:[
                {id:'d5',name:'Saffron roast chicken with preserved lemon',story:'Honors the groom’s family table — the Sunday dish his grandmother made for every gathering.',plate:'Family-style on ceramic platters, herbs & citrus, served down the center of each table.',tags:[],restrictions:['Gluten free','Dairy free','Halal'],compliance:'Halal-FRIENDLY on ingredients — the meat source is NOT yet verified. Zabiha requested by the groom’s family.',execution:'Confirm a Zabiha-certified meat source. Ask about separate utensils and confirm NO alcohol in the marinade. This is the family’s most-watched dish.',blessed:false,cost:'higher'},
                {id:'d6',name:'Braised short rib',story:'Deep, slow, and celebratory — the dish for the people who came to feast.',plate:'Passed platters over root vegetables, glossy with the braise.',tags:['beef'],restrictions:['Gluten free'],compliance:'Contains beef and alcohol (red-wine braise). Not halal, not for no-alcohol guests.',execution:'Label clearly at the table. Do not present as the only main near the groom’s family — pair with the saffron chicken.',blessed:false,cost:'higher'},
                {id:'d7',name:'Wild mushroom & herb orzo',story:'So no one at the table is an afterthought — a main built for the plant-based guests, not a side.',plate:'Individual skillets, shared family-style, shaved herbs on top.',tags:['v'],restrictions:['Vegetarian','Nut free'],compliance:'Vegetarian as served; vegan on request (omit the finishing cheese).',execution:'For vegan guests, plate their portion BEFORE cheese is added. Confirm the pasta is egg-free if needed.',blessed:true,cost:'moderate'},
              ]},
            { id:'c5', name:'Something sweet', scene:'A dessert table glowing with candles', slot:'dessert', mood:'Candlelit', service:'Dessert display',
              staffing:'1 attendant', rental:'Cake stands, glass domes, candle cluster', timing:'8:45pm',
              dishes:[
                {id:'d8',name:'Stone-fruit galettes',story:'Rustic, golden, passed warm — the smell of the couple’s first shared kitchen.',plate:'Dessert grazing table, candlelight, dusted sugar.',tags:['v'],restrictions:['Vegetarian'],compliance:'Contains gluten & dairy.',execution:'Offer a fruit sorbet alongside for gluten-free, dairy-free and vegan guests so the sweet moment includes everyone.',blessed:false,cost:'moderate'},
              ]},
            { id:'c6', name:'The late-night bite', scene:'Comfort in paper cones as the dance floor fills', slot:'late', mood:'Playful', service:'Passed / boxed',
              staffing:'2 tray passers', rental:'Paper cones, kraft trays, warmer', timing:'10:00pm',
              dishes:[
                {id:'d9',name:'Mini grilled cheese & tomato soup shots',story:'Comfort for the dance floor — the snack they always split at midnight.',plate:'Paper cones, passed warm at 10pm.',tags:['v'],restrictions:['Vegetarian'],compliance:'Contains gluten & dairy.',execution:'Keep a gluten-free bread batch ready for celiac guests, prepped on a clean surface.',blessed:false,cost:'gentle'},
              ]},
            { id:'c7', name:'Mint tea & sendoff', scene:'Mint tea and sweets before the last goodbye', slot:'tea', mood:'Cultural', service:'Tea service',
              staffing:'1 attendant to pour', rental:'Tea glasses, brass tray, sweets platter', timing:'11:00pm · before the sendoff',
              dishes:[
                {id:'d10',name:'Moroccan mint tea & baklava',story:'How the bride’s family says goodnight — sweet mint tea poured high, a tray of honeyed sweets.',plate:'Poured tableside from a brass pot, glasses on a tray, sweets fanned around.',tags:['v'],restrictions:['Vegetarian','Alcohol free'],compliance:'Contains gluten, nuts (baklava) & honey.',execution:'Sign the nut content clearly. Offer a nut-free sweet on the same tray for allergy guests.',blessed:false,cost:'gentle'},
              ]},
          ],
          restrictions:[
            {id:'r1',label:'Vegetarian',category:'dietary_requirement',verify:false,verified:false,notes:'about 14 guests'},
            {id:'r2',label:'Vegan',category:'dietary_requirement',verify:false,verified:false,notes:'4 guests'},
            {id:'r3',label:'Gluten free',category:'ingredient_restriction',verify:true,verified:false,notes:'6 guests, 1 celiac — cross-contact risk'},
            {id:'r4',label:'Nut allergy',category:'allergy',verify:true,verified:false,notes:'2 guests — separate prep required'},
            {id:'r5',label:'Halal',category:'religious_compliance',verify:true,verified:false,notes:'groom’s family — verify meat source'},
            {id:'r6',label:'Zabiha',category:'religious_compliance',verify:true,verified:false,notes:'groom’s parents — certified source required'},
            {id:'r7',label:'Kosher',category:'religious_compliance',verify:true,verified:false,notes:'1 couple — certified, not kosher-style'},
            {id:'r8',label:'Alcohol free',category:'preference',verify:false,verified:false,notes:'several guests'},
            {id:'r9',label:'Kid friendly',category:'preference',verify:false,verified:false,notes:'8 children'},
          ],
          guestCoverage:[
            {id:'gc1',guestType:'Halal & alcohol-free guest',icon:'☾',restrictions:['Halal','Alcohol free']},
            {id:'gc2',guestType:'Vegan & gluten-free guest',icon:'❀',restrictions:['Vegan','Gluten free']},
            {id:'gc3',guestType:'Kosher-certified guest',icon:'✡',restrictions:['Kosher']},
            {id:'gc4',guestType:'Severe nut-allergy guest',icon:'⚠',restrictions:['Nut allergy']},
            {id:'gc5',guestType:'Kid’s plate',icon:'☺',restrictions:['Kid friendly']},
            {id:'gc6',guestType:'Elder-friendly plate',icon:'♡',restrictions:['Low spice']},
          ],
          presentation:['Warm candlelight over every table','Herb-forward garnish, nothing fussy','Handwritten cards at the grazing & tea tables'],
          bar:'Beer, wine, 2 signatures & a full mocktail bar',
          moments:{ welcome:true, cocktail:true, latenight:true },
          cocktails:[ { id:'k1', name:'Fig & Rosemary Spritz', recipe:'Fig, rosemary, prosecco, soda' }, { id:'k2', name:'Pomegranate & Mint Cooler', recipe:'Pomegranate, mint, lime, soda — zero proof' } ],
          notes:'Local & seasonal. Dedicated nut-free & alcohol-free stations.',
        },
        palette: { name:'Sage & Clay', colors:['#8A9A80','#BC7459','#E7D2C8','#F1EBDD','#3A3631'],
          roles:['Primary','Secondary','Accent','Neutral','Ink'],
          atmosphere:['Warm','Candlelit','Earthy','Romantic'],
          journey:[
            {id:'j1',moment:'Ceremony',colors:['#F1EBDD','#8A9A80','#FBF7EF','#E7D2C8','#3A3631']},
            {id:'j2',moment:'Cocktail hour',colors:['#8A9A80','#B8924A','#BC7459','#F1EBDD','#3A3631']},
            {id:'j3',moment:'Reception',colors:['#3A3631','#8A4A33','#B8924A','#E7D2C8','#F1EBDD']},
          ],
        },
        inspirations: [],
        attire: {
          dressCode:'Garden formal',
          rules:['No white or ivory for guests','Grass-friendly shoes for the lawn','Bring a wrap for after sunset','Earthy, candlelit tones encouraged'],
          looks:[
            { id:'l1', party:'Bride',       title:'Ivory silk slip',        color:'#EFE7D6', accent:'#E7D2C8', notes:'Low back, no train.',    details:{Silhouette:'Slip',Neckline:'Cowl',Length:'Floor',Fabric:'Silk charmeuse'}, approvals:{Maya:true,Julian:false,Aria:true} },
            { id:'l2', party:'Groom',       title:'Olive three-piece',      color:'#6E7257', accent:'#B8924A', notes:'No tux. Brown shoes.',   details:{Lapel:'Notch',Fit:'Tailored',Pieces:'Three-piece',Shoes:'Brown suede'}, approvals:{Maya:false,Julian:true,Aria:false} },
            { id:'l3', party:'Bridesmaids', title:'Dusty rose, mismatched', color:'#D9B3B0', accent:'#C98BA0', notes:'Same tone, own styles.', details:{Silhouette:'Mixed',Neckline:'Varied',Length:'Midi–floor',Fabric:'Chiffon'}, approvals:{Maya:true,Julian:true,Aria:true} },
          ],
        },
      },

      decisions: [
        { id:'dinner',  title:'Family-style dinner, or plated?',        area:'Menu',   status:'open',    finalId:null },
        { id:'music',   title:'Live band or a DJ?',                      area:'Vendor', status:'open',    finalId:null },
        { id:'welcome', title:'Host a welcome dinner the night before?', area:'Guests', status:'open',    finalId:null },
        { id:'exit',    title:'How do we end the night?',                area:'Design', status:'settled', finalId:'lastdance' },
      ],

      vendors: [
        { id:'v1', name:'Willowbrook Estate',      category:'venue',        categoryId:'venue',    status:'booked',         cost:13500, paid:4500, src:'vendors' },
        { id:'v2', name:'Saffron & Sage Catering',  category:'caterer',      categoryId:'catering', status:'booked',         cost:11800, paid:0,    src:'vendors' },
        { id:'v3', name:'Priya Anand Photography',   category:'photographer', categoryId:'photo',    status:'quote_received', cost:5000,  paid:0,    src:'vendors' },
        { id:'v4', name:'Rev. Thomas Ellery',        category:'officiant',    categoryId:'ceremony', status:'inquired',       cost:0,     paid:0,    src:'vendors' },
        { id:'v5', name:'Fern & Flora',              category:'florist',      categoryId:'florals',  status:'shortlisted',    cost:3800,  paid:0,    src:'vendors' },
        { id:'v6', name:'The Night Owls (band)',     category:'band',         categoryId:'music',    status:'idea',           cost:3000,  paid:0,    src:'vendors' },
      ],

      budget: {
        contributors: [
          { id:'c1', name:"Maya's parents",   pledged:15000 },
          { id:'c2', name:"Julian's parents", pledged:10000 },
          { id:'c3', name:'Maya & Julian',    pledged:17000 },
        ],
        categories: [
          { id:'venue',      name:'Venue & rentals',        planned:13500, protected:false },
          { id:'catering',   name:'Catering & bar',         planned:11800, protected:true  },
          { id:'photo',      name:'Photo & video',          planned:5000,  protected:true  },
          { id:'music',      name:'Music & entertainment',  planned:3000,  protected:true  },
          { id:'florals',    name:'Florals & decor',        planned:3800,  protected:false },
          { id:'attire',     name:'Attire & beauty',        planned:2600,  protected:false },
          { id:'stationery', name:'Stationery',             planned:1200,  protected:false },
          { id:'other',      name:'Cake, favors & extras',  planned:2100,  protected:false },
        ],
        payments: [
          { id:'p1', label:'Venue deposit',        categoryId:'venue',    vendorId:'v1', amount:4500, dueISO:'2026-02-01', paid:true  },
          { id:'p2', label:'Venue balance',         categoryId:'venue',    vendorId:'v1', amount:9000, dueISO:'2026-09-01', paid:false },
          { id:'p3', label:'Catering 50% deposit',  categoryId:'catering', vendorId:'v2', amount:5900, dueISO:'2026-06-01', paid:false },
          { id:'p4', label:'Photographer retainer', categoryId:'photo',    vendorId:'v3', amount:1500, dueISO:'2026-05-15', paid:false },
        ],
      },

      documents: [
        { id:'doc1', title:'Venue contract — Willowbrook Estate',   type:'Contract', party:'Willowbrook Estate', status:'signed', signers:[{name:'Maya',signed:true},{name:'Julian',signed:true},{name:'Willowbrook',signed:true}], dueISO:'2026-01-20', updatedTs:now-1000*60*60*24*40 },
        { id:'doc2', title:'Catering agreement — Saffron & Sage',    type:'Contract', party:'Saffron & Sage',    status:'sent',   signers:[{name:'Maya',signed:false},{name:'Julian',signed:false},{name:'Saffron & Sage',signed:true}], dueISO:'2026-06-01', updatedTs:now-1000*60*60*24*3 },
        { id:'doc3', title:'Photography contract — Priya Anand',      type:'Contract', party:'Priya Anand',      status:'draft',  signers:[{name:'Maya',signed:false},{name:'Julian',signed:false}], dueISO:'2026-05-15', updatedTs:now-1000*60*60*24*1 },
        { id:'doc4', title:'Officiant agreement — Uncle Ray',         type:'Contract', party:'Uncle Ray',         status:'signed', signers:[{name:'Maya',signed:true},{name:'Julian',signed:true},{name:'Uncle Ray',signed:true}], dueISO:'2026-03-10', updatedTs:now-1000*60*60*24*30 },
        { id:'doc5', title:'Day-of timeline (for vendors)',            type:'Share',    party:'',                 status:'shared', signers:[], sharedWith:['Saffron & Sage','Priya Anand','Willowbrook'], dueISO:null, updatedTs:now-1000*60*60*24*2 },
      ],

      notes: [
        { id:'n1', kind:'Vow',       title:'My vows to Julian',        body:'You are the calm in every room I walk into. I promise to keep choosing you — on the loud days and the quiet ones.', sealed:true,  sealUntil:'our wedding day' },
        { id:'n2', kind:'Letter',    title:'To Mom, the morning of',   body:'Everything I know about loving someone gently, I learned watching you. Thank you for the hands that raised me.', sealed:false, sealUntil:'' },
        { id:'n3', kind:'Memory',    title:'The night we met',         body:'You spilled your drink reaching for mine. I have been reaching back ever since.', sealed:false, sealUntil:'' },
        { id:'n4', kind:'Gratitude', title:'For the people carrying us',body:'To the friends folding programs at midnight — this day is yours too.', sealed:false, sealUntil:'' },
        { id:'n5', kind:'Poem',      title:'Golden hour',              body:'We married in the light that forgives everything, / and the field held its breath, and so did I.', sealed:true, sealUntil:'our first anniversary' },
      ],

      notifications: [
        { id:'nt1', text:'Catering agreement is awaiting your signature', kind:'sign',     ts:now-1000*60*60*24*3, read:false },
        { id:'nt2', text:'Photography contract added as a draft',          kind:'new',      ts:now-1000*60*60*24*1, read:false },
      ],
    };
  }

  // ---- persistence ---------------------------------------------------------
  var listeners = [];
  var cache = null;

  function migrateLegacy(base) {
    try {
      var raw = localStorage.getItem(LEGACY);
      if (!raw) return base;
      var d = JSON.parse(raw);
      if (d && d.clouds && d.clouds.length) {
        var SLOTS = [[0,-104],[156,-52],[-156,-52],[224,40],[-224,40],[104,120],[-104,120],[0,146]];
        base.dreams = d.clouds.slice(0,8).map(function (c, i) {
          return { id:c.id||('d'+i), label:c.label, type:c.type||'A wish', grad:c.grad||'gp',
            reflection:c.reflection||'', phrase:(c.phrase||c.label||'').toLowerCase(),
            x:SLOTS[i][0], y:SLOTS[i][1], status:'dream' };
        });
        if (d.compass) base.compass.sentence = d.compass;
        if (d.compassShort) base.compass.short = d.compassShort;
        if (d.season) base.wedding.season = d.season;
        if (d.light)  base.wedding.light  = d.light;
        if (d.intimacy) base.wedding.intimacy = d.intimacy;
      }
    } catch (e) {}
    return base;
  }

  function read() {
    if (cache) return cache;
    var s = null;
    try { var raw = localStorage.getItem(KEY); if (raw) s = JSON.parse(raw); } catch (e) {}
    var base = seed();
    if (!s || !s.v) s = migrateLegacy(base);
    else if (s.v < base.v) { ['decisions','vendors','budget','documents','notes','notifications','website','menu','board'].forEach(function (k) { s[k] = base[k]; }); s.v = base.v; }
    // heal missing branches (older stored states gain new collections)
    for (var k in base) if (!(k in s)) s[k] = base[k];
    if (s.budget) { for (var bk in base.budget) if (!(bk in s.budget)) s.budget[bk] = base.budget[bk]; }
    if (s.board && !s.board.inspirations) s.board.inspirations = [];
    if (s.board) {
      if (!s.board.food || !s.board.food.identity) s.board.food = base.board.food;
      var sp = s.board.palette || (s.board.palette = {}), bp = base.board.palette;
      if (!sp.colors) sp.colors = bp.colors; if (!sp.name) sp.name = bp.name;
      if (!sp.roles) sp.roles = bp.roles; if (!sp.atmosphere) sp.atmosphere = bp.atmosphere; if (!sp.journey) sp.journey = bp.journey;
      var sa = s.board.attire || (s.board.attire = {}), ba = base.board.attire;
      if (!sa.looks) sa.looks = ba.looks; if (!sa.dressCode) sa.dressCode = ba.dressCode; if (!sa.rules) sa.rules = ba.rules;
    }
    cache = s;
    return s;
  }

  function write(s) {
    cache = s;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    for (var i = 0; i < listeners.length; i++) { try { listeners[i](s); } catch (e) {} }
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sum(arr, f) { return (arr || []).reduce(function (a, x) { return a + (f(x) || 0); }, 0); }

  var WeddingState = {
    get: function () { return clone(read()); },
    update: function (mutator) { var s = clone(read()); mutator(s); write(s); return s; },
    set: function (patch) { var s = clone(read()); for (var k in patch) s[k] = patch[k]; write(s); return s; },
    subscribe: function (cb) { listeners.push(cb); return function () { listeners = listeners.filter(function (f) { return f !== cb; }); }; },
    reset: function () { try { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY); } catch (e) {} cache = null; write(seed()); },

    // ---- derived: budget ---------------------------------------------------
    budget: function () {
      var s = read(); var b = s.budget || {};
      var funds = sum(b.contributors, function (c) { return c.pledged; });
      var planned = sum(b.categories, function (c) { return c.planned; });
      var paid = sum(b.payments, function (p) { return p.paid ? p.amount : 0; });
      var scheduled = sum(b.payments, function (p) { return p.amount; });
      return { funds: funds, planned: planned, paid: paid, scheduled: scheduled,
               remaining: funds - planned, over: planned > funds, leftToPay: scheduled - paid };
    },

    // ---- derived: Peace Score ---------------------------------------------
    peaceScore: function () {
      var s = read();
      var dec = s.decisions || [], ven = s.vendors || [], doc = s.documents || [];
      var contracts = doc.filter(function (d) { return d.type === 'Contract'; });
      var bud = this.budget();
      var frac = function (a, b) { return b > 0 ? Math.max(0, Math.min(1, a / b)) : 0; };

      var f = [];
      f.push({ key:'compass',   label:'Compass approved',  weight:15, val: s.compass.approved ? 1 : 0, detail: s.compass.approved ? 'Approved' : 'Not yet' });
      f.push({ key:'timeline',  label:'Timeline set',      weight:15, val: s.wedding.dateStatus === 'set' ? 1 : 0, detail: s.wedding.dateStatus === 'set' ? 'Date set' : 'Still a dream' });
      var settled = dec.filter(function (d) { return d.status === 'settled'; }).length;
      f.push({ key:'decisions', label:'Decisions settled', weight:25, val: frac(settled, dec.length), detail: settled + '/' + dec.length + ' settled' });
      f.push({ key:'budget',    label:'Budget on track',   weight:20, val: bud.over ? 0 : 1, detail: bud.over ? 'Over by $' + Math.round((bud.planned - bud.funds)/1000) + 'k' : 'Within funds' });
      var booked = ven.filter(function (v) { return v.status === 'booked'; }).length;
      f.push({ key:'vendors',   label:'Vendors booked',    weight:15, val: frac(booked, ven.length), detail: booked + '/' + ven.length + ' booked' });
      var signed = contracts.filter(function (d) { return d.status === 'signed'; }).length;
      f.push({ key:'documents', label:'Documents signed',  weight:10, val: frac(signed, contracts.length), detail: signed + '/' + contracts.length + ' signed' });

      var num = 0, den = 0;
      f.forEach(function (x) { x.pct = Math.round(x.val * 100); num += x.val * x.weight; den += x.weight; });
      var score = den > 0 ? Math.round(num / den * 100) : 0;
      var band = score >= 85 ? 'Peaceful' : score >= 60 ? 'Settling' : score >= 35 ? 'Stirring' : 'Unsettled';
      return { score: score, band: band, factors: f };
    },
  };

  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { cache = null; var s = read(); for (var i = 0; i < listeners.length; i++) { try { listeners[i](s); } catch (er) {} } }
  });

  window.WeddingState = WeddingState;

  // ---- live header pill: keep every screen's "Peace Score · …" badge honest ----
  function initHeaderPill(tries) {
    tries = tries || 0;
    var pills = [].slice.call(document.querySelectorAll('div')).filter(function (d) {
      return d.childNodes.length && /Peace Score\s*·/.test(d.textContent) && d.textContent.length < 42;
    });
    if (!pills.length) { if (tries < 40) setTimeout(function () { initHeaderPill(tries + 1); }, 80); return; }
    function paint() {
      var ps = WeddingState.peaceScore();
      var col = ps.score >= 85 ? '#8A9A80' : ps.score >= 60 ? '#B8924A' : ps.score >= 35 ? '#BC7459' : '#B0655A';
      var want = 'Peace Score · ' + ps.band;
      pills.forEach(function (pill) {
        for (var i = 0; i < pill.childNodes.length; i++) {
          var n = pill.childNodes[i];
          if (n.nodeType === 3 && /Peace Score/.test(n.textContent) && n.textContent !== want) n.textContent = want;
        }
        var dot = pill.querySelector('span'); if (dot) dot.style.background = col;
      });
    }
    paint();
    WeddingState.subscribe(paint);
    try { var obs = new MutationObserver(function () { paint(); }); pills.forEach(function (p) { obs.observe(p, { childList: true, characterData: true, subtree: true }); }); } catch (e) {}
  }
  if (document.readyState !== 'loading') setTimeout(function () { initHeaderPill(0); }, 0);
  else document.addEventListener('DOMContentLoaded', function () { initHeaderPill(0); });
})();
