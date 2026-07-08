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
      v: 6,
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
          style:'family', season:'Fall',
          courses:[
            { id:'c1', name:'To share',  dishes:[{id:'d1',name:'Harvest boards',tag:''},{id:'d2',name:'Warm olives & bread',tag:'v'}] },
            { id:'c2', name:'Mains',     dishes:[{id:'d3',name:'Herb-roasted chicken',tag:''},{id:'d4',name:'Braised short rib',tag:''},{id:'d5',name:'Wild mushroom orzo',tag:'v'}] },
            { id:'c3', name:'To finish', dishes:[{id:'d6',name:'Stone-fruit galettes',tag:''}] },
          ],
          bar:'Beer, wine & 2 signatures',
          moments:{ welcome:true, cocktail:true, latenight:true },
          cocktails:[ { id:'k1', name:'Fig & Rosemary Spritz', recipe:'Fig, rosemary, prosecco, soda' }, { id:'k2', name:'Smoked Old Fashioned', recipe:'Bourbon, maple, orange, smoke' } ],
          notes:'Local & seasonal. Nut-free kitchen.',
        },
        palette: { name:'Sage & Clay', colors:['#8A9A80','#BC7459','#E7D2C8','#F1EBDD','#3A3631'] },
        inspirations: [],
        attire: {
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
