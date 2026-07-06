// Smart tagging (Board Overhaul §smart tagging) — pure, deterministic inference so
// every new fragment arrives pre-labeled. Tags are stored in board_tags /
// board_item_tags (schema 0001) and remain fully editable in the card drawer.

export interface TagInput {
  title?: string | null;
  body?: string | null;
  url?: string | null;
  boardType?: string | null;
}

// Board type → its anchor tag.
const BOARD_TAG: Record<string, string> = {
  venue: 'venue', ceremony: 'ceremony', reception: 'reception', attire: 'attire',
  food_beverage: 'food & beverage', florals_decor: 'florals', photo_video: 'photography',
  guest_experience: 'guest experience', music_entertainment: 'music',
  stationery_signage: 'stationery', honeymoon: 'honeymoon', prewedding: 'pre-wedding',
};

// Keyword → tag. First match wins per tag; an item gets at most MAX_TAGS.
const KEYWORDS: [RegExp, string][] = [
  [/venue|ballroom|estate|manor|barn|winery|vineyard|rooftop|loft|hotel|hacienda/i, 'venue'],
  [/garden|botanic|greenhouse|outdoor|meadow/i, 'garden'],
  [/beach|coastal|seaside|ocean|tropical|destination/i, 'destination'],
  [/floral|flower|bouquet|centerpiece|peon|rose|dahlia|orchid|eucalyptus|greenery/i, 'florals'],
  [/cater|menu|food|dinner|feast|grazing|charcuterie|appetizer|entree|family.style|buffet/i, 'food & beverage'],
  [/cake|dessert|pastry|donut|macaron|sweet/i, 'dessert'],
  [/cocktail|bar |signature drink|mocktail|champagne|toast/i, 'drinks'],
  [/dress|gown|suit|tux|attire|veil|bridal|bridesmaid|groomsmen/i, 'attire'],
  [/ring|jewel|earring|necklace/i, 'jewelry'],
  [/photo|photograph|portrait|film camera/i, 'photography'],
  [/video|videograph|film|cinemat/i, 'videography'],
  [/song|music|band|dj |playlist|first dance|spotify|soundtrack/i, 'music'],
  [/invit|stationery|save.the.date|calligraph|signage|menu card|place card/i, 'stationery'],
  [/honeymoon|resort|travel|itinerary|getaway/i, 'honeymoon'],
  [/candle|lighting|string light|fairy light|lantern|softly lit/i, 'lighting'],
  [/rustic|farmhouse/i, 'rustic'],
  [/boho|bohemian|macrame|pampas/i, 'boho'],
  [/modern|minimal|contemporary/i, 'modern'],
  [/elegant|classic|timeless|luxur/i, 'elegant'],
  [/romantic|whimsical|fairy.?tale/i, 'romantic'],
  [/vintage|retro|antique|heirloom/i, 'vintage'],
  [/blush|pink|rose gold/i, 'blush'],
  [/sage|olive|emerald|green/i, 'green'],
  [/burgundy|wine|maroon/i, 'burgundy'],
  [/gold|amber|brass/i, 'gold'],
  [/ivory|white|cream|neutral/i, 'neutral'],
  [/table|tablescape|linen|place setting|runner/i, 'tablescape'],
  [/arch|arbor|backdrop|altar|chuppah|mandap/i, 'ceremony backdrop'],
  [/welcome bag|favor|guest book|seating chart|escort/i, 'guest experience'],
];

// Source domain → tag.
const DOMAIN_TAGS: [RegExp, string][] = [
  [/pinterest\./i, 'pinterest'],
  [/instagram\./i, 'instagram'],
  [/tiktok\./i, 'tiktok'],
  [/youtube\.|youtu\.be/i, 'video'],
  [/spotify\.|music\.apple\./i, 'music'],
  [/etsy\./i, 'handmade'],
  [/zola\.|theknot\.|weddingwire\./i, 'wedding planning'],
  [/maps\.google\.|goo\.gl\/maps/i, 'location'],
];

const MAX_TAGS = 6;

/** Infer editable starter tags for a new board item. Pure and deterministic. */
export function inferTags(input: TagInput): string[] {
  const tags: string[] = [];
  const push = (t: string) => { if (!tags.includes(t) && tags.length < MAX_TAGS) tags.push(t); };

  if (input.boardType && BOARD_TAG[input.boardType]) push(BOARD_TAG[input.boardType]);

  const hay = [input.title ?? '', input.body ?? ''].join(' ');
  for (const [re, tag] of KEYWORDS) {
    if (tags.length >= MAX_TAGS) break;
    if (re.test(hay)) push(tag);
  }

  if (input.url) {
    for (const [re, tag] of DOMAIN_TAGS) {
      if (tags.length >= MAX_TAGS) break;
      if (re.test(input.url)) push(tag);
    }
  }
  return tags;
}
