// Mood extraction (Board Overhaul §mood extraction) — reads the couple's APPROVED
// fragments and names the direction they're leaning. Deterministic core (tag/word
// frequencies → descriptor vocabulary) so it works without a network; when an
// ANTHROPIC_API_KEY is present and there's enough signal, Claude polishes the line.
// The deterministic sentence is always the fallback — never an empty result.

export interface MoodInput {
  title?: string | null;
  tags?: string[];
  boardTitle?: string;
}

// Descriptor vocabulary: keyword (matched in titles/tags) → how we name the leaning.
const DESCRIPTORS: [RegExp, string][] = [
  [/garden|botanic|greenhouse|outdoor|meadow|vineyard/i, 'garden-inspired'],
  [/beach|coast|seaside|ocean|tropical/i, 'coastal'],
  [/barn|rustic|farm|country/i, 'rustic'],
  [/ballroom|estate|manor|chateau|grand|luxur/i, 'grand'],
  [/candle|soft light|softly lit|dim|glow|twinkl|fairy light|string light/i, 'softly lit'],
  [/romantic|romance|love letter/i, 'romantic'],
  [/modern|minimal|clean|contemporary/i, 'modern'],
  [/boho|bohemian|macrame|pampas/i, 'bohemian'],
  [/elegant|classic|timeless|refined/i, 'elegant'],
  [/intimate|small|micro|cozy|close/i, 'intimate'],
  [/warm|amber|terracotta|rust|gold/i, 'warm-toned'],
  [/blush|pink|rose|peach/i, 'blush-leaning'],
  [/sage|green|eucalyptus|olive/i, 'green-and-botanical'],
  [/white|ivory|cream|neutral/i, 'airy and neutral'],
  [/burgundy|wine|deep red|moody|dark/i, 'rich and moody'],
  [/family|parents|grandma|grandpa|heritage|tradition/i, 'family-centered'],
  [/vintage|retro|antique|heirloom/i, 'vintage-touched'],
  [/whimsical|playful|fun|disco|neon/i, 'playful'],
];

/** Deterministic mood: count descriptor hits across approved items; name the top leanings. */
export function deterministicMood(items: MoodInput[]): { summary: string; leanings: string[] } {
  const counts = new Map<string, number>();
  for (const it of items) {
    const hay = [it.title ?? '', ...(it.tags ?? []), it.boardTitle ?? ''].join(' ');
    for (const [re, name] of DESCRIPTORS) {
      if (re.test(hay)) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  const leanings = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n]) => n);
  if (leanings.length === 0) {
    return {
      summary: items.length > 0
        ? 'Your approved pieces are still finding their voice — add a few more and the direction will emerge.'
        : 'Approve a few pieces and the mood will reveal itself.',
      leanings: [],
    };
  }
  const list = leanings.length === 1
    ? leanings[0]
    : leanings.slice(0, -1).join(', ') + ' and ' + leanings[leanings.length - 1];
  return { summary: `Your approved pieces are leaning ${list}.`, leanings };
}

/** Full extraction: deterministic core, optionally polished by Claude when configured. */
export async function extractMood(items: MoodInput[]): Promise<{ summary: string; leanings: string[] }> {
  const base = deterministicMood(items);
  if (!process.env.ANTHROPIC_API_KEY || items.length < 4) return base;
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      system: 'You summarize a wedding couple\'s approved inspiration in ONE warm, specific sentence (max 28 words). Calm, editorial, no exclamation marks, no advice. Return ONLY the sentence.',
      messages: [{
        role: 'user',
        content: 'Approved pieces (title · tags · section):\n' + items.map((i) => `${i.title ?? 'untitled'} · ${(i.tags ?? []).join(', ')} · ${i.boardTitle ?? ''}`).join('\n') + `\n\nDeterministic reading: ${base.summary}`,
      }],
    });
    const text = msg.content.filter((b): b is { type: 'text'; text: string } & typeof b => b.type === 'text').map((b) => b.text).join(' ').trim();
    if (text && text.length > 10 && text.length < 300) return { summary: text.replace(/^["“]|["”]$/g, ''), leanings: base.leanings };
  } catch { /* fall back below */ }
  return base;
}
